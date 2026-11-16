import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Environment } from "@qagent/shared";
import { ProjectStatus } from "@prisma/client";
import { ListConversationsDto } from "./dto/list-conversations.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";
import { ProjectsService } from "../projects/projects.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async list(userId: string, query: ListConversationsDto) {
    if (query.projectId && query.unassigned === "true") {
      throw new BadRequestException("Escolha um projeto ou conversas sem projeto.");
    }
    if (query.projectId) {
      if (query.environment !== "WORK") {
        throw new BadRequestException("Projetos estão disponíveis somente no ambiente Work.");
      }
      await this.projects.findOwned(userId, query.projectId);
    }
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
      throw new BadRequestException("A data inicial deve ser anterior à data final.");
    }

    const archivedAt =
      query.status === "ALL"
        ? undefined
        : query.status === "ARCHIVED"
          ? { not: null }
          : null;
    const conversations = await this.prisma.conversation.findMany({
      where: {
        userId,
        environment: query.environment,
        ...(query.projectId !== undefined && { projectId: query.projectId }),
        ...(query.unassigned === "true" && { projectId: null }),
        ...(archivedAt !== undefined && { archivedAt }),
        ...(query.search && {
          title: { contains: query.search.trim(), mode: "insensitive" },
        }),
        ...((query.from || query.to) && {
          createdAt: {
            ...(query.from && { gte: new Date(query.from) }),
            ...(query.to && { lte: new Date(query.to) }),
          },
        }),
      },
      select: {
        id: true,
        title: true,
        environment: true,
        projectId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { name: true } },
      },
      orderBy: { [query.sort || "updatedAt"]: "desc" },
    });
    return conversations.map((conversation) => this.withProjectName(conversation));
  }

  async create(
    userId: string,
    environment: Environment,
    title?: string,
    projectId?: string,
  ) {
    if (projectId) {
      if (environment !== "WORK") {
        throw new BadRequestException("Projetos estão disponíveis somente no ambiente Work.");
      }
      const project = await this.projects.findOwned(userId, projectId);
      if (project.status === ProjectStatus.ARCHIVED) {
        throw new ForbiddenException("Não é possível criar conversas em um projeto arquivado.");
      }
    }
    const conversation = await this.prisma.conversation.create({
      data: {
        userId,
        environment,
        title: title?.trim() || "Nova conversa",
        ...(projectId && { projectId }),
      },
      select: {
        id: true,
        title: true,
        environment: true,
        projectId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { name: true } },
      },
    });
    return this.withProjectName(conversation);
  }

  async findOwned(userId: string, environment: Environment, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, userId, environment },
    });
    if (!conversation) throw new NotFoundException("Conversa não encontrada.");
    return conversation;
  }

  async remove(userId: string, environment: Environment, id: string): Promise<void> {
    const conversation = await this.findOwned(userId, environment, id);
    await this.prisma.conversation.delete({ where: { id: conversation.id } });
  }

  async update(
    userId: string,
    environment: Environment,
    id: string,
    input: UpdateConversationDto,
  ) {
    const conversation = await this.findOwned(userId, environment, id);
    const data: {
      title?: string;
      projectId?: string | null;
      archivedAt?: Date | null;
    } = {};
    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) throw new BadRequestException("O nome da conversa não pode ficar vazio.");
      data.title = title;
    }
    if (input.projectId !== undefined) {
      if (input.projectId === null) {
        data.projectId = null;
      } else {
        if (environment !== "WORK") {
          throw new BadRequestException("Projetos estão disponíveis somente no ambiente Work.");
        }
        const project = await this.projects.findOwned(userId, input.projectId);
        if (project.status === ProjectStatus.ARCHIVED) {
          throw new ForbiddenException("Não é possível vincular a conversa a um projeto arquivado.");
        }
        data.projectId = project.id;
      }
    }
    if (input.archived !== undefined) {
      data.archivedAt = input.archived ? new Date() : null;
    }
    const updated = await this.prisma.conversation.update({
      where: { id: conversation.id },
      data,
      select: {
        id: true,
        title: true,
        environment: true,
        projectId: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { name: true } },
      },
    });
    return this.withProjectName(updated);
  }

  private withProjectName<T extends { project?: { name: string } | null }>(conversation: T) {
    const { project, ...data } = conversation;
    return { ...data, projectName: project?.name ?? null };
  }
}
