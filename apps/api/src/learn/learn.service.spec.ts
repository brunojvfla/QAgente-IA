import { ServiceUnavailableException } from "@nestjs/common";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { LearnService } from "./learn.service";

describe("LearnService", () => {
  const transaction = {
    learnProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    learningAttempt: {
      create: jest.fn(),
    },
  };
  const prisma = {
    learnProgress: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const ai = { evaluateLearningAnswer: jest.fn() };
  const users = { getPreferences: jest.fn() };
  let service: LearnService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction),
    );
    transaction.learnProgress.findUnique.mockResolvedValue(null);
    transaction.learnProgress.upsert.mockResolvedValue({ id: "progress-1" });
    transaction.learningAttempt.create.mockResolvedValue({
      id: "attempt-1",
      score: 82,
      passed: true,
      feedback: "Boa justificativa.",
      strengths: ["Aplicou os conceitos."],
      improvements: ["Explique melhor a evidência."],
      createdAt: new Date("2026-11-15T12:00:00.000Z"),
    });
    users.getPreferences.mockResolvedValue({
      writingStyle: "BALANCED",
      responseDetail: "MEDIUM",
      aiModel: null,
    });
    ai.evaluateLearningAnswer.mockResolvedValue({
      score: 82,
      feedback: "Boa justificativa.",
      strengths: ["Aplicou os conceitos."],
      improvements: ["Explique melhor a evidência."],
      model: "provider/model-free:free",
      inputTokens: 100,
      outputTokens: 30,
    });
    service = new LearnService(
      prisma as unknown as PrismaService,
      ai as unknown as AiService,
      users as unknown as UsersService,
    );
  });

  it("returns only the authenticated user's persisted progress and public course content", async () => {
    prisma.learnProgress.findMany.mockResolvedValue([
      {
        lessonId: "quality-and-qa",
        bestScore: 82,
        completedAt: new Date("2026-11-15T12:00:00.000Z"),
      },
    ]);

    const tracks = await service.tracks("user-1");

    expect(prisma.learnProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(tracks[0]?.progress).toEqual({
      completedLessons: 1,
      completionPercent: 50,
      averageScore: 82,
    });
    expect(JSON.stringify(tracks)).not.toContain("assessmentCriteria");
  });

  it("persists an evaluated answer and updates only the user's lesson progress", async () => {
    const result = await service.submitAttempt("user-1", "quality-and-qa", "Minha resposta.");

    expect(ai.evaluateLearningAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ answer: "Minha resposta.", criteria: expect.any(Array) }),
      expect.objectContaining({ responseDetail: "MEDIUM" }),
    );
    expect(transaction.learnProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_lessonId: { userId: "user-1", lessonId: "quality-and-qa" } },
        create: expect.objectContaining({
          userId: "user-1",
          lessonId: "quality-and-qa",
          attempts: 1,
          bestScore: 82,
        }),
      }),
    );
    expect(transaction.learningAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          progressId: "progress-1",
          answer: "Minha resposta.",
          model: "provider/model-free:free",
        }),
      }),
    );
    expect(result).toMatchObject({ id: "attempt-1", lessonId: "quality-and-qa", score: 82, passed: true });
  });

  it("does not save progress when the AI provider cannot evaluate the answer", async () => {
    ai.evaluateLearningAnswer.mockRejectedValue(
      new ServiceUnavailableException("A avaliação está indisponível."),
    );

    await expect(
      service.submitAttempt("user-1", "quality-and-qa", "Minha resposta."),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
