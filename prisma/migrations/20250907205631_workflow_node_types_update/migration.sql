/*
  Warnings:

  - The values [EMAIL_NOTIFICATION,FORM] on the enum `WorkflowNodeType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."ParallelJoinStrategy" AS ENUM ('ANY', 'ALL');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."WorkflowNodeType_new" AS ENUM ('PROCUREMENT_REQUEST', 'APPROVE', 'REJECT', 'CONDITION_IF', 'CONDITION_SWITCH', 'PARALLEL_FORK', 'PARALLEL_JOIN', 'PERSON_APPROVAL', 'DEPARTMENT_APPROVAL');
ALTER TABLE "public"."WorkflowNode" ALTER COLUMN "type" TYPE "public"."WorkflowNodeType_new" USING ("type"::text::"public"."WorkflowNodeType_new");
ALTER TYPE "public"."WorkflowNodeType" RENAME TO "WorkflowNodeType_old";
ALTER TYPE "public"."WorkflowNodeType_new" RENAME TO "WorkflowNodeType";
DROP TYPE "public"."WorkflowNodeType_old";
COMMIT;
