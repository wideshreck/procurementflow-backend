-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "finalAttributes" JSONB,
ADD COLUMN     "finalCategoryCode" TEXT,
ADD COLUMN     "finalSubcategoryCode" TEXT,
ADD COLUMN     "finalTitle" TEXT;
