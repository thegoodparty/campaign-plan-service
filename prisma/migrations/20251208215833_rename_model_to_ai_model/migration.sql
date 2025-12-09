/*
  Warnings:

  - You are about to drop the column `model` on the `campaign_plans` table. All the data in the column will be lost.
  - Added the required column `ai_model` to the `campaign_plans` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "campaign_plans" DROP COLUMN "model",
ADD COLUMN     "ai_model" TEXT NOT NULL;
