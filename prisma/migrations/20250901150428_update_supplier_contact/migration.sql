/*
  Warnings:

  - You are about to drop the column `address` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `Supplier` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `Workflow` table. All the data in the column will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Task" DROP CONSTRAINT "Task_workflowInstanceId_fkey";

-- AlterTable
ALTER TABLE "public"."Supplier" DROP COLUMN "address",
DROP COLUMN "website",
ADD COLUMN     "contactPersonName" TEXT;

-- AlterTable
ALTER TABLE "public"."Workflow" DROP COLUMN "department";

-- DropTable
DROP TABLE "public"."Task";

-- DropEnum
DROP TYPE "public"."TaskStatus";

-- DropEnum
DROP TYPE "public"."TaskType";
