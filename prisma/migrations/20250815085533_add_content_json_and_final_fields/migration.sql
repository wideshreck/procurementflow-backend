-- AlterTable
ALTER TABLE "public"."Conversation" ALTER COLUMN "status" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "public"."Message"("conversationId");
