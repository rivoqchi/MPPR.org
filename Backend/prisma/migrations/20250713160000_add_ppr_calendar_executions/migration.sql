-- CreateTable
CREATE TABLE "ppr_calendar_object_executions" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "files" JSONB NOT NULL DEFAULT '[]',
    "comment" TEXT NOT NULL DEFAULT '',
    "executedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ppr_calendar_object_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ppr_calendar_object_executions_entryId_idx" ON "ppr_calendar_object_executions"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "ppr_calendar_object_executions_entryId_objectId_key" ON "ppr_calendar_object_executions"("entryId", "objectId");

-- AddForeignKey
ALTER TABLE "ppr_calendar_object_executions" ADD CONSTRAINT "ppr_calendar_object_executions_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ppr_calendar_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
