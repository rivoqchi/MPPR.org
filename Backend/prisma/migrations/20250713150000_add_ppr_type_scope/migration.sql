ALTER TABLE "ppr_types" ADD COLUMN "structuralUnitId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ppr_types" ADD COLUMN "scopeType" TEXT NOT NULL DEFAULT 'structure';
ALTER TABLE "ppr_types" ADD COLUMN "sectionId" TEXT NOT NULL DEFAULT '';

UPDATE "ppr_types" AS pt
SET
  "structuralUnitId" = u."structuralUnitId",
  "scopeType" = CASE WHEN u."withoutSectionAccess" THEN 'structure' ELSE 'section' END,
  "sectionId" = CASE WHEN u."withoutSectionAccess" THEN '' ELSE COALESCE(u."structuralUnitSectionId", '') END
FROM "users" AS u
WHERE pt."createdByUserId" = u.id;

CREATE INDEX "ppr_types_structuralUnitId_scopeType_sectionId_idx" ON "ppr_types"("structuralUnitId", "scopeType", "sectionId");
