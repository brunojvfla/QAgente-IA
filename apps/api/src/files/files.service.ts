import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Environment, FileDirectoryListing, WorkspaceFile, WorkspaceFolder } from "@qagent/shared";
import { Project, WorkspaceFile as PrismaWorkspaceFile } from "@prisma/client";
import { Buffer } from "node:buffer";
import { createReadStream } from "node:fs";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { FileListQueryDto } from "./dto/file-list-query.dto";

export const MAX_WORKSPACE_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FOLDER_DEPTH = 20;
const INLINE_MIME_TYPES = new Set([
  "application/json",
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
]);

export interface UploadedWorkspaceFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

type FolderRecord = {
  id: string;
  name: string;
  environment: Environment;
  parentId: string | null;
  projectId: string | null;
  updatedAt: Date;
  project: { name: string } | null;
  _count: { children: number; files: number };
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly storageRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.storageRoot = path.resolve(
      config.get<string>("QAGENT_STORAGE_DIR")?.trim() || path.join(process.cwd(), "storage"),
    );
  }

  async list(userId: string, query: FileListQueryDto): Promise<FileDirectoryListing> {
    if (query.projectId) {
      await this.assertOwnedProject(userId, query.environment, query.projectId);
    }

    let currentFolder: FolderRecord | null = null;
    const breadcrumbs: Array<{ id: string; name: string }> = [];
    if (query.folderId) {
      currentFolder = await this.findOwnedFolder(userId, query.folderId, query.environment);
      if (query.projectId && query.projectId !== currentFolder.projectId) {
        throw new BadRequestException("A pasta selecionada pertence a outro projeto.");
      }
      let ancestor: { id: string; name: string; parentId: string | null } | null = currentFolder;
      while (ancestor) {
        breadcrumbs.unshift({ id: ancestor.id, name: ancestor.name });
        if (breadcrumbs.length > MAX_FOLDER_DEPTH) {
          throw new InternalServerErrorException("A hierarquia de pastas excede o limite permitido.");
        }
        const parentFolder: { id: string; name: string; parentId: string | null } | null =
          ancestor.parentId
            ? await this.prisma.fileFolder.findFirst({
              where: {
                id: ancestor.parentId,
                userId,
                environment: query.environment,
              },
              select: { id: true, name: true, parentId: true },
            })
            : null;
        ancestor = parentFolder;
      }
    }

    const projectId = currentFolder ? currentFolder.projectId : query.projectId;
    const parentId = currentFolder?.id ?? null;
    const [folders, files] = await Promise.all([
      this.prisma.fileFolder.findMany({
        where: {
          userId,
          environment: query.environment,
          parentId,
          ...(projectId !== undefined && { projectId }),
        },
        include: {
          project: { select: { name: true } },
          _count: { select: { children: true, files: true } },
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.workspaceFile.findMany({
        where: {
          userId,
          environment: query.environment,
          folderId: parentId,
          ...(projectId !== undefined && { projectId }),
        },
        include: { project: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      currentFolder: currentFolder ? this.toFolder(currentFolder) : null,
      breadcrumbs,
      folders: folders.map((folder) => this.toFolder(folder)),
      files: files.map((file) => this.toFile(file)),
    };
  }

  async allFolders(userId: string, environment: Environment, projectId?: string) {
    if (projectId) await this.assertOwnedProject(userId, environment, projectId);
    const folders = await this.prisma.fileFolder.findMany({
      where: {
        userId,
        environment,
        ...(projectId !== undefined && { projectId }),
      },
      include: {
        project: { select: { name: true } },
        _count: { select: { children: true, files: true } },
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });
    const byId = new Map(folders.map((folder) => [folder.id, folder]));
    return folders.map((folder) => {
      const pathParts: string[] = [];
      let parentId: string | null = folder.id;
      while (parentId) {
        const pathFolder = byId.get(parentId);
        if (!pathFolder) break;
        pathParts.unshift(pathFolder.name);
        parentId = pathFolder.parentId;
        if (pathParts.length > MAX_FOLDER_DEPTH) {
          throw new InternalServerErrorException("A hierarquia de pastas excede o limite permitido.");
        }
      }
      return {
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        projectId: folder.projectId,
        projectName: folder.project?.name ?? null,
        updatedAt: folder.updatedAt.toISOString(),
        childCount: folder._count.children,
        fileCount: folder._count.files,
        pathLabel: [folder.project?.name, ...pathParts].filter(Boolean).join(" / "),
      };
    });
  }

  async createFolder(
    userId: string,
    input: {
      name: string;
      environment: Environment;
      parentId?: string;
      projectId?: string;
    },
  ) {
    const name = this.normalizeFolderName(input.name);
    let projectId = input.projectId ?? null;
    if (input.parentId) {
      const parent = await this.findOwnedFolder(userId, input.parentId, input.environment);
      if (projectId && projectId !== parent.projectId) {
        throw new BadRequestException("A pasta pai pertence a outro projeto.");
      }
      projectId = parent.projectId;
      await this.assertFolderDepth(userId, input.environment, parent.id);
    } else if (projectId) {
      await this.assertOwnedProject(userId, input.environment, projectId);
    }
    await this.assertUniqueFolderName(userId, input.environment, projectId, input.parentId ?? null, name);

    return this.prisma.fileFolder.create({
      data: {
        userId,
        environment: input.environment,
        projectId,
        parentId: input.parentId ?? null,
        name,
      },
      include: {
        project: { select: { name: true } },
        _count: { select: { children: true, files: true } },
      },
    }).then((folder) => this.toFolder(folder));
  }

  async renameFolder(userId: string, environment: Environment, folderId: string, name: string) {
    const folder = await this.findOwnedFolder(userId, folderId, environment);
    const normalizedName = this.normalizeFolderName(name);
    await this.assertUniqueFolderName(
      userId,
      folder.environment,
      folder.projectId,
      folder.parentId,
      normalizedName,
      folder.id,
    );
    const updated = await this.prisma.fileFolder.update({
      where: { id: folder.id },
      data: { name: normalizedName },
      include: {
        project: { select: { name: true } },
        _count: { select: { children: true, files: true } },
      },
    });
    return this.toFolder(updated);
  }

  async moveFolder(userId: string, environment: Environment, folderId: string, parentId: string | null) {
    const folder = await this.findOwnedFolder(userId, folderId, environment);
    if (parentId === folder.id) throw new BadRequestException("Uma pasta não pode ser movida para dentro de si mesma.");
    let targetDepth = 1;
    if (parentId) {
      const parent = await this.findOwnedFolder(userId, parentId, folder.environment);
      if (parent.projectId !== folder.projectId) {
        throw new BadRequestException("A pasta de destino deve pertencer ao mesmo projeto.");
      }
      let ancestorId: string | null = parent.id;
      let depth = 1;
      while (ancestorId) {
        if (ancestorId === folder.id) {
          throw new BadRequestException("A pasta não pode ser movida para dentro de uma subpasta sua.");
        }
        const ancestor: { parentId: string | null } | null =
          await this.prisma.fileFolder.findFirst({
          where: { id: ancestorId, userId, environment: folder.environment },
          select: { parentId: true },
        });
        ancestorId = ancestor?.parentId ?? null;
        depth += 1;
        if (depth > MAX_FOLDER_DEPTH) {
          throw new BadRequestException(`A hierarquia pode ter no máximo ${MAX_FOLDER_DEPTH} níveis.`);
        }
      }
      targetDepth = depth;
    }

    const siblings = await this.prisma.fileFolder.findMany({
      where: {
        userId,
        environment: folder.environment,
        projectId: folder.projectId,
      },
      select: { id: true, parentId: true },
    });
    const childrenByParent = new Map<string, string[]>();
    for (const candidate of siblings) {
      if (!candidate.parentId) continue;
      const children = childrenByParent.get(candidate.parentId) || [];
      children.push(candidate.id);
      childrenByParent.set(candidate.parentId, children);
    }
    let subtreeHeight = 1;
    const pending = [{ id: folder.id, depth: 1 }];
    while (pending.length) {
      const current = pending.pop();
      if (!current) break;
      subtreeHeight = Math.max(subtreeHeight, current.depth);
      if (current.depth >= MAX_FOLDER_DEPTH) {
        if (childrenByParent.has(current.id)) {
          throw new BadRequestException(`A hierarquia pode ter no máximo ${MAX_FOLDER_DEPTH} níveis.`);
        }
        continue;
      }
      for (const childId of childrenByParent.get(current.id) || []) {
        pending.push({ id: childId, depth: current.depth + 1 });
      }
    }
    if (targetDepth + subtreeHeight - 1 > MAX_FOLDER_DEPTH) {
      throw new BadRequestException(`A hierarquia pode ter no máximo ${MAX_FOLDER_DEPTH} níveis.`);
    }
    await this.assertUniqueFolderName(
      userId,
      folder.environment,
      folder.projectId,
      parentId,
      folder.name,
      folder.id,
    );
    const moved = await this.prisma.fileFolder.update({
      where: { id: folder.id },
      data: { parentId },
      include: {
        project: { select: { name: true } },
        _count: { select: { children: true, files: true } },
      },
    });
    return this.toFolder(moved);
  }

  async deleteFolder(userId: string, environment: Environment, folderId: string) {
    const folder = await this.findOwnedFolder(userId, folderId, environment);
    if (folder._count.children || folder._count.files) {
      throw new ConflictException("Esvazie ou mova as pastas e arquivos antes de excluir esta pasta.");
    }
    await this.prisma.fileFolder.delete({ where: { id: folder.id } });
  }

  async upload(
    userId: string,
    environment: Environment,
    file: UploadedWorkspaceFile | undefined,
    folderId?: string,
    requestedProjectId?: string,
  ) {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException("Selecione um arquivo válido para enviar.");
    }
    if (file.size > MAX_WORKSPACE_FILE_SIZE || file.buffer.length > MAX_WORKSPACE_FILE_SIZE) {
      throw new BadRequestException("O arquivo excede o limite local de 10 MB.");
    }
    const folder = folderId ? await this.findOwnedFolder(userId, folderId, environment) : null;
    if (folder && requestedProjectId && requestedProjectId !== folder.projectId) {
      throw new BadRequestException("A pasta selecionada pertence a outro projeto.");
    }
    const projectId = folder ? folder.projectId : requestedProjectId ?? null;
    if (projectId) await this.assertOwnedProject(userId, environment, projectId);
    const name = this.normalizeFileName(file.originalname);
    const storageKey = randomUUID();
    const storedPath = this.storagePath(storageKey);

    try {
      await mkdir(this.storageRoot, { recursive: true });
      await writeFile(storedPath, file.buffer, { flag: "wx" });
    } catch (error) {
      this.logger.error(`Unable to write workspace file ${storageKey}.`, error);
      throw new InternalServerErrorException("Não foi possível gravar o arquivo no armazenamento local.");
    }

    try {
      const created = await this.prisma.workspaceFile.create({
        data: {
          userId,
          environment,
          projectId,
          folderId: folder?.id ?? null,
          name,
          storageKey,
          mimeType: file.mimetype.slice(0, 255) || "application/octet-stream",
          size: file.buffer.length,
        },
        include: { project: { select: { name: true } } },
      });
      return this.toFile(created);
    } catch (error) {
      try {
        await unlink(storedPath);
      } catch (cleanupError) {
        this.logger.error(`Unable to remove orphaned workspace file ${storageKey}.`, cleanupError);
      }
      throw error;
    }
  }

  async renameFile(userId: string, environment: Environment, fileId: string, name: string) {
    const file = await this.findOwnedFile(userId, fileId, environment);
    const normalizedName = this.normalizeFileName(name);
    const updated = await this.prisma.workspaceFile.update({
      where: { id: file.id },
      data: { name: normalizedName },
      include: { project: { select: { name: true } } },
    });
    return this.toFile(updated);
  }

  async moveFile(userId: string, environment: Environment, fileId: string, folderId: string | null) {
    const file = await this.findOwnedFile(userId, fileId, environment);
    if (folderId) {
      const folder = await this.findOwnedFolder(userId, folderId, file.environment);
      if (folder.projectId !== file.projectId) {
        throw new BadRequestException("A pasta de destino deve pertencer ao mesmo projeto.");
      }
    }
    const moved = await this.prisma.workspaceFile.update({
      where: { id: file.id },
      data: { folderId },
      include: { project: { select: { name: true } } },
    });
    return this.toFile(moved);
  }

  async deleteFile(userId: string, environment: Environment, fileId: string) {
    const file = await this.findOwnedFile(userId, fileId, environment);
    const storedPath = this.storagePath(file.storageKey);
    try {
      await unlink(storedPath);
    } catch (error) {
      if (!this.isFileMissing(error)) {
        this.logger.error(`Unable to remove workspace file ${file.storageKey}.`, error);
        throw new InternalServerErrorException("Não foi possível remover o arquivo do armazenamento local.");
      }
    }
    await this.prisma.workspaceFile.delete({ where: { id: file.id } });
  }

  async content(userId: string, environment: Environment, fileId: string) {
    const file = await this.findOwnedFile(userId, fileId, environment);
    const storedPath = this.storagePath(file.storageKey);
    try {
      await access(storedPath);
    } catch (error) {
      if (this.isFileMissing(error)) throw new NotFoundException("O conteúdo deste arquivo não foi encontrado.");
      throw error;
    }
    return {
      file: this.toFile(file),
      stream: createReadStream(storedPath),
      inline: INLINE_MIME_TYPES.has(file.mimeType.toLowerCase()),
    };
  }

  private async findOwnedFolder(
    userId: string,
    folderId: string,
    environment?: Environment,
  ): Promise<FolderRecord> {
    const folder = await this.prisma.fileFolder.findFirst({
      where: { id: folderId, userId, ...(environment && { environment }) },
      include: {
        project: { select: { name: true } },
        _count: { select: { children: true, files: true } },
      },
    });
    if (!folder) throw new NotFoundException("Pasta não encontrada.");
    return folder;
  }

  private async findOwnedFile(
    userId: string,
    fileId: string,
    environment: Environment,
  ): Promise<PrismaWorkspaceFile & { project: { name: string } | null }> {
    const file = await this.prisma.workspaceFile.findFirst({
      where: { id: fileId, userId, environment },
      include: { project: { select: { name: true } } },
    });
    if (!file) throw new NotFoundException("Arquivo não encontrado.");
    return file;
  }

  private async assertOwnedProject(userId: string, environment: Environment, projectId: string) {
    if (environment !== "WORK") {
      throw new BadRequestException("Projetos só podem ser associados a arquivos do ambiente Work.");
    }
    const project: Pick<Project, "id"> | null = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException("Projeto não encontrado.");
  }

  private async assertFolderDepth(userId: string, environment: Environment, parentId: string) {
    let currentId: string | null = parentId;
    let depth = 1;
    while (currentId) {
      const currentFolder: { parentId: string | null } | null =
        await this.prisma.fileFolder.findFirst({
          where: { id: currentId, userId, environment },
          select: { parentId: true },
        });
      if (!currentFolder) throw new NotFoundException("Pasta pai não encontrada.");
      currentId = currentFolder.parentId;
      depth += 1;
      if (depth > MAX_FOLDER_DEPTH) {
        throw new BadRequestException(`A hierarquia pode ter no máximo ${MAX_FOLDER_DEPTH} níveis.`);
      }
    }
  }

  private async assertUniqueFolderName(
    userId: string,
    environment: Environment,
    projectId: string | null,
    parentId: string | null,
    name: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.fileFolder.findFirst({
      where: {
        userId,
        environment,
        projectId,
        parentId,
        name: { equals: name, mode: "insensitive" },
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException("Já existe uma pasta com este nome neste local.");
  }

  private normalizeFolderName(value: string) {
    const name = value.trim();
    if (!name || name.includes("/") || name.includes("\\")) {
      throw new BadRequestException("Informe um nome válido para a pasta.");
    }
    return name;
  }

  private normalizeFileName(value: string) {
    const baseName = value
      .replace(/\\/g, "/")
      .split("/")
      .pop() ?? "";
    const name = baseName
      .split("")
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
      .join("")
      .trim()
      .slice(0, 255);
    if (!name) throw new BadRequestException("Informe um nome válido para o arquivo.");
    return name;
  }

  private storagePath(storageKey: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storageKey)) {
      throw new InternalServerErrorException("A referência do arquivo armazenado é inválida.");
    }
    const resolved = path.resolve(this.storageRoot, storageKey);
    if (path.dirname(resolved) !== this.storageRoot) {
      throw new InternalServerErrorException("O caminho do arquivo armazenado é inválido.");
    }
    return resolved;
  }

  private isFileMissing(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    );
  }

  private toFolder(folder: FolderRecord): WorkspaceFolder {
    return {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      projectId: folder.projectId,
      projectName: folder.project?.name ?? null,
      updatedAt: folder.updatedAt.toISOString(),
      childCount: folder._count.children,
      fileCount: folder._count.files,
    };
  }

  private toFile(
    file: PrismaWorkspaceFile & { project: { name: string } | null },
  ): WorkspaceFile {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      folderId: file.folderId,
      projectId: file.projectId,
      projectName: file.project?.name ?? null,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    };
  }
}
