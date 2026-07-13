CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "code" TEXT,
    "message" TEXT NOT NULL,
    "hint" TEXT,
    "route" TEXT,
    "apiPath" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "stack" TEXT,
    "userId" TEXT,
    "userFullName" TEXT,
    "userPhone" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "error_logs_createdAt_idx" ON "error_logs"("createdAt");
CREATE INDEX "error_logs_source_idx" ON "error_logs"("source");
CREATE INDEX "error_logs_severity_idx" ON "error_logs"("severity");
CREATE INDEX "error_logs_userId_idx" ON "error_logs"("userId");

ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
