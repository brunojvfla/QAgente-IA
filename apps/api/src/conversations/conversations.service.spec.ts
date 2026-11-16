import { NotFoundException } from "@nestjs/common";
import { ProjectsService } from "../projects/projects.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConversationsService } from "./conversations.service";

describe("ConversationsService", () => {
  const prisma = {
    conversation: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const projects = { findOwned: jest.fn() };
  let service: ConversationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConversationsService(
      prisma as unknown as PrismaService,
      projects as unknown as ProjectsService,
    );
  });

  it("lists only the authenticated user's selected environment", async () => {
    prisma.conversation.findMany.mockResolvedValue([]);

    await service.list("user-1", { environment: "LEARN" });

    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", environment: "LEARN" }),
      }),
    );
  });

  it("filters conversations by project and verifies project ownership", async () => {
    projects.findOwned.mockResolvedValue({ id: "project-1" });
    prisma.conversation.findMany.mockResolvedValue([]);

    await service.list("user-1", {
      environment: "WORK",
      projectId: "project-1",
      search: "arquitetura",
    });

    expect(projects.findOwned).toHaveBeenCalledWith("user-1", "project-1");
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          environment: "WORK",
          projectId: "project-1",
          title: { contains: "arquitetura", mode: "insensitive" },
        }),
      }),
    );
  });

  it("filters independent conversations without treating them as project conversations", async () => {
    prisma.conversation.findMany.mockResolvedValue([]);

    await service.list("user-1", { environment: "WORK", unassigned: "true" });

    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: null }),
      }),
    );
    expect(projects.findOwned).not.toHaveBeenCalled();
  });

  it("creates a conversation in the selected environment", async () => {
    prisma.conversation.create.mockResolvedValue({ id: "conversation-1" });

    await service.create("user-1", "WORK");

    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: { userId: "user-1", environment: "WORK", title: "Nova conversa" },
      select: expect.objectContaining({
        id: true,
        title: true,
        environment: true,
        project: { select: { name: true } },
      }),
    });
  });

  it("deletes only an owned conversation in the selected environment", async () => {
    prisma.conversation.findFirst.mockResolvedValue({ id: "conversation-1" });
    prisma.conversation.delete.mockResolvedValue({ id: "conversation-1" });

    await service.remove("user-1", "WORK", "conversation-1");

    expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
      where: { id: "conversation-1", userId: "user-1", environment: "WORK" },
    });
    expect(prisma.conversation.delete).toHaveBeenCalledWith({
      where: { id: "conversation-1" },
    });
  });

  it("does not delete a conversation that is not owned", async () => {
    prisma.conversation.findFirst.mockResolvedValue(null);

    await expect(
      service.remove("user-1", "WORK", "conversation-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.conversation.delete).not.toHaveBeenCalled();
  });
});
