import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import type { CreatePlanInput } from './dto/create-plan.dto'

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePlanInput) {
    const idempotencyKey = `${data.campaignId}:${data.version}`

    const existing = await this.prisma.campaignPlan.findUnique({
      where: { idempotencyKey },
    })

    if (existing) {
      return { planId: existing.id, status: existing.status }
    }

    const plan = await this.prisma.campaignPlan.create({
      data: { ...data, idempotencyKey },
    })

    return { planId: plan.id, status: plan.status }
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
    const plan = await this.prisma.campaignPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    })

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`)
    }

    await this.prisma.campaignPlan.delete({
      where: { id: planId },
    })
  }
}
