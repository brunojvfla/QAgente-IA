import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProjectStatus } from "@prisma/client";
import { ProjectAiContext } from "@qagent/shared";
import { PrismaService } from "../prisma/prisma.service";

export interface ProjectListFilters {
  search?: string;
  status?: "ACTIVE" | "ARCHIVED" | "ALL";
  category?: string;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, filters: ProjectListFilters = {}) {
    const where: Prisma.ProjectWhereInput = {
      userId,
      ...(filters.status !== "ALL" && {
        status: (filters.status || "ACTIVE") as ProjectStatus,
      }),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
      ...(filters.category && {
        category: { contains: filters.category, mode: "insensitive" },
      }),
    };
    return this.prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { conversations: true, knowledge: true, tasks: true, diagrams: true } } },
    });
  }

  async findOwned(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new NotFoundException("Projeto não encontrado.");
    return project;
  }

  async create(
    userId: string,
    name: string,
    description?: string,
    category?: string,
  ) {
    try {
      return await this.prisma.project.create({
        data: {
          userId,
          name: name.trim(),
          description: description?.trim() || null,
          category: category?.trim() || null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Já existe um projeto com este nome.");
      }
      throw error;
    }
  }

  async update(
    userId: string,
    projectId: string,
    input: { name?: string; description?: string | null; category?: string | null },
  ) {
    await this.findOwned(userId, projectId);
    try {
      return await this.prisma.project.update({
        where: { id: projectId },
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.description !== undefined && {
            description: input.description?.trim() || null,
          }),
          ...(input.category !== undefined && {
            category: input.category?.trim() || null,
          }),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("Já existe um projeto com este nome.");
      }
      throw error;
    }
  }

  async setArchived(userId: string, projectId: string, archived: boolean) {
    await this.findOwned(userId, projectId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: archived ? "ARCHIVED" : "ACTIVE" },
    });
  }

  async contextForChat(
    userId: string,
    projectId: string,
    message: string,
  ): Promise<ProjectAiContext> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: {
        name: true,
        description: true,
        category: true,
        knowledge: {
          select: { kind: true, title: true, content: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 30,
        },
        tasks: {
          where: { status: { not: "DONE" } },
          select: { title: true, status: true, description: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 10,
        },
      },
    });
    if (!project) throw new NotFoundException("Projeto não encontrado.");

    const terms = new Set(
      message
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .match(/[\p{L}\p{N}]{4,}/gu) || [],
    );
    const rankedNotes = project.knowledge
      .map((note) => {
        const searchable = `${note.title} ${note.content}`
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase();
        const score = [...terms].reduce(
          (total, term) => total + (searchable.includes(term) ? 1 : 0),
          0,
        );
        return { ...note, score };
      })
      .sort((left, right) => right.score - left.score)
      .filter((note) => note.score > 0)
      .slice(0, 5);

    let remainingChars = Math.max(
      0,
      6000 -
        project.name.length -
        (project.description?.length || 0) -
        (project.category?.length || 0),
    );
    const notes = rankedNotes.flatMap((note) => {
      if (remainingChars <= note.title.length + note.kind.length) return [];
      const available = remainingChars - note.title.length - note.kind.length;
      const content = note.content.slice(0, available);
      remainingChars -= note.title.length + note.kind.length + content.length;
      return [{ kind: note.kind, title: note.title, content }];
    });
    const rankedTasks = project.tasks
      .map((task) => {
        const searchable = `${task.title} ${task.description || ""}`
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLowerCase();
        const score = [...terms].reduce(
          (total, term) => total + (searchable.includes(term) ? 1 : 0),
          0,
        );
        return { ...task, score };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
    const tasks = rankedTasks.flatMap(({ title, status, description }) => {
      if (remainingChars <= title.length) return [];
      const taskDescription = description?.slice(0, Math.max(0, remainingChars - title.length));
      remainingChars -= title.length + (taskDescription?.length || 0);
      return [{ title, status, description: taskDescription || null }];
    });

    return {
      name: project.name,
      description: project.description,
      category: project.category,
      notes,
      tasks,
    };
  }
}
