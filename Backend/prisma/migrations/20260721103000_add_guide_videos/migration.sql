-- CreateTable
CREATE TABLE "guide_videos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "durationSec" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guide_video_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "watched" BOOLEAN NOT NULL DEFAULT false,
    "watchedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guide_video_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guide_videos_sortOrder_idx" ON "guide_videos"("sortOrder");

-- CreateIndex
CREATE INDEX "guide_video_progress_userId_idx" ON "guide_video_progress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "guide_video_progress_userId_videoId_key" ON "guide_video_progress"("userId", "videoId");

-- AddForeignKey
ALTER TABLE "guide_video_progress" ADD CONSTRAINT "guide_video_progress_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "guide_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
