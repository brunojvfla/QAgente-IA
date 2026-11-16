CREATE TABLE "FileFolder" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "environment" "Environment" NOT NULL,
  "projectId" UUID,
  "parentId" UUID,
  "name" VARCHAR(180) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FileFolder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FileFolder_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FileFolder_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "FileFolder_parentId_fkey" FOREIGN KEY ("parentId")
    REFERENCES "FileFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "FileFolder_userId_environment_projectId_parentId_name_idx"
  ON "FileFolder"("userId", "environment", "projectId", "parentId", "name");

CREATE TABLE "WorkspaceFile" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "environment" "Environment" NOT NULL,
  "projectId" UUID,
  "folderId" UUID,
  "name" VARCHAR(255) NOT NULL,
  "storageKey" VARCHAR(36) NOT NULL,
  "mimeType" VARCHAR(255) NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceFile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkspaceFile_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkspaceFile_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "WorkspaceFile_folderId_fkey" FOREIGN KEY ("folderId")
    REFERENCES "FileFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkspaceFile_storageKey_key" ON "WorkspaceFile"("storageKey");
CREATE INDEX "WorkspaceFile_userId_environment_projectId_folderId_name_idx"
  ON "WorkspaceFile"("userId", "environment", "projectId", "folderId", "name");
