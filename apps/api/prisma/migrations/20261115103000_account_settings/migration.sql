CREATE TYPE "WritingStyle" AS ENUM ('NATURAL', 'BALANCED', 'STRUCTURED', 'OBJECTIVE');
CREATE TYPE "ResponseDetail" AS ENUM ('SHORT', 'MEDIUM', 'COMPLETE');

ALTER TABLE "User"
  ADD COLUMN "phone" VARCHAR(16),
  ADD COLUMN "writingStyle" "WritingStyle" NOT NULL DEFAULT 'BALANCED',
  ADD COLUMN "responseDetail" "ResponseDetail" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "aiModel" VARCHAR(120);

UPDATE "User"
SET "email" = lower(trim("email"))
WHERE "email" <> lower(trim("email"));

CREATE UNIQUE INDEX "User_email_case_insensitive_key" ON "User" (lower("email"));
