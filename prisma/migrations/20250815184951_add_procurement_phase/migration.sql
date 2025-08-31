-- CreateEnum
CREATE TYPE "public"."ProcurementPhase" AS ENUM ('IDENTIFICATION', 'SPECIFICATION', 'FINALIZATION');

-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "collectedData" JSONB,
ADD COLUMN     "phase" "public"."ProcurementPhase" NOT NULL DEFAULT 'IDENTIFICATION';

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
