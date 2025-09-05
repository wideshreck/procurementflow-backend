/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "role",
ADD COLUMN     "customRoleId" TEXT;

-- DropEnum
DROP TYPE "public"."Role";

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "public"."CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
