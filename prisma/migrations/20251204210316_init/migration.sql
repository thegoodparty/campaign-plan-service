-- CreateEnum
CREATE TYPE "CampaignPlanTaskType" AS ENUM ('text', 'robocall', 'doorKnocking', 'phoneBanking', 'socialMedia', 'events', 'education');

-- CreateEnum
CREATE TYPE "CampaignPlanTaskStatus" AS ENUM ('notStarted', 'complete');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "campaign_plan_sections" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "campaign_plan_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_plan_tasks" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "type" "CampaignPlanTaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "due_date" DATE,
    "week_index" INTEGER,
    "status" "CampaignPlanTaskStatus" NOT NULL DEFAULT 'notStarted',
    "action_url" TEXT,
    "priority" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "campaign_plan_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_plans" (
    "id" UUID NOT NULL,
    "campaign_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'queued',
    "idempotency_key" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "cost_json" JSONB,
    "source_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,

    CONSTRAINT "campaign_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_plan_sections_plan_id_order_index_idx" ON "campaign_plan_sections"("plan_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_plan_sections_plan_id_key_key" ON "campaign_plan_sections"("plan_id", "key");

-- CreateIndex
CREATE INDEX "campaign_plan_tasks_plan_id_idx" ON "campaign_plan_tasks"("plan_id");

-- CreateIndex
CREATE INDEX "campaign_plan_tasks_due_date_idx" ON "campaign_plan_tasks"("due_date");

-- CreateIndex
CREATE INDEX "campaign_plan_tasks_type_idx" ON "campaign_plan_tasks"("type");

-- CreateIndex
CREATE INDEX "campaign_plan_tasks_status_idx" ON "campaign_plan_tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_plans_idempotency_key_key" ON "campaign_plans"("idempotency_key");

-- CreateIndex
CREATE INDEX "campaign_plans_campaign_id_version_idx" ON "campaign_plans"("campaign_id", "version" DESC);

-- CreateIndex
CREATE INDEX "campaign_plans_campaign_id_status_idx" ON "campaign_plans"("campaign_id", "status");

-- AddForeignKey
ALTER TABLE "campaign_plan_sections" ADD CONSTRAINT "campaign_plan_sections_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "campaign_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_plan_tasks" ADD CONSTRAINT "campaign_plan_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "campaign_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
