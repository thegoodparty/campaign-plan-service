import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { TaskService } from './task.service'
import { PrismaService } from '@/prisma/prisma.service'

const mockPlan = { id: '01961234-5678-7abc-def0-123456789abc' }

const mockTask = {
  id: '01961234-aaaa-7bbb-cccc-dddddddddddd',
  planId: mockPlan.id,
  type: 'DOOR_KNOCKING',
  title: 'Knock on doors in District 5',
  description: 'Canvas the neighborhood',
  dueDate: null,
  weekIndex: 1,
  status: 'NOT_STARTED',
  actionUrl: null,
  priority: 1,
  tags: [],
  metadata: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
}

describe('TaskService', () => {
  let service: TaskService
  let prisma: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: PrismaService,
          useValue: {
            campaignPlan: {
              findUnique: vi.fn(),
            },
            campaignPlanTask: {
              findMany: vi.fn(),
              findFirst: vi.fn(),
            },
          },
        },
      ],
    }).compile()

    service = module.get<TaskService>(TaskService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('findAllByPlanId', () => {
    it('should return tasks for a valid plan', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        mockPlan as never,
      )
      vi.spyOn(prisma.campaignPlanTask, 'findMany').mockResolvedValue([
        mockTask,
      ] as never)

      const result = await service.findAllByPlanId(mockPlan.id)
      expect(result).toEqual([mockTask])
      expect(prisma.campaignPlan.findUnique).toHaveBeenCalledWith({
        where: { id: mockPlan.id },
        select: { id: true },
      })
      expect(prisma.campaignPlanTask.findMany).toHaveBeenCalledWith({
        where: { planId: mockPlan.id },
        orderBy: { createdAt: 'asc' },
      })
    })

    it('should return empty array when plan exists but has no tasks', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        mockPlan as never,
      )
      vi.spyOn(prisma.campaignPlanTask, 'findMany').mockResolvedValue(
        [] as never,
      )

      const result = await service.findAllByPlanId(mockPlan.id)
      expect(result).toEqual([])
    })

    it('should throw NotFoundException when plan does not exist', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        null as never,
      )

      await expect(service.findAllByPlanId('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('findOne', () => {
    it('should return a task when it exists for the plan', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findFirst').mockResolvedValue(
        mockTask as never,
      )

      const result = await service.findOne(mockPlan.id, mockTask.id)
      expect(result).toEqual(mockTask)
      expect(prisma.campaignPlanTask.findFirst).toHaveBeenCalledWith({
        where: { id: mockTask.id, planId: mockPlan.id },
      })
    })

    it('should throw NotFoundException when task does not exist', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findFirst').mockResolvedValue(
        null as never,
      )

      await expect(
        service.findOne(mockPlan.id, 'nonexistent-task'),
      ).rejects.toThrow(NotFoundException)
    })
  })
})
