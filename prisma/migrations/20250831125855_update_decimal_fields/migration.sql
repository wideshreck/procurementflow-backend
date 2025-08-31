/*
  Warnings:

  - The `totalPrice` column on the `ProcurementRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `unitPrice` column on the `ProcurementRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `rating` on the `Supplier` table. The data in that column could be lost. The data in that column will be cast from `Real` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "public"."ProcurementRequest" DROP COLUMN "totalPrice",
ADD COLUMN     "totalPrice" MONEY NOT NULL DEFAULT 0,
DROP COLUMN "unitPrice",
ADD COLUMN     "unitPrice" MONEY NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Supplier" ALTER COLUMN "rating" SET DATA TYPE DECIMAL(65,30);
