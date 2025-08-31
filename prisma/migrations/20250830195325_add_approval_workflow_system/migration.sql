-- CreateEnum
CREATE TYPE "public"."WorkflowStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."NodeStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'WAITING_FOR_APPROVAL');

-- AlterTable
ALTER TABLE "public"."ProcurementRequest" ADD COLUMN     "workflowId" TEXT;

-- CreateTable
CREATE TABLE "public"."ApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkflowInstance" (
    "id" TEXT NOT NULL,
    "procurementRequestId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "public"."WorkflowStatus" NOT NULL DEFAULT 'RUNNING',
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NodeInstance" (
    "id" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" "public"."NodeStatus" NOT NULL DEFAULT 'PENDING',
    "context" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "NodeInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_companyId_idx" ON "public"."ApprovalWorkflow"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowInstance_procurementRequestId_key" ON "public"."WorkflowInstance"("procurementRequestId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_procurementRequestId_idx" ON "public"."WorkflowInstance"("procurementRequestId");

-- CreateIndex
CREATE INDEX "WorkflowInstance_workflowId_idx" ON "public"."WorkflowInstance"("workflowId");

-- CreateIndex
CREATE INDEX "NodeInstance_workflowInstanceId_idx" ON "public"."NodeInstance"("workflowInstanceId");

-- CreateIndex
CREATE INDEX "ProcurementRequest_workflowId_idx" ON "public"."ProcurementRequest"("workflowId");

-- AddForeignKey
ALTER TABLE "public"."ApprovalWorkflow" ADD CONSTRAINT "ApprovalWorkflow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_procurementRequestId_fkey" FOREIGN KEY ("procurementRequestId") REFERENCES "public"."ProcurementRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."ApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NodeInstance" ADD CONSTRAINT "NodeInstance_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "public"."WorkflowInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."ApprovalWorkflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
