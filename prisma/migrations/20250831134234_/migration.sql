/*
  Warnings:

  - A unique constraint covering the columns `[companyId,name,ParentCategoryID]` on the table `Category` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Category_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Category_companyId_name_ParentCategoryID_key" ON "public"."Category"("companyId", "name", "ParentCategoryID");
