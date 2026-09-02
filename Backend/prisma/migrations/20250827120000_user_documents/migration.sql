-- CreateTable
CREATE TABLE "user_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "documentKey" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_documents_storageKey_key" ON "user_documents"("storageKey");

-- CreateIndex
CREATE INDEX "user_documents_createdById_idx" ON "user_documents"("createdById");

-- AddForeignKey
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
