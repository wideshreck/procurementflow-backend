/*
  Warnings:

  - You are about to drop the column `edges` on the `Workflow` table. All the data in the column will be lost.
  - You are about to drop the column `nodes` on the `Workflow` table. All the data in the column will be lost.
  - Added the required column `createdBy` to the `Workflow` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."WorkflowNodeType" AS ENUM ('PROCUREMENT_REQUEST', 'APPROVE', 'REJECT', 'CONDITION_IF', 'CONDITION_SWITCH', 'PARALLEL_FORK', 'PARALLEL_JOIN', 'PERSON_APPROVAL', 'DEPARTMENT_APPROVAL', 'EMAIL_NOTIFICATION', 'FORM');

-- CreateEnum
CREATE TYPE "public"."EdgeDataType" AS ENUM ('NUMBER', 'STRING', 'BOOLEAN', 'ANY');

-- CreateEnum
CREATE TYPE "public"."ExecutionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ApprovalDecision" AS ENUM ('APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'ADMIN');

-- AlterEnum
ALTER TYPE "public"."WorkflowStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "public"."Workflow" DROP COLUMN "edges",
DROP COLUMN "nodes",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "public"."WorkflowInstance" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "currentNodeId" TEXT;

-- CreateTable
CREATE TABLE "public"."TwoFactorAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkflowNode" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" "public"."WorkflowNodeType" NOT NULL,
    "label" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "WorkflowNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkflowEdge" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "edgeId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sourceHandle" TEXT,
    "targetHandle" TEXT,
    "label" TEXT,
    "dataType" "public"."EdgeDataType" NOT NULL DEFAULT 'ANY',

    CONSTRAINT "WorkflowEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkflowExecution" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "status" "public"."ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "output" JSONB,
    "error" TEXT,

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkflowApproval" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "public"."ApprovalDecision",
    "comments" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorAuth_userId_key" ON "public"."TwoFactorAuth"("userId");

-- CreateIndex
CREATE INDEX "WorkflowNode_workflowId_idx" ON "public"."WorkflowNode"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowNode_type_idx" ON "public"."WorkflowNode"("type");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowNode_workflowId_nodeId_key" ON "public"."WorkflowNode"("workflowId", "nodeId");

-- CreateIndex
CREATE INDEX "WorkflowEdge_workflowId_idx" ON "public"."WorkflowEdge"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowEdge_sourceId_idx" ON "public"."WorkflowEdge"("sourceId");

-- CreateIndex
CREATE INDEX "WorkflowEdge_targetId_idx" ON "public"."WorkflowEdge"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowEdge_workflowId_edgeId_key" ON "public"."WorkflowEdge"("workflowId", "edgeId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_instanceId_idx" ON "public"."WorkflowExecution"("instanceId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_nodeId_idx" ON "public"."WorkflowExecution"("workflowId", "nodeId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_status_idx" ON "public"."WorkflowExecution"("status");

-- CreateIndex
CREATE INDEX "WorkflowApproval_instanceId_idx" ON "public"."WorkflowApproval"("instanceId");

-- CreateIndex
CREATE INDEX "WorkflowApproval_approverId_idx" ON "public"."WorkflowApproval"("approverId");

-- CreateIndex
CREATE INDEX "WorkflowApproval_status_idx" ON "public"."WorkflowApproval"("status");

-- CreateIndex
CREATE INDEX "WorkflowApproval_workflowId_nodeId_idx" ON "public"."WorkflowApproval"("workflowId", "nodeId");

-- CreateIndex
CREATE INDEX "Workflow_departmentId_idx" ON "public"."Workflow"("departmentId");

-- CreateIndex
CREATE INDEX "Workflow_isActive_idx" ON "public"."Workflow"("isActive");

-- CreateIndex
CREATE INDEX "WorkflowInstance_status_idx" ON "public"."WorkflowInstance"("status");

-- AddForeignKey
ALTER TABLE "public"."TwoFactorAuth" ADD CONSTRAINT "TwoFactorAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Workflow" ADD CONSTRAINT "Workflow_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Workflow" ADD CONSTRAINT "Workflow_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowNode" ADD CONSTRAINT "WorkflowNode_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_workflowId_sourceId_fkey" FOREIGN KEY ("workflowId", "sourceId") REFERENCES "public"."WorkflowNode"("workflowId", "nodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowEdge" ADD CONSTRAINT "WorkflowEdge_workflowId_targetId_fkey" FOREIGN KEY ("workflowId", "targetId") REFERENCES "public"."WorkflowNode"("workflowId", "nodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_nodeId_fkey" FOREIGN KEY ("workflowId", "nodeId") REFERENCES "public"."WorkflowNode"("workflowId", "nodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowApproval" ADD CONSTRAINT "WorkflowApproval_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "public"."WorkflowInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowApproval" ADD CONSTRAINT "WorkflowApproval_workflowId_nodeId_fkey" FOREIGN KEY ("workflowId", "nodeId") REFERENCES "public"."WorkflowNode"("workflowId", "nodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkflowApproval" ADD CONSTRAINT "WorkflowApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
