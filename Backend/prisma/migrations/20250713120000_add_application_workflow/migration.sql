ALTER TABLE "applications"
ADD COLUMN "workflowStatus" TEXT NOT NULL DEFAULT 'in_progress_work',
ADD COLUMN "confirmationFiles" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "application_workflow_messages" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorFirstName" TEXT,
    "authorLastName" TEXT,
    "authorStructuralUnitId" TEXT,
    "content" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_workflow_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_workflow_messages_applicationId_createdAt_idx"
ON "application_workflow_messages"("applicationId", "createdAt");

ALTER TABLE "application_workflow_messages"
ADD CONSTRAINT "application_workflow_messages_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
