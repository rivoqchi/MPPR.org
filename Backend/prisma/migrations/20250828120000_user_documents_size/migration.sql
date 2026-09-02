ALTER TABLE "user_documents" ADD COLUMN "size" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_documents" ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream';
