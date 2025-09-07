/*
  Warnings:

  - You are about to drop the column `purchaseFrequency` on the `ProcurementRequest` table. All the data in the column will be lost.
  - You are about to drop the `BidAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BidEvaluation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RFxAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RFxDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RFxInvitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RFxTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupplierBid` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `createdById` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."BidAttachment" DROP CONSTRAINT "BidAttachment_bidId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BidEvaluation" DROP CONSTRAINT "BidEvaluation_bidId_fkey";

-- DropForeignKey
ALTER TABLE "public"."BidEvaluation" DROP CONSTRAINT "BidEvaluation_rfxDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Department" DROP CONSTRAINT "Department_managerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RFxAttachment" DROP CONSTRAINT "RFxAttachment_rfxDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RFxDocument" DROP CONSTRAINT "RFxDocument_awardedBidId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RFxDocument" DROP CONSTRAINT "RFxDocument_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RFxDocument" DROP CONSTRAINT "RFxDocument_procurementRequestId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RFxDocument" DROP CONSTRAINT "RFxDocument_templateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RFxInvitation" DROP CONSTRAINT "RFxInvitation_rfxDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RFxInvitation" DROP CONSTRAINT "RFxInvitation_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RFxTemplate" DROP CONSTRAINT "RFxTemplate_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SupplierBid" DROP CONSTRAINT "SupplierBid_rfxDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SupplierBid" DROP CONSTRAINT "SupplierBid_supplierId_fkey";

-- AlterTable
ALTER TABLE "public"."Department" ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "updatedById" TEXT,
ALTER COLUMN "managerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."ProcurementRequest" DROP COLUMN "purchaseFrequency";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "locationId" TEXT;

-- DropTable
DROP TABLE "public"."BidAttachment";

-- DropTable
DROP TABLE "public"."BidEvaluation";

-- DropTable
DROP TABLE "public"."RFxAttachment";

-- DropTable
DROP TABLE "public"."RFxDocument";

-- DropTable
DROP TABLE "public"."RFxInvitation";

-- DropTable
DROP TABLE "public"."RFxTemplate";

-- DropTable
DROP TABLE "public"."SupplierBid";

-- DropEnum
DROP TYPE "public"."BidStatus";

-- DropEnum
DROP TYPE "public"."RFxStatus";

-- DropEnum
DROP TYPE "public"."RFxType";

-- CreateIndex
CREATE INDEX "Department_createdById_idx" ON "public"."Department"("createdById");

-- CreateIndex
CREATE INDEX "Department_updatedById_idx" ON "public"."Department"("updatedById");

-- CreateIndex
CREATE INDEX "User_locationId_idx" ON "public"."User"("locationId");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Department" ADD CONSTRAINT "Department_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
