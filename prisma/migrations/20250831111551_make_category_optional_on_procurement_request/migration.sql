-- DropForeignKey
ALTER TABLE "public"."ProcurementRequest" DROP CONSTRAINT "ProcurementRequest_categoryId_fkey";

-- AlterTable
ALTER TABLE "public"."ProcurementRequest" ALTER COLUMN "categoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE;
