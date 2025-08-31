/*
  Warnings:

  - You are about to drop the column `contactEmail` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `contactPerson` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `taxNumber` on the `Supplier` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Supplier_taxNumber_idx";

-- DropIndex
DROP INDEX "public"."Supplier_taxNumber_key";

-- AlterTable
ALTER TABLE "public"."Supplier" DROP COLUMN "contactEmail",
DROP COLUMN "contactPerson",
DROP COLUMN "contactPhone",
DROP COLUMN "taxNumber",
ADD COLUMN     "taxInfo" JSONB,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."AuthorizedPerson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorizedPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupplierDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorizedPerson_supplierId_idx" ON "public"."AuthorizedPerson"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierDocument_supplierId_idx" ON "public"."SupplierDocument"("supplierId");

-- AddForeignKey
ALTER TABLE "public"."AuthorizedPerson" ADD CONSTRAINT "AuthorizedPerson_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplierDocument" ADD CONSTRAINT "SupplierDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
