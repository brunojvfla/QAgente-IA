import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { afterEach } from "@jest/globals";
import { PrismaService } from "../prisma/prisma.service";
import { FilesService } from "./files.service";
import { rm, mkdtemp, readFile, readdir } from "node:fs/promises";
import { Buffer } from "node:buffer";
import os from "node:os";
import path from "node:path";

describe("FilesService", () => {
  const prisma = {
    fileFolder: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workspaceFile: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: { findFirst: jest.fn() },
  };
  let service: FilesService;
  let storageRoot: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    storageRoot = await mkdtemp(path.join(os.tmpdir(), "qagent-files-test-"));
    service = new FilesService(
      prisma as unknown as PrismaService,
      new ConfigService({ QAGENT_STORAGE_DIR: storageRoot }),
    );
    prisma.fileFolder.findMany.mockResolvedValue([]);
    prisma.workspaceFile.findMany.mockResolvedValue([]);
  });

  afterEach(async () => {
    await rm(storageRoot, { recursive: true, force: true });
  });

  it("scopes folder and file listings by owner and environment", async () => {
    await service.list("user-1", { environment: "LEARN" });

    expect(prisma.fileFolder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          environment: "LEARN",
          parentId: null,
        }),
      }),
    );
    expect(prisma.workspaceFile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          environment: "LEARN",
          folderId: null,
        }),
      }),
    );
  });

  it("does not return another user's file content", async () => {
    prisma.workspaceFile.findFirst.mockResolvedValue(null);

    await expect(service.content("user-1", "WORK", "file-from-another-user"))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.workspaceFile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "file-from-another-user", userId: "user-1", environment: "WORK" },
      }),
    );
  });

  it("stores uploads under generated keys and strips client-supplied path segments", async () => {
    const now = new Date("2026-11-15T12:00:00.000Z");
    prisma.workspaceFile.create.mockImplementation(({ data }) =>
      Promise.resolve({ ...data, id: "file-1", createdAt: now, updatedAt: now, project: null }),
    );

    const result = await service.upload(
      "user-1",
      "WORK",
      {
        originalname: "C:\\fakepath\\requirements.txt",
        mimetype: "text/plain",
        size: 11,
        buffer: Buffer.from("QA evidence"),
      },
    );

    expect(result.name).toBe("requirements.txt");
    expect(prisma.workspaceFile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          environment: "WORK",
          storageKey: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        }),
      }),
    );
    const [storedName] = await readdir(storageRoot);
    expect(await readFile(path.join(storageRoot, storedName!), "utf8")).toBe("QA evidence");
  });
});
