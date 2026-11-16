import { Injectable } from "@nestjs/common";
import { QaToolType } from "@qagent/shared";
import { AiService } from "./ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

@Injectable()
export class QaToolsService {
  constructor(
    private readonly ai: AiService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  history(userId: string) {
    return this.prisma.toolExecution.findMany({
      where: { userId, environment: "WORK" },
      select: {
        id: true,
        tool: true,
        input: true,
        result: true,
        model: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async execute(userId: string, tool: QaToolType, input: string) {
    const preferences = await this.users.getPreferences(userId);
    const generated = await this.ai.runTool(tool, input, preferences);
    return this.prisma.toolExecution.create({
      data: {
        userId,
        environment: "WORK",
        tool,
        input: input.trim(),
        result: generated.text,
        model: generated.model,
        inputTokens: generated.inputTokens,
        outputTokens: generated.outputTokens,
      },
      select: {
        id: true,
        tool: true,
        input: true,
        result: true,
        model: true,
        createdAt: true,
      },
    });
  }
}
