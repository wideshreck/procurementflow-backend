/*
  Warnings:

  - You are about to drop the column `city` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Supplier` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Supplier" DROP COLUMN "city",
DROP COLUMN "country";
