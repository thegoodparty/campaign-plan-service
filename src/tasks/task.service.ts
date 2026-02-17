import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import type { CampaignPlanTask } from '@prisma-generated/client'
import type { CreateTaskInput } from './dto/create-task.dto'
import type { UpdateTaskInput } from './dto/update-task.dto'
import type { PatchTaskInput } from './dto/patch-task.dto'

@Injectable()
export class TaskService {
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

  async create(
    planId: string,
    data: CreateTaskInput,
  ): Promise<CampaignPlanTask> {
    const plan = await this.prisma.campaignPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    })

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`)
    }

    return this.prisma.campaignPlanTask.create({
      data: { ...data, planId },
    })
  }

  async update(
    planId: string,
    taskId: string,
    data: UpdateTaskInput,
  ): Promise<CampaignPlanTask> {
    await this.findOne(planId, taskId)

    return this.prisma.campaignPlanTask.update({
      where: { id: taskId },
      data,
    })
  }

  async patch(
    planId: string,
    taskId: string,
    data: PatchTaskInput,
  ): Promise<CampaignPlanTask> {
    await this.findOne(planId, taskId)

    return this.prisma.campaignPlanTask.update({
      where: { id: taskId },
      data,
    })
  }

  async remove(planId: string, taskId: string): Promise<void> {
    await this.findOne(planId, taskId)

    await this.prisma.campaignPlanTask.delete({
      where: { id: taskId },
    })
  }
}
