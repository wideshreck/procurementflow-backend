/*
  Warnings:

  - The values [RUNNING,FAILED] on the enum `WorkflowStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `workflowId` on the `ProcurementRequest` table. All the data in the column will be lost.
  - You are about to drop the column `context` on the `WorkflowInstance` table. All the data in the column will be lost.
  - You are about to drop the `ApprovalWorkflow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NodeInstance` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."WorkflowStatus_new" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED');
ALTER TABLE "public"."WorkflowInstance" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."WorkflowInstance" ALTER COLUMN "status" TYPE "public"."WorkflowStatus_new" USING ("status"::text::"public"."WorkflowStatus_new");
ALTER TYPE "public"."WorkflowStatus" RENAME TO "WorkflowStatus_old";
ALTER TYPE "public"."WorkflowStatus_new" RENAME TO "WorkflowStatus";
DROP TYPE "public"."WorkflowStatus_old";
ALTER TABLE "public"."WorkflowInstance" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."ApprovalWorkflow" DROP CONSTRAINT "ApprovalWorkflow_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NodeInstance" DROP CONSTRAINT "NodeInstance_workflowInstanceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProcurementRequest" DROP CONSTRAINT "ProcurementRequest_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "public"."WorkflowInstance" DROP CONSTRAINT "WorkflowInstance_workflowId_fkey";

-- DropIndex
DROP INDEX "public"."ProcurementRequest_workflowId_idx";

-- AlterTable
ALTER TABLE "public"."ProcurementRequest" DROP COLUMN "workflowId";

-- AlterTable
ALTER TABLE "public"."WorkflowInstance" DROP COLUMN "context",
ADD COLUMN     "currentState" JSONB,
ADD COLUMN     "history" JSONB[],
ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- DropTable
DROP TABLE "public"."ApprovalWorkflow";

-- DropTable
DROP TABLE "public"."NodeInstance";

-- DropEnum
DROP TYPE "public"."NodeStatus";

-- CreateTable
CREATE TABLE "public"."Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workflow_companyId_idx" ON "public"."Workflow"("companyId");

-- AddForeignKey
ALTER TABLE "public"."Workflow" ADD CONSTRAINT "Workflow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
