-- AlterTable
ALTER TABLE "applications" ADD COLUMN "applicationNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "applications_applicationNumber_key" ON "applications"("applicationNumber");
