-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "structuralUnitIds" JSONB NOT NULL DEFAULT '[]',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "deadline" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "files" JSONB NOT NULL DEFAULT '[]',
    "comment" TEXT NOT NULL DEFAULT '',
    "specialMessages" JSONB NOT NULL DEFAULT '[]',
    "createdByUserId" TEXT NOT NULL,
    "createdByFirstName" TEXT,
    "createdByLastName" TEXT,
    "createdByStructuralUnitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "applications_createdByUserId_idx" ON "applications"("createdByUserId");
