ALTER TABLE "applications"
ADD COLUMN "submissionMode" TEXT NOT NULL DEFAULT 'combined';

ALTER TABLE "applications"
ADD COLUMN "structuralUnitSectionId" TEXT;
