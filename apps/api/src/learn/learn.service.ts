import { Injectable, NotFoundException } from "@nestjs/common";
import {
  LearnAttemptResult,
  LearnProgressItem,
  LearnProgressSummary,
  LearnTrack,
} from "@qagent/shared";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import {
  findCurriculumLesson,
  findCurriculumTrack,
  getCurriculumTracks,
  publicLesson,
  publicLessonSummary,
} from "./learn-content";

const PASSING_SCORE = 70;

@Injectable()
export class LearnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly users: UsersService,
  ) {}

  async tracks(userId: string): Promise<LearnTrack[]> {
    const progress = await this.prisma.learnProgress.findMany({
      where: { userId },
      select: { lessonId: true, bestScore: true, completedAt: true },
    });
    const progressByLesson = new Map(progress.map((item) => [item.lessonId, item]));

    return getCurriculumTracks().map((track) => {
      const completed = track.lessons.filter(
        (lesson) => progressByLesson.get(lesson.id)?.completedAt,
      ).length;
      const scores = track.lessons
        .map((lesson) => progressByLesson.get(lesson.id)?.bestScore)
        .filter((score): score is number => score !== null && score !== undefined);
      return {
        id: track.id,
        title: track.title,
        description: track.description,
        level: track.level,
        lessons: track.lessons.map(publicLessonSummary),
        progress: {
          completedLessons: completed,
          completionPercent: Math.round((completed / track.lessons.length) * 100),
          averageScore: scores.length
            ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
            : null,
        },
      };
    });
  }

  async track(userId: string, trackId: string) {
    const track = findCurriculumTrack(trackId);
    if (!track) throw new NotFoundException("Trilha de aprendizado não encontrada.");
    const trackWithProgress = (await this.tracks(userId)).find((item) => item.id === track.id);
    if (!trackWithProgress) throw new NotFoundException("Trilha de aprendizado não encontrada.");
    return trackWithProgress;
  }

  async lesson(userId: string, lessonId: string) {
    const lesson = findCurriculumLesson(lessonId);
    if (!lesson) throw new NotFoundException("Aula não encontrada.");
    const progress = await this.prisma.learnProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      include: {
        learningAttempts: {
          select: {
            id: true,
            score: true,
            passed: true,
            feedback: true,
            strengths: true,
            improvements: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    return {
      lesson: publicLesson(lesson),
      progress: progress
        ? {
            attempts: progress.attempts,
            bestScore: progress.bestScore,
            completedAt: progress.completedAt,
            recentAttempts: progress.learningAttempts,
          }
        : { attempts: 0, bestScore: null, completedAt: null, recentAttempts: [] },
    };
  }

  async challenges(userId: string) {
    const [tracks, progress] = await Promise.all([
      this.tracks(userId),
      this.prisma.learnProgress.findMany({
        where: { userId, completedAt: { not: null } },
        select: { lessonId: true },
      }),
    ]);
    const completedLessons = new Set(progress.map((item) => item.lessonId));
    return tracks.flatMap((track) =>
      track.lessons.map((lesson) => ({
        ...lesson,
        trackId: track.id,
        trackTitle: track.title,
        completed: completedLessons.has(lesson.id),
      })),
    );
  }

  async progress(userId: string): Promise<LearnProgressSummary> {
    const [tracks, records] = await Promise.all([
      this.tracks(userId),
      this.prisma.learnProgress.findMany({
        where: { userId },
        select: {
          lessonId: true,
          attempts: true,
          bestScore: true,
          completedAt: true,
          updatedAt: true,
        },
      }),
    ]);
    const lessons: LearnProgressItem[] = records.map((record) => ({
      lessonId: record.lessonId,
      attempts: record.attempts,
      bestScore: record.bestScore,
      completedAt: record.completedAt?.toISOString() ?? null,
      lastAttemptAt: record.updatedAt.toISOString(),
    }));
    const scored = lessons
      .map((item) => item.bestScore)
      .filter((score): score is number => score !== null);
    return {
      completedLessons: lessons.filter((item) => item.completedAt).length,
      totalLessons: getCurriculumTracks().reduce((count, item) => count + item.lessons.length, 0),
      attempts: lessons.reduce((count, item) => count + item.attempts, 0),
      averageScore: scored.length
        ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
        : null,
      tracks: tracks.map((track) => ({
        trackId: track.id,
        title: track.title,
        completedLessons: track.progress.completedLessons,
        totalLessons: track.lessons.length,
        completionPercent: track.progress.completionPercent,
        averageScore: track.progress.averageScore,
      })),
      lessons,
    };
  }

  async submitAttempt(
    userId: string,
    lessonId: string,
    answer: string,
  ): Promise<LearnAttemptResult> {
    const lesson = findCurriculumLesson(lessonId);
    if (!lesson) throw new NotFoundException("Aula não encontrada.");
    const preferences = await this.users.getPreferences(userId);
    const evaluation = await this.ai.evaluateLearningAnswer(
      {
        title: lesson.title,
        content: lesson.content,
        prompt: lesson.exercise.prompt,
        criteria: lesson.assessmentCriteria,
        answer: answer.trim(),
      },
      preferences,
    );
    const passed = evaluation.score >= PASSING_SCORE;
    const saved = await this.prisma.$transaction(async (transaction) => {
      const previous = await transaction.learnProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId } },
        select: { id: true, bestScore: true, completedAt: true },
      });
      const completedAt = previous?.completedAt ?? (passed ? new Date() : null);
      const progress = await transaction.learnProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          attempts: 1,
          bestScore: evaluation.score,
          completedAt,
        },
        update: {
          attempts: { increment: 1 },
          bestScore: Math.max(previous?.bestScore ?? 0, evaluation.score),
          completedAt,
        },
        select: { id: true },
      });
      return transaction.learningAttempt.create({
        data: {
          progressId: progress.id,
          answer: answer.trim(),
          score: evaluation.score,
          passed,
          feedback: evaluation.feedback,
          strengths: evaluation.strengths,
          improvements: evaluation.improvements,
          model: evaluation.model,
          inputTokens: evaluation.inputTokens,
          outputTokens: evaluation.outputTokens,
        },
        select: {
          id: true,
          score: true,
          passed: true,
          feedback: true,
          strengths: true,
          improvements: true,
          createdAt: true,
        },
      });
    });

    return {
      id: saved.id,
      lessonId,
      score: saved.score,
      passed: saved.passed,
      feedback: saved.feedback,
      strengths: Array.isArray(saved.strengths)
        ? saved.strengths.filter((item): item is string => typeof item === "string")
        : [],
      improvements: Array.isArray(saved.improvements)
        ? saved.improvements.filter((item): item is string => typeof item === "string")
        : [],
      createdAt: saved.createdAt.toISOString(),
    };
  }
}
