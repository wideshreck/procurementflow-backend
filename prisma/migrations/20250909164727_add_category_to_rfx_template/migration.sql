/*
  Warnings:

  - You are about to drop the column `additionalSections` on the `RFxDocument` table. All the data in the column will be lost.
  - You are about to drop the column `evaluationCriteria` on the `RFxDocument` table. All the data in the column will be lost.
  - You are about to drop the column `introductionSection` on the `RFxDocument` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTerms` on the `RFxDocument` table. All the data in the column will be lost.
  - You are about to drop the column `qualityStandards` on the `RFxDocument` table. All the data in the column will be lost.
  - You are about to drop the column `scopeSection` on the `RFxDocument` table. All the data in the column will be lost.
  - You are about to drop the column `submissionGuidelines` on the `RFxDocument` table. All the data in the column will be lost.
  - You are about to drop the column `termsAndConditions` on the `RFxDocument` table. All the data in the column will be lost.
  - You are about to drop the column `additionalSections` on the `RFxTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `introductionSection` on the `RFxTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTerms` on the `RFxTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `qualityStandards` on the `RFxTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `scopeSection` on the `RFxTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `submissionGuidelines` on the `RFxTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `termsAndConditions` on the `RFxTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."RFxDocument" DROP COLUMN "additionalSections",
DROP COLUMN "evaluationCriteria",
DROP COLUMN "introductionSection",
DROP COLUMN "paymentTerms",
DROP COLUMN "qualityStandards",
DROP COLUMN "scopeSection",
DROP COLUMN "submissionGuidelines",
DROP COLUMN "termsAndConditions",
ADD COLUMN     "basicInfoData" JSONB,
ADD COLUMN     "commercialData" JSONB,
ADD COLUMN     "customSectionsData" JSONB[],
ADD COLUMN     "evaluationData" JSONB,
ADD COLUMN     "introductionData" JSONB,
ADD COLUMN     "scheduleData" JSONB,
ADD COLUMN     "technicalData" JSONB;

-- AlterTable
ALTER TABLE "public"."RFxTemplate" DROP COLUMN "additionalSections",
DROP COLUMN "introductionSection",
DROP COLUMN "paymentTerms",
DROP COLUMN "qualityStandards",
DROP COLUMN "scopeSection",
DROP COLUMN "submissionGuidelines",
DROP COLUMN "termsAndConditions",
ADD COLUMN     "basicInfo" JSONB,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "commercialTerms" JSONB,
ADD COLUMN     "customSections" JSONB[],
ADD COLUMN     "introductionAndSummary" JSONB,
ADD COLUMN     "scheduleAndProcedures" JSONB,
ADD COLUMN     "technicalRequirements" JSONB;

-- CreateIndex
CREATE INDEX "RFxTemplate_categoryId_idx" ON "public"."RFxTemplate"("categoryId");

-- AddForeignKey
ALTER TABLE "public"."RFxTemplate" ADD CONSTRAINT "RFxTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE;
