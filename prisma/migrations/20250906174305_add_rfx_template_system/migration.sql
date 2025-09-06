-- CreateEnum
CREATE TYPE "public"."RFxType" AS ENUM ('RFQ', 'RFP', 'RFI');

-- CreateEnum
CREATE TYPE "public"."RFxStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED', 'AWARDED');

-- CreateEnum
CREATE TYPE "public"."BidStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "public"."RFxTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."RFxType" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "introductionSection" JSONB,
    "scopeSection" JSONB,
    "qualityStandards" JSONB,
    "paymentTerms" JSONB,
    "evaluationCriteria" JSONB,
    "termsAndConditions" JSONB,
    "submissionGuidelines" JSONB,
    "additionalSections" JSONB[],
    "tags" TEXT[],
    "createdById" TEXT,
    "lastModifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFxTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RFxDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "procurementRequestId" TEXT,
    "documentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."RFxType" NOT NULL,
    "status" "public"."RFxStatus" NOT NULL DEFAULT 'DRAFT',
    "publishDate" TIMESTAMP(3),
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "questionDeadline" TIMESTAMP(3),
    "awardDate" TIMESTAMP(3),
    "introductionSection" JSONB,
    "scopeSection" JSONB NOT NULL,
    "qualityStandards" JSONB NOT NULL,
    "paymentTerms" JSONB NOT NULL,
    "evaluationCriteria" JSONB NOT NULL,
    "termsAndConditions" JSONB,
    "submissionGuidelines" JSONB NOT NULL,
    "additionalSections" JSONB[],
    "collectedData" JSONB,
    "technicalSpecs" JSONB,
    "quantity" INTEGER,
    "estimatedBudget" MONEY,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "awardedBidId" TEXT,
    "tags" TEXT[],
    "auditLog" JSONB[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFxDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RFxInvitation" (
    "id" TEXT NOT NULL,
    "rfxDocumentId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "declineReason" TEXT,

    CONSTRAINT "RFxInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupplierBid" (
    "id" TEXT NOT NULL,
    "rfxDocumentId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "bidNumber" TEXT NOT NULL,
    "status" "public"."BidStatus" NOT NULL DEFAULT 'DRAFT',
    "coverLetter" TEXT,
    "technicalProposal" JSONB NOT NULL,
    "commercialProposal" JSONB NOT NULL,
    "totalPrice" MONEY NOT NULL,
    "unitPrices" JSONB,
    "currency" TEXT NOT NULL,
    "validityPeriod" INTEGER NOT NULL,
    "deliveryTerms" JSONB,
    "paymentTerms" JSONB,
    "warrantyTerms" JSONB,
    "technicalScore" DOUBLE PRECISION,
    "commercialScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "ranking" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BidEvaluation" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "rfxDocumentId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "technicalScore" DOUBLE PRECISION NOT NULL,
    "commercialScore" DOUBLE PRECISION NOT NULL,
    "qualityScore" DOUBLE PRECISION,
    "deliveryScore" DOUBLE PRECISION,
    "technicalWeight" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "commercialWeight" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "qualityWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "deliveryWeight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "weightedScore" DOUBLE PRECISION NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "generalComments" TEXT,
    "recommendation" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RFxAttachment" (
    "id" TEXT NOT NULL,
    "rfxDocumentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFxAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BidAttachment" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RFxTemplate_companyId_isActive_idx" ON "public"."RFxTemplate"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "RFxTemplate_type_idx" ON "public"."RFxTemplate"("type");

-- CreateIndex
CREATE UNIQUE INDEX "RFxTemplate_companyId_name_version_key" ON "public"."RFxTemplate"("companyId", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RFxDocument_documentNumber_key" ON "public"."RFxDocument"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RFxDocument_awardedBidId_key" ON "public"."RFxDocument"("awardedBidId");

-- CreateIndex
CREATE INDEX "RFxDocument_companyId_status_idx" ON "public"."RFxDocument"("companyId", "status");

-- CreateIndex
CREATE INDEX "RFxDocument_documentNumber_idx" ON "public"."RFxDocument"("documentNumber");

-- CreateIndex
CREATE INDEX "RFxDocument_submissionDeadline_idx" ON "public"."RFxDocument"("submissionDeadline");

-- CreateIndex
CREATE INDEX "RFxInvitation_supplierId_idx" ON "public"."RFxInvitation"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "RFxInvitation_rfxDocumentId_supplierId_key" ON "public"."RFxInvitation"("rfxDocumentId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBid_bidNumber_key" ON "public"."SupplierBid"("bidNumber");

-- CreateIndex
CREATE INDEX "SupplierBid_rfxDocumentId_status_idx" ON "public"."SupplierBid"("rfxDocumentId", "status");

-- CreateIndex
CREATE INDEX "SupplierBid_supplierId_idx" ON "public"."SupplierBid"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierBid_rfxDocumentId_supplierId_key" ON "public"."SupplierBid"("rfxDocumentId", "supplierId");

-- CreateIndex
CREATE INDEX "BidEvaluation_rfxDocumentId_idx" ON "public"."BidEvaluation"("rfxDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "BidEvaluation_bidId_evaluatorId_key" ON "public"."BidEvaluation"("bidId", "evaluatorId");

-- CreateIndex
CREATE INDEX "RFxAttachment_rfxDocumentId_idx" ON "public"."RFxAttachment"("rfxDocumentId");

-- CreateIndex
CREATE INDEX "BidAttachment_bidId_idx" ON "public"."BidAttachment"("bidId");

-- AddForeignKey
ALTER TABLE "public"."RFxTemplate" ADD CONSTRAINT "RFxTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFxDocument" ADD CONSTRAINT "RFxDocument_awardedBidId_fkey" FOREIGN KEY ("awardedBidId") REFERENCES "public"."SupplierBid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFxDocument" ADD CONSTRAINT "RFxDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFxDocument" ADD CONSTRAINT "RFxDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."RFxTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFxDocument" ADD CONSTRAINT "RFxDocument_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "public"."ProcurementRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFxInvitation" ADD CONSTRAINT "RFxInvitation_rfxDocumentId_fkey" FOREIGN KEY ("rfxDocumentId") REFERENCES "public"."RFxDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFxInvitation" ADD CONSTRAINT "RFxInvitation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplierBid" ADD CONSTRAINT "SupplierBid_rfxDocumentId_fkey" FOREIGN KEY ("rfxDocumentId") REFERENCES "public"."RFxDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplierBid" ADD CONSTRAINT "SupplierBid_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BidEvaluation" ADD CONSTRAINT "BidEvaluation_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "public"."SupplierBid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BidEvaluation" ADD CONSTRAINT "BidEvaluation_rfxDocumentId_fkey" FOREIGN KEY ("rfxDocumentId") REFERENCES "public"."RFxDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RFxAttachment" ADD CONSTRAINT "RFxAttachment_rfxDocumentId_fkey" FOREIGN KEY ("rfxDocumentId") REFERENCES "public"."RFxDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BidAttachment" ADD CONSTRAINT "BidAttachment_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "public"."SupplierBid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
