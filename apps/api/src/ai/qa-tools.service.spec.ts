import type { AiService } from "./ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { QaToolsService } from "./qa-tools.service";

jest.mock("./ai.service", () => ({ AiService: jest.fn() }));

describe("QaToolsService", () => {
  const prisma = { toolExecution: { create: jest.fn(), findMany: jest.fn() } };
  const ai = { runTool: jest.fn(), getDefaultModel: jest.fn() };
  const users = { getPreferences: jest.fn() };
  let service: QaToolsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QaToolsService(
      ai as unknown as AiService,
      prisma as unknown as PrismaService,
      users as unknown as UsersService,
    );
    users.getPreferences.mockResolvedValue({
      writingStyle: "BALANCED",
      responseDetail: "MEDIUM",
      aiModel: null,
    });
    ai.runTool.mockResolvedValue({
      text: "Resultado gerado",
      model: "gpt-4o-mini",
      inputTokens: 10,
      outputTokens: 20,
    });
    prisma.toolExecution.create.mockResolvedValue({ id: "execution-1" });
  });

  it("persists only a successfully generated result in the Work history", async () => {
    await service.execute("user-1", "TEST_CASES", "  Requisito  ");

    expect(ai.runTool).toHaveBeenCalledWith(
      "TEST_CASES",
      "  Requisito  ",
      { writingStyle: "BALANCED", responseDetail: "MEDIUM", aiModel: null },
    );
    expect(prisma.toolExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: "user-1",
          environment: "WORK",
          tool: "TEST_CASES",
          input: "Requisito",
          result: "Resultado gerado",
          model: "gpt-4o-mini",
          inputTokens: 10,
          outputTokens: 20,
        },
      }),
    );
  });

  it("does not create history when the AI provider fails", async () => {
    ai.runTool.mockRejectedValue(new Error("provider unavailable"));

    await expect(
      service.execute("user-1", "BDD", "Requisito"),
    ).rejects.toThrow("provider unavailable");

    expect(prisma.toolExecution.create).not.toHaveBeenCalled();
  });
});
