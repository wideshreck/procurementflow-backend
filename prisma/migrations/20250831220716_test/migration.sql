/*
  Warnings:

  - You are about to drop the column `nodes` on the `Workflow` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."NodeType" AS ENUM ('PURCHASE_REQUEST', 'CONDITION_IF_ELSE', 'CONDITION_CASE', 'PERSON_APPROVAL', 'DEPARTMENT_APPROVAL', 'ROLE_APPROVAL', 'EMAIL_SEND', 'PARALLEL_FORK', 'PARALLEL_JOIN', 'PR_APPROVE', 'PR_REJECT');

-- CreateEnum
CREATE TYPE "public"."ApprovalPolicy" AS ENUM ('ALL', 'ANY', 'QUORUM');

-- CreateEnum
CREATE TYPE "public"."TimeoutBehavior" AS ENUM ('REJECT', 'ESCALATE', 'AUTO_APPROVE');

-- CreateEnum
CREATE TYPE "public"."JoinPolicy" AS ENUM ('ALL_APPROVE', 'ANY_APPROVE', 'FIRST_DECIDES');

-- AlterTable
ALTER TABLE "public"."Workflow" DROP COLUMN "nodes";

-- CreateTable
CREATE TABLE "public"."Node" (
    "id" TEXT NOT NULL,
    "type" "public"."NodeType" NOT NULL,
    "workflowId" TEXT NOT NULL,
    "department" TEXT,
    "operator" TEXT,
    "comparisonValue" DOUBLE PRECISION,
    "cases" TEXT[],
    "personId" TEXT,
    "departmentId" TEXT,
    "roleId" TEXT,
    "approvalPolicy" "public"."ApprovalPolicy",
    "timeout" INTEGER,
    "timeoutBehavior" "public"."TimeoutBehavior",
    "to" TEXT[],
    "cc" TEXT[],
    "bcc" TEXT[],
    "subject" TEXT,
    "body" TEXT,
    "retryCount" INTEGER,
    "retryBehavior" TEXT,
    "joinPolicy" "public"."JoinPolicy",

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Node" ADD CONSTRAINT "Node_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "public"."Workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
