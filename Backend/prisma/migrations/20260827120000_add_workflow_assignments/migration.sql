-- AlterTable
ALTER TABLE "applications" ADD COLUMN "workflowAssignments" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "application_workflow_messages" ADD COLUMN "assignmentId" TEXT;
ALTER TABLE "application_workflow_messages" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
