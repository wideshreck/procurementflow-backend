/*
  Warnings:

  - Added the required column `company` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "company" TEXT NOT NULL,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "role_title" TEXT;
