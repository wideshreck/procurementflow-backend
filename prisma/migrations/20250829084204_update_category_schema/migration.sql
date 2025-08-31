/*
  Warnings:

  - The primary key for the `Category` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `parentId` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Service` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[categoryCode]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - The required column `CategoryID` was added to the `Category` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `categoryCode` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `CategoryID` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `CategoryID` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Category" DROP CONSTRAINT "Category_parentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Service" DROP CONSTRAINT "Service_categoryId_fkey";

-- DropIndex
DROP INDEX "public"."Category_parentId_idx";

-- DropIndex
DROP INDEX "public"."Product_categoryId_idx";

-- DropIndex
DROP INDEX "public"."Service_categoryId_idx";

-- AlterTable
ALTER TABLE "public"."Category" DROP CONSTRAINT "Category_pkey",
DROP COLUMN "id",
DROP COLUMN "parentId",
ADD COLUMN     "CategoryID" TEXT NOT NULL,
ADD COLUMN     "ParentCategoryID" TEXT,
ADD COLUMN     "categoryCode" TEXT NOT NULL,
ADD CONSTRAINT "Category_pkey" PRIMARY KEY ("CategoryID");

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "categoryId",
ADD COLUMN     "CategoryID" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."Service" DROP COLUMN "categoryId",
ADD COLUMN     "CategoryID" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Category_categoryCode_key" ON "public"."Category"("categoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE INDEX "Category_ParentCategoryID_idx" ON "public"."Category"("ParentCategoryID");

-- CreateIndex
CREATE INDEX "Product_CategoryID_idx" ON "public"."Product"("CategoryID");

-- CreateIndex
CREATE INDEX "Service_CategoryID_idx" ON "public"."Service"("CategoryID");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "public"."Category"("CategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "public"."Category"("CategoryID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_ParentCategoryID_fkey" FOREIGN KEY ("ParentCategoryID") REFERENCES "public"."Category"("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE;
