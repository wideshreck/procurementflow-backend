-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."Urgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "public"."ProcurementRequest" (
    "id" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "uom" TEXT NOT NULL,
    "simpleDefinition" TEXT NOT NULL,
    "procurementType" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "auditTrail" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProcurementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TechnicalSpecification" (
    "id" TEXT NOT NULL,
    "specKey" TEXT NOT NULL,
    "specValue" TEXT NOT NULL,
    "requirementLevel" TEXT NOT NULL,
    "notes" TEXT,
    "procurementRequestId" TEXT NOT NULL,

    CONSTRAINT "TechnicalSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeliveryDetail" (
    "id" TEXT NOT NULL,
    "deliveryLocation" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "urgency" "public"."Urgency" NOT NULL,
    "additionalNotes" TEXT,
    "procurementRequestId" TEXT NOT NULL,

    CONSTRAINT "DeliveryDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcurementRequest_categoryId_idx" ON "public"."ProcurementRequest"("categoryId");

-- CreateIndex
CREATE INDEX "TechnicalSpecification_procurementRequestId_idx" ON "public"."TechnicalSpecification"("procurementRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryDetail_procurementRequestId_key" ON "public"."DeliveryDetail"("procurementRequestId");

-- AddForeignKey
ALTER TABLE "public"."ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("CategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TechnicalSpecification" ADD CONSTRAINT "TechnicalSpecification_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "public"."ProcurementRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliveryDetail" ADD CONSTRAINT "DeliveryDetail_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "public"."ProcurementRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
