-- AlterTable
ALTER TABLE "applications" ADD COLUMN "recipientUserIds" JSONB NOT NULL DEFAULT '[]';
