import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "./projects.service";

describe("ProjectsService", () => {
  const prisma = {
    project: { findFirst: jest.fn() },
  };
  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(prisma as unknown as PrismaService);
  });

  it("retrieves only relevant, bounded knowledge from the requested owned project", async () => {
    prisma.project.findFirst.mockResolvedValue({
      name: "QAgent",
      description: "Assistente de QA",
      category: "produto",
      knowledge: [
        {
          kind: "DECISION",
          title: "Login",
          content: "O acesso deve manter o usuário no ambiente escolhido.",
          updatedAt: new Date("2026-11-15T12:00:00Z"),
        },
        {
          kind: "DOCUMENT",
          title: "Pagamentos",
          content: "Fluxo financeiro independente.",
          updatedAt: new Date("2026-11-15T12:00:00Z"),
        },
      ],
      tasks: [
        {
          title: "Revisar login",
          status: "IN_PROGRESS",
          description: "Validar a sessão.",
          updatedAt: new Date("2026-11-15T12:00:00Z"),
        },
      ],
    });

    const context = await service.contextForChat(
      "user-1",
      "project-1",
      "Como testar o login?",
    );

    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "project-1", userId: "user-1" },
      }),
    );
    expect(context.notes).toEqual([
      expect.objectContaining({ title: "Login" }),
    ]);
    expect(context.notes.some((note) => note.title === "Pagamentos")).toBe(false);
    expect(context.tasks).toEqual([
      expect.objectContaining({ title: "Revisar login" }),
    ]);
  });

  it("does not return context when the requested project is not owned", async () => {
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(
      service.contextForChat("user-1", "other-users-project", "contexto"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
