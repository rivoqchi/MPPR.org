-- CreateEnum
CREATE TYPE "UserDocumentType" AS ENUM ('FILE', 'ARCHIVE');

-- AlterTable
ALTER TABLE "user_documents" ADD COLUMN "type" "UserDocumentType" NOT NULL DEFAULT 'FILE';

-- DropIndex
DROP INDEX IF EXISTS "user_documents_createdById_idx";

-- CreateIndex
CREATE INDEX "user_documents_createdById_type_idx" ON "user_documents"("createdById", "type");
