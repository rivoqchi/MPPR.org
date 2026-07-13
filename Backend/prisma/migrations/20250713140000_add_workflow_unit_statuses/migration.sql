ALTER TABLE "applications"
ADD COLUMN "workflowUnitStatuses" JSONB NOT NULL DEFAULT '[]';
