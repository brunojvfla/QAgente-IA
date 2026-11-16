import { Injectable } from "@nestjs/common";
import { Environment } from "@qagent/shared";
import { AiService } from "../ai/ai.service";
import { ConversationsService } from "../conversations/conversations.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { ProjectsService } from "../projects/projects.service";

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly ai: AiService,
    private readonly users: UsersService,
    private readonly projects: ProjectsService,
  ) {}

  async list(userId: string, environment: Environment, conversationId: string) {
    const conversation = await this.conversations.findOwned(userId, environment, conversationId);
    return this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });
  }

  async send(
    userId: string,
    environment: Environment,
    conversationId: string,
    content: string,
  ) {
    const conversation = await this.conversations.findOwned(userId, environment, conversationId);
    const cleanContent = content.trim();
    const previousMessages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });
    const preferences = await this.users.getPreferences(userId);
    const projectContext =
      environment === "WORK" && conversation.projectId
        ? await this.projects.contextForChat(userId, conversation.projectId, cleanContent)
        : null;
    const generated = await this.ai.generateReply(
      [
        ...previousMessages.reverse(),
        { role: "USER", content: cleanContent },
      ],
      conversation.environment,
      preferences,
      projectContext,
    );

    const [userMessage, assistantMessage] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId: conversation.id, role: "USER", content: cleanContent },
        select: { id: true, role: true, content: true, createdAt: true },
      }),
      this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: generated.text,
        },
        select: { id: true, role: true, content: true, createdAt: true },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);
    return { userMessage, assistantMessage };
  }
}
