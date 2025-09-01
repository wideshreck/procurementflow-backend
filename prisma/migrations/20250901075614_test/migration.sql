/*
  Warnings:

  - You are about to drop the `Node` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `nodes` to the `Workflow` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Node" DROP CONSTRAINT "Node_workflowId_fkey";

-- AlterTable
ALTER TABLE "public"."Workflow" ADD COLUMN     "nodes" JSONB NOT NULL;

-- DropTable
DROP TABLE "public"."Node";

-- DropEnum
DROP TYPE "public"."ApprovalPolicy";

-- DropEnum
DROP TYPE "public"."JoinPolicy";

-- DropEnum
DROP TYPE "public"."NodeType";

-- DropEnum
DROP TYPE "public"."TimeoutBehavior";
