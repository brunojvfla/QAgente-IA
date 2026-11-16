CREATE TABLE "LearnProgress" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "lessonId" VARCHAR(120) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "bestScore" INTEGER,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearnProgress_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LearnProgress_userId_lessonId_key"
  ON "LearnProgress"("userId", "lessonId");
CREATE INDEX "LearnProgress_userId_updatedAt_idx"
  ON "LearnProgress"("userId", "updatedAt");

CREATE TABLE "LearningAttempt" (
  "id" UUID NOT NULL,
  "progressId" UUID NOT NULL,
  "answer" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL,
  "feedback" TEXT NOT NULL,
  "strengths" JSONB NOT NULL,
  "improvements" JSONB NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LearningAttempt_progressId_fkey" FOREIGN KEY ("progressId")
    REFERENCES "LearnProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LearningAttempt_progressId_createdAt_idx"
  ON "LearningAttempt"("progressId", "createdAt");
