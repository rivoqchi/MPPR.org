-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "notifications" ADD COLUMN "linkPath" TEXT;
ALTER TABLE "notifications" ADD COLUMN "metadata" JSONB;

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
