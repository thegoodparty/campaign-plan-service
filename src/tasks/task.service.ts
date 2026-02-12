import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import type { CampaignPlanTask } from '@prisma-generated/client'

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name)

  constructor(private readonly prisma: PrismaService) {}

  async findAllByPlanId(planId: string): Promise<CampaignPlanTask[]> {
    const plan = await this.prisma.campaignPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    })

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`)
    }

    return this.prisma.campaignPlanTask.findMany({
      where: { planId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findOne(planId: string, taskId: string): Promise<CampaignPlanTask> {
    const task = await this.prisma.campaignPlanTask.findFirst({
      where: { id: taskId, planId },
    })

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found for plan ${planId}`)
    }

    return task
  }
}
