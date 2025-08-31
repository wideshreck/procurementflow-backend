-- CreateEnum
CREATE TYPE "public"."ProcurementPhase" AS ENUM ('IDENTIFICATION', 'SPECIFICATION', 'FINALIZATION');

-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "collectedData" JSONB,
ADD COLUMN     "phase" "public"."ProcurementPhase" NOT NULL DEFAULT 'IDENTIFICATION';

-- CreateIndex
CREATE INDEX "Conversation_userId_status_idx" ON "public"."Conversation"("userId", "status");
