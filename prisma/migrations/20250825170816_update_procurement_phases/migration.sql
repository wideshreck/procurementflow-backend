/*
  Warnings:

  - The values [SPECIFICATION,FINALIZATION] on the enum `ProcurementPhase` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ProcurementPhase_new" AS ENUM ('IDENTIFICATION', 'SUGGESTIONS', 'SPECS', 'SUPPLIER_PRODUCT_SUGGESTIONS', 'FINAL');
ALTER TABLE "public"."Conversation" ALTER COLUMN "phase" DROP DEFAULT;
ALTER TABLE "public"."Conversation" ALTER COLUMN "phase" TYPE "public"."ProcurementPhase_new" USING ("phase"::text::"public"."ProcurementPhase_new");
ALTER TYPE "public"."ProcurementPhase" RENAME TO "ProcurementPhase_old";
ALTER TYPE "public"."ProcurementPhase_new" RENAME TO "ProcurementPhase";
DROP TYPE "public"."ProcurementPhase_old";
ALTER TABLE "public"."Conversation" ALTER COLUMN "phase" SET DEFAULT 'IDENTIFICATION';
COMMIT;
