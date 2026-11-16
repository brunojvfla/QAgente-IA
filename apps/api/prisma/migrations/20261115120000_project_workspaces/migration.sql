CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ProjectKnowledgeKind" AS ENUM ('DOCUMENT', 'DECISION', 'REQUIREMENT', 'FILE_LINK');
CREATE TYPE "ProjectTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE "ProjectTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE "Project"
  ADD COLUMN "category" VARCHAR(100),
  ADD COLUMN "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Conversation"
  ADD COLUMN "projectId" UUID,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

DROP INDEX "Project_userId_updatedAt_idx";
CREATE INDEX "Project_userId_status_updatedAt_idx"
  ON "Project"("userId", "status", "updatedAt");
CREATE INDEX "Conversation_userId_environment_projectId_updatedAt_idx"
  ON "Conversation"("userId", "environment", "projectId", "updatedAt");

ALTER TABLE "Conversation"
  ADD CONSTRAINT "Conversation_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProjectKnowledge" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "kind" "ProjectKnowledgeKind" NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "content" TEXT NOT NULL,
  "externalUrl" VARCHAR(2048),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectKnowledge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectKnowledge_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProjectKnowledge_projectId_kind_updatedAt_idx"
  ON "ProjectKnowledge"("projectId", "kind", "updatedAt");

CREATE TABLE "ProjectTask" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "description" VARCHAR(2000),
  "status" "ProjectTaskStatus" NOT NULL DEFAULT 'TODO',
  "priority" "ProjectTaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "dueAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProjectTask_projectId_status_updatedAt_idx"
  ON "ProjectTask"("projectId", "status", "updatedAt");

CREATE TABLE "ProjectDiagram" (
  "id" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "definition" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectDiagram_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectDiagram_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProjectDiagram_projectId_updatedAt_idx"
  ON "ProjectDiagram"("projectId", "updatedAt");
