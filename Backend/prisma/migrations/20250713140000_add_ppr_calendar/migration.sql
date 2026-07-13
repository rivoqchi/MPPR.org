-- CreateTable
CREATE TABLE "ppr_calendar_months" (
    "id" TEXT NOT NULL,
    "structuralUnitId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL DEFAULT '',
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ppr_calendar_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppr_calendar_entries" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "pprTypeId" TEXT NOT NULL,
    "objectIds" JSONB NOT NULL DEFAULT '[]',
    "scopeType" TEXT NOT NULL,
    "sectionId" TEXT,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ppr_calendar_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ppr_calendar_months_structuralUnitId_status_idx" ON "ppr_calendar_months"("structuralUnitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ppr_calendar_months_structuralUnitId_sectionId_year_month_key" ON "ppr_calendar_months"("structuralUnitId", "sectionId", "year", "month");

-- CreateIndex
CREATE INDEX "ppr_calendar_entries_monthId_date_idx" ON "ppr_calendar_entries"("monthId", "date");

-- AddForeignKey
ALTER TABLE "ppr_calendar_entries" ADD CONSTRAINT "ppr_calendar_entries_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "ppr_calendar_months"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppr_calendar_entries" ADD CONSTRAINT "ppr_calendar_entries_pprTypeId_fkey" FOREIGN KEY ("pprTypeId") REFERENCES "ppr_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
