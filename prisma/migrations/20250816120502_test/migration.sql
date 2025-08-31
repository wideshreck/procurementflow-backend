/*
  Warnings:

  - You are about to drop the column `collectedData` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `finalAttributes` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `finalCategoryCode` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `finalSubcategoryCode` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `finalTitle` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `phase` on the `Conversation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Conversation_userId_status_idx";

-- DropIndex
DROP INDEX "public"."Message_conversationId_idx";

-- AlterTable
ALTER TABLE "public"."Conversation" DROP COLUMN "collectedData",
DROP COLUMN "completedAt",
DROP COLUMN "finalAttributes",
DROP COLUMN "finalCategoryCode",
DROP COLUMN "finalSubcategoryCode",
DROP COLUMN "finalTitle",
DROP COLUMN "phase";

-- DropEnum
DROP TYPE "public"."ProcurementPhase";
