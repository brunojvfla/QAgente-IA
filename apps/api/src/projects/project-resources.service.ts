import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma, ProjectKnowledgeKind, ProjectStatus } from "@prisma/client";
import {
  ProjectDiagramNodeType,
  PROJECT_DIAGRAM_NODE_TYPES,
} from "@qagent/shared";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { ProjectsService } from "./projects.service";
import {
  CreateProjectDiagramDto,
  ProjectDiagramDefinitionDto,
  UpdateProjectDiagramDto,
} from "./dto/project-diagram.dto";
import {
  CreateProjectKnowledgeDto,
  UpdateProjectKnowledgeDto,
} from "./dto/project-knowledge.dto";
import { CreateProjectTaskDto, UpdateProjectTaskDto } from "./dto/project-task.dto";

@Injectable()
export class ProjectResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly ai: AiService,
    private readonly users: UsersService,
  ) {}

  async listKnowledge(userId: string, projectId: string) {
    await this.projects.findOwned(userId, projectId);
    return this.prisma.projectKnowledge.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createKnowledge(
    userId: string,
    projectId: string,
    input: CreateProjectKnowledgeDto,
  ) {
    await this.assertWritableProject(userId, projectId);
    this.validateKnowledgeUrl(input.kind, input.externalUrl);
    return this.prisma.projectKnowledge.create({
      data: {
        projectId,
        kind: input.kind,
        title: input.title.trim(),
        content: input.content.trim(),
        externalUrl: input.externalUrl?.trim() || null,
      },
    });
  }

  async updateKnowledge(
    userId: string,
    projectId: string,
    itemId: string,
    input: UpdateProjectKnowledgeDto,
  ) {
    await this.assertWritableProject(userId, projectId);
    const current = await this.prisma.projectKnowledge.findFirst({
      where: { id: itemId, projectId },
    });
    if (!current) throw new NotFoundException("Informação do projeto não encontrada.");
    const kind = input.kind ?? current.kind;
    const externalUrl =
      input.externalUrl !== undefined ? input.externalUrl : current.externalUrl;
    this.validateKnowledgeUrl(kind, externalUrl);

    return this.prisma.projectKnowledge.update({
      where: { id: current.id },
      data: {
        ...(input.kind !== undefined && { kind: input.kind }),
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.content !== undefined && { content: input.content.trim() }),
        ...(input.externalUrl !== undefined && {
          externalUrl: input.externalUrl?.trim() || null,
        }),
      },
    });
  }

  async deleteKnowledge(userId: string, projectId: string, itemId: string) {
    await this.assertWritableProject(userId, projectId);
    const result = await this.prisma.projectKnowledge.deleteMany({
      where: { id: itemId, projectId },
    });
    if (!result.count) throw new NotFoundException("Informação do projeto não encontrada.");
  }

  async listTasks(userId: string, projectId: string) {
    await this.projects.findOwned(userId, projectId);
    return this.prisma.projectTask.findMany({
      where: { projectId },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
  }

  async createTask(userId: string, projectId: string, input: CreateProjectTaskDto) {
    await this.assertWritableProject(userId, projectId);
    return this.prisma.projectTask.create({
      data: {
        projectId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        status: input.status,
        priority: input.priority,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      },
    });
  }

  async updateTask(
    userId: string,
    projectId: string,
    taskId: string,
    input: UpdateProjectTaskDto,
  ) {
    await this.assertWritableProject(userId, projectId);
    const current = await this.prisma.projectTask.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });
    if (!current) throw new NotFoundException("Tarefa do projeto não encontrada.");
    return this.prisma.projectTask.update({
      where: { id: current.id },
      data: {
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.description !== undefined && {
          description: input.description?.trim() || null,
        }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.dueAt !== undefined && {
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
        }),
      },
    });
  }

  async deleteTask(userId: string, projectId: string, taskId: string) {
    await this.assertWritableProject(userId, projectId);
    const result = await this.prisma.projectTask.deleteMany({
      where: { id: taskId, projectId },
    });
    if (!result.count) throw new NotFoundException("Tarefa do projeto não encontrada.");
  }

  async listDiagrams(userId: string, projectId: string) {
    await this.projects.findOwned(userId, projectId);
    return this.prisma.projectDiagram.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createDiagram(
    userId: string,
    projectId: string,
    input: CreateProjectDiagramDto,
  ) {
    await this.assertWritableProject(userId, projectId);
    const definition = this.toDefinition(input.definition);
    this.validateDiagram(definition);
    return this.prisma.projectDiagram.create({
      data: {
        projectId,
        name: input.name.trim(),
        definition,
      },
    });
  }

  async updateDiagram(
    userId: string,
    projectId: string,
    diagramId: string,
    input: UpdateProjectDiagramDto,
  ) {
    await this.assertWritableProject(userId, projectId);
    const current = await this.prisma.projectDiagram.findFirst({
      where: { id: diagramId, projectId },
      select: { id: true },
    });
    if (!current) throw new NotFoundException("Diagrama do projeto não encontrado.");
    const definition = input.definition ? this.toDefinition(input.definition) : undefined;
    if (definition) this.validateDiagram(definition);
    return this.prisma.projectDiagram.update({
      where: { id: current.id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(definition && { definition }),
      },
    });
  }

  async deleteDiagram(userId: string, projectId: string, diagramId: string) {
    await this.assertWritableProject(userId, projectId);
    const result = await this.prisma.projectDiagram.deleteMany({
      where: { id: diagramId, projectId },
    });
    if (!result.count) throw new NotFoundException("Diagrama do projeto não encontrado.");
  }

  async generateDiagram(userId: string, projectId: string, prompt: string) {
    await this.assertWritableProject(userId, projectId);
    const [context, preferences] = await Promise.all([
      this.projects.contextForChat(userId, projectId, prompt),
      this.users.getPreferences(userId),
    ]);
    const generated = await this.ai.generateFlow(prompt, preferences, context);
    let payload: unknown;
    try {
      payload = JSON.parse(
        generated.text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim(),
      );
    } catch {
      throw new ServiceUnavailableException(
        "A IA não retornou um diagrama estruturado válido. Revise o pedido e tente novamente.",
      );
    }
    const definition = this.parseGeneratedDefinition(payload);
    this.validateDiagram(definition);
    return { definition, model: generated.model };
  }

  private async assertWritableProject(userId: string, projectId: string) {
    const project = await this.projects.findOwned(userId, projectId);
    if (project.status === ProjectStatus.ARCHIVED) {
      throw new ForbiddenException("O projeto está arquivado e não pode ser alterado.");
    }
    return project;
  }

  private validateKnowledgeUrl(kind: ProjectKnowledgeKind, url?: string | null) {
    if (kind === "FILE_LINK" && !url) {
      throw new BadRequestException("Informe um link HTTPS para o arquivo.");
    }
    if (kind !== "FILE_LINK" && url) {
      throw new BadRequestException("Links externos só podem ser salvos como arquivos.");
    }
  }

  private toDefinition(input: ProjectDiagramDefinitionDto): Prisma.InputJsonObject {
    return {
      nodes: input.nodes.map((node) => ({
        id: node.id,
        label: node.label.trim(),
        type: node.type,
        x: node.x,
        y: node.y,
      })),
      edges: input.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label?.trim() || "",
      })),
    };
  }

  private validateDiagram(definition: Prisma.InputJsonObject) {
    const nodes = definition.nodes;
    const edges = definition.edges;
    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      throw new BadRequestException("O diagrama precisa conter nós e conexões.");
    }
    if (nodes.length > 100 || edges.length > 200) {
      throw new BadRequestException("O diagrama excede o limite de blocos ou conexões.");
    }
    const ids = new Set<string>();
    for (const value of nodes) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new BadRequestException("O diagrama contém um nó inválido.");
      }
      const node = value as Record<string, Prisma.JsonValue>;
      if (
        typeof node.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(node.id) ||
        typeof node.label !== "string" ||
        !node.label.trim() ||
        node.label.length > 200 ||
        typeof node.type !== "string" ||
        !PROJECT_DIAGRAM_NODE_TYPES.includes(node.type as ProjectDiagramNodeType) ||
        typeof node.x !== "number" ||
        node.x < 0 ||
        node.x > 1000 ||
        typeof node.y !== "number" ||
        node.y < 0 ||
        node.y > 1000 ||
        ids.has(node.id)
      ) {
        throw new BadRequestException("O diagrama contém nós inválidos ou repetidos.");
      }
      ids.add(node.id);
    }
    const edgeIds = new Set<string>();
    for (const value of edges) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new BadRequestException("O diagrama contém uma conexão inválida.");
      }
      const edge = value as Record<string, Prisma.JsonValue>;
      if (
        typeof edge.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(edge.id) ||
        typeof edge.source !== "string" ||
        typeof edge.target !== "string" ||
        (typeof edge.label === "string" && edge.label.length > 120) ||
        !ids.has(edge.source) ||
        !ids.has(edge.target) ||
        edgeIds.has(edge.id)
      ) {
        throw new BadRequestException(
          "O diagrama contém conexões inválidas ou sem nós de origem/destino.",
        );
      }
      edgeIds.add(edge.id);
    }
  }

  private parseGeneratedDefinition(payload: unknown): Prisma.InputJsonObject {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new ServiceUnavailableException("A IA retornou uma estrutura de diagrama inválida.");
    }
    const candidate = payload as Record<string, unknown>;
    if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) {
      throw new ServiceUnavailableException("A IA retornou uma estrutura de diagrama incompleta.");
    }
    if (candidate.nodes.length > 25 || candidate.edges.length > 100) {
      throw new ServiceUnavailableException("A IA retornou um diagrama acima do limite permitido.");
    }
    const definition = {
      nodes: candidate.nodes.map((value, index) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new ServiceUnavailableException("A IA retornou um nó inválido.");
        }
        const node = value as Record<string, unknown>;
        if (
          typeof node.label !== "string" ||
          typeof node.type !== "string" ||
          !PROJECT_DIAGRAM_NODE_TYPES.includes(node.type as ProjectDiagramNodeType)
        ) {
          throw new ServiceUnavailableException("A IA retornou um nó incompleto.");
        }
        return {
          id: typeof node.id === "string" ? node.id : `n${index + 1}`,
          label: node.label.trim(),
          type: node.type,
          x: typeof node.x === "number" ? node.x : 80 + (index % 4) * 220,
          y: typeof node.y === "number" ? node.y : 80 + Math.floor(index / 4) * 150,
        };
      }),
      edges: candidate.edges.map((value, index) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new ServiceUnavailableException("A IA retornou uma conexão inválida.");
        }
        const edge = value as Record<string, unknown>;
        if (typeof edge.source !== "string" || typeof edge.target !== "string") {
          throw new ServiceUnavailableException("A IA retornou uma conexão incompleta.");
        }
        return {
          id: typeof edge.id === "string" ? edge.id : `e${index + 1}`,
          source: edge.source,
          target: edge.target,
          label: typeof edge.label === "string" ? edge.label : "",
        };
      }),
    };
    return definition;
  }
}
