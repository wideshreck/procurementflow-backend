/*
  Warnings:

  - The `permissions` column on the `CustomRole` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."CustomRole" DROP COLUMN "permissions",
ADD COLUMN     "permissions" TEXT[];
