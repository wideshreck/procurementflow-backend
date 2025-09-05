/*
  Warnings:

  - You are about to drop the column `emailVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerifiedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `EmailVerificationToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TwoFactorAuth` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."EmailVerificationToken" DROP CONSTRAINT "EmailVerificationToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TwoFactorAuth" DROP CONSTRAINT "TwoFactorAuth_userId_fkey";

-- DropIndex
DROP INDEX "public"."User_isActive_emailVerified_idx";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "emailVerified",
DROP COLUMN "emailVerifiedAt";

-- DropTable
DROP TABLE "public"."EmailVerificationToken";

-- DropTable
DROP TABLE "public"."TwoFactorAuth";
