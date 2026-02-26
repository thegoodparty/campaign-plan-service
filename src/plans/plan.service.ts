import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import type { CampaignPlan } from '@prisma-generated/client'
import type { CreatePlanInput } from './dto/create-plan.dto'

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  // Queues a plan for generation. Only persists the request metadata
  // (campaignId, version, aiModel) with status QUEUED. The actual plan
  // content (sections, tasks) will be populated by the AI service once built.
  async create(
    data: CreatePlanInput,
  ): Promise<{ planId: string; status: CampaignPlan['status'] }> {
    const idempotencyKey = `${data.campaignId}:${data.version}`

    const existing = await this.prisma.campaignPlan.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true },
    })

    if (existing) {
      return { planId: existing.id, status: existing.status }
    }

    const { id, status } = await this.prisma.campaignPlan.create({
      data: { ...data, idempotencyKey },
      select: { id: true, status: true },
    })

    return { planId: id, status }
  }

  async findOne(planId: string) {
    const plan = await this.prisma.campaignPlan.findUnique({
      where: { id: planId },
      include: { sections: true },
    })

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`)
    }

    return plan
  }

  async remove(planId: string): Promise<void> {
    await this.findOne(planId)

    await this.prisma.campaignPlan.delete({
      where: { id: planId },
    })
  }
}
