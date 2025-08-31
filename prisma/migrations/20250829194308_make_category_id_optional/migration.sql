-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_CategoryID_fkey";

-- DropForeignKey
ALTER TABLE "public"."Service" DROP CONSTRAINT "Service_CategoryID_fkey";

-- AlterTable
ALTER TABLE "public"."Product" ALTER COLUMN "CategoryID" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Service" ALTER COLUMN "CategoryID" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "public"."Category"("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_CategoryID_fkey" FOREIGN KEY ("CategoryID") REFERENCES "public"."Category"("CategoryID") ON DELETE SET NULL ON UPDATE CASCADE;
