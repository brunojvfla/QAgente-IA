import { BadRequestException } from "@nestjs/common";
import { ProjectResourcesService } from "./project-resources.service";
import { ProjectsService } from "./projects.service";
import { PrismaService } from "../prisma/prisma.service";
import { AiService } from "../ai/ai.service";
import { UsersService } from "../users/users.service";

describe("ProjectResourcesService", () => {
  const prisma = {
    projectDiagram: { create: jest.fn() },
  };
  const projects = {
    findOwned: jest.fn(),
    contextForChat: jest.fn(),
  };
  const ai = { generateFlow: jest.fn() };
  const users = { getPreferences: jest.fn() };
  let service: ProjectResourcesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectResourcesService(
      prisma as unknown as PrismaService,
      projects as unknown as ProjectsService,
      ai as unknown as AiService,
      users as unknown as UsersService,
    );
    projects.findOwned.mockResolvedValue({ id: "project-1", status: "ACTIVE" });
    projects.contextForChat.mockResolvedValue({
      name: "Projeto um",
      description: null,
      category: null,
      notes: [],
      tasks: [],
    });
    users.getPreferences.mockResolvedValue({
      writingStyle: "BALANCED",
      responseDetail: "MEDIUM",
      aiModel: null,
    });
  });

  it("rejects diagram links that point outside the diagram", async () => {
    await expect(
      service.createDiagram("user-1", "project-1", {
        name: "Fluxo",
        definition: {
          nodes: [
            { id: "n1", label: "Início", type: "START", x: 80, y: 80 },
          ],
          edges: [{ id: "e1", source: "n1", target: "n2" }],
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.projectDiagram.create).not.toHaveBeenCalled();
  });

  it("generates an editable flow using only the selected project's context", async () => {
    ai.generateFlow.mockResolvedValue({
      model: "test-model",
      text: JSON.stringify({
        nodes: [{ label: "Início", type: "START" }],
        edges: [],
      }),
    });

    const result = await service.generateDiagram(
      "user-1",
      "project-1",
      "Represente o começo de um processo.",
    );

    expect(projects.contextForChat).toHaveBeenCalledWith(
      "user-1",
      "project-1",
      "Represente o começo de um processo.",
    );
    expect(ai.generateFlow).toHaveBeenCalledWith(
      "Represente o começo de um processo.",
      expect.objectContaining({ writingStyle: "BALANCED" }),
      expect.objectContaining({ name: "Projeto um" }),
    );
    expect(result.definition.nodes).toEqual([
      expect.objectContaining({ id: "n1", label: "Início", type: "START" }),
    ]);
  });
});
