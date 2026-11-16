import type { AiService } from "../ai/ai.service";
import { ConversationsService } from "../conversations/conversations.service";
import { ProjectsService } from "../projects/projects.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { MessagesService } from "./messages.service";

jest.mock("../ai/ai.service", () => ({ AiService: jest.fn() }));

describe("MessagesService", () => {
  const prisma = {
    message: { findMany: jest.fn(), create: jest.fn() },
    conversation: { update: jest.fn() },
    $transaction: jest.fn(),
  };
  const conversations = { findOwned: jest.fn() };
  const ai = { generateReply: jest.fn() };
  const users = { getPreferences: jest.fn() };
  const projects = { contextForChat: jest.fn() };
  let service: MessagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagesService(
      prisma as unknown as PrismaService,
      conversations as unknown as ConversationsService,
      ai as unknown as AiService,
      users as unknown as UsersService,
      projects as unknown as ProjectsService,
    );
    conversations.findOwned.mockResolvedValue({
      id: "conversation-1",
      environment: "WORK",
      projectId: null,
    });
    prisma.message.findMany.mockResolvedValue([
      { role: "USER", content: "Pergunta mais recente" },
      { role: "ASSISTANT", content: "Primeira resposta" },
    ]);
    prisma.message.create
      .mockResolvedValueOnce({
        id: "user-message",
        role: "USER",
        content: "Nova pergunta",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        id: "assistant-message",
        role: "ASSISTANT",
        content: "Resposta",
        createdAt: new Date("2026-01-01T00:00:01.000Z"),
      });
    ai.generateReply.mockResolvedValue({ text: "Resposta" });
    users.getPreferences.mockResolvedValue({
      writingStyle: "BALANCED",
      responseDetail: "MEDIUM",
      aiModel: null,
    });
    prisma.$transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it("sends the latest persisted conversation context to the AI", async () => {
    await service.send("user-1", "WORK", "conversation-1", "  Nova pergunta  ");

    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: "conversation-1" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });
    expect(ai.generateReply).toHaveBeenCalledWith(
      [
        { role: "ASSISTANT", content: "Primeira resposta" },
        { role: "USER", content: "Pergunta mais recente" },
        { role: "USER", content: "Nova pergunta" },
      ],
      "WORK",
      { writingStyle: "BALANCED", responseDetail: "MEDIUM", aiModel: null },
      null,
    );
    expect(prisma.message.create).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("adds registered context only from the conversation's project", async () => {
    conversations.findOwned.mockResolvedValue({
      id: "conversation-1",
      environment: "WORK",
      projectId: "project-1",
    });
    const projectContext = {
      name: "Projeto isolado",
      description: null,
      category: null,
      notes: [{ kind: "DECISION", title: "Decisão", content: "Contexto do projeto." }],
      tasks: [],
    };
    projects.contextForChat.mockResolvedValue(projectContext);

    await service.send("user-1", "WORK", "conversation-1", "Nova pergunta");

    expect(projects.contextForChat).toHaveBeenCalledWith(
      "user-1",
      "project-1",
      "Nova pergunta",
    );
    expect(ai.generateReply).toHaveBeenCalledWith(
      expect.any(Array),
      "WORK",
      expect.any(Object),
      projectContext,
    );
  });

  it("does not persist a user message if the AI request fails", async () => {
    ai.generateReply.mockRejectedValue(new Error("provider unavailable"));

    await expect(
      service.send("user-1", "WORK", "conversation-1", "Nova pergunta"),
    ).rejects.toThrow("provider unavailable");

    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
