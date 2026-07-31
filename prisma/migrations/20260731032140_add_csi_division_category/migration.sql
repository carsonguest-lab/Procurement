-- AlterTable
ALTER TABLE "MaterialItem" ADD COLUMN     "category" TEXT,
ADD COLUMN     "csiDivisionCode" TEXT,
ADD COLUMN     "subcategory" TEXT;

-- CreateIndex
CREATE INDEX "MaterialItem_csiDivisionCode_idx" ON "MaterialItem"("csiDivisionCode");
