-- CreateEnum
CREATE TYPE "ScheduleImportStatus" AS ENUM ('PROCESSING', 'READY_FOR_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "ExtractedTagStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ScheduleImport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "ScheduleImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedTag" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "description" TEXT,
    "pageNumber" INTEGER,
    "status" "ExtractedTagStatus" NOT NULL DEFAULT 'PENDING',
    "materialItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractedTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduleImport_projectId_idx" ON "ScheduleImport"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractedTag_materialItemId_key" ON "ExtractedTag"("materialItemId");

-- CreateIndex
CREATE INDEX "ExtractedTag_importId_idx" ON "ExtractedTag"("importId");

-- CreateIndex
CREATE INDEX "ExtractedTag_status_idx" ON "ExtractedTag"("status");

-- AddForeignKey
ALTER TABLE "ScheduleImport" ADD CONSTRAINT "ScheduleImport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleImport" ADD CONSTRAINT "ScheduleImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedTag" ADD CONSTRAINT "ExtractedTag_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ScheduleImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedTag" ADD CONSTRAINT "ExtractedTag_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
