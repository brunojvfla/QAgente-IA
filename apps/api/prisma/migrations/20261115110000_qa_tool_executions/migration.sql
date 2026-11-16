CREATE TYPE "QaToolType" AS ENUM (
  'REQUIREMENT_ANALYSIS',
  'RISK_ANALYSIS',
  'TEST_CASES',
  'BDD'
);

CREATE TABLE "ToolExecution" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "environment" "Environment" NOT NULL DEFAULT 'WORK',
  "tool" "QaToolType" NOT NULL,
  "input" TEXT NOT NULL,
  "result" TEXT NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ToolExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ToolExecution_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ToolExecution_userId_environment_createdAt_idx"
  ON "ToolExecution"("userId", "environment", "createdAt");
