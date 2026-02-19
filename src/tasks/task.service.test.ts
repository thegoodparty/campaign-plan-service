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
              findUnique: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
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
      vi.spyOn(prisma.campaignPlanTask, 'findUnique').mockResolvedValue(
        mockTask as never,
      )

      const result = await service.findOne(mockPlan.id, mockTask.id)
      expect(result).toEqual(mockTask)
      expect(prisma.campaignPlanTask.findUnique).toHaveBeenCalledWith({
        where: { id: mockTask.id },
      })
    })

    it('should throw NotFoundException when task does not exist', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findUnique').mockResolvedValue(
        null as never,
      )

      await expect(
        service.findOne(mockPlan.id, 'nonexistent-task'),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    const createDto = {
      type: 'DOOR_KNOCKING' as const,
      title: 'New task',
      description: 'Task description',
      status: 'NOT_STARTED' as const,
      tags: [] as string[],
    }

    it('should create a task when plan exists', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        mockPlan as never,
      )
      vi.spyOn(prisma.campaignPlanTask, 'create').mockResolvedValue(
        mockTask as never,
      )

      const result = await service.create(mockPlan.id, createDto)
      expect(result).toEqual(mockTask)
      expect(prisma.campaignPlanTask.create).toHaveBeenCalledWith({
        data: { ...createDto, planId: mockPlan.id },
      })
    })

    it('should throw NotFoundException when plan does not exist', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        null as never,
      )

      await expect(service.create('nonexistent-id', createDto)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should propagate database errors', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        mockPlan as never,
      )
      vi.spyOn(prisma.campaignPlanTask, 'create').mockRejectedValue(
        new Error('DB connection lost'),
      )

      await expect(service.create(mockPlan.id, createDto)).rejects.toThrow(
        'DB connection lost',
      )
    })
  })

  describe('update', () => {
    const updateDto = {
      type: 'PHONE_BANKING' as const,
      title: 'Updated task',
      description: 'Updated description',
      dueDate: null,
      weekIndex: null,
      status: 'NOT_STARTED' as const,
      actionUrl: null,
      priority: null,
      tags: [] as string[],
      metadata: null,
    }

    it('should update a task when it exists', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findUnique').mockResolvedValue(
        mockTask as never,
      )
      const updatedTask = { ...mockTask, ...updateDto }
      vi.spyOn(prisma.campaignPlanTask, 'update').mockResolvedValue(
        updatedTask as never,
      )

      const result = await service.update(mockPlan.id, mockTask.id, updateDto)
      expect(result).toEqual(updatedTask)
      expect(prisma.campaignPlanTask.update).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        data: updateDto,
      })
    })

    it('should throw NotFoundException when task does not exist', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findUnique').mockResolvedValue(
        null as never,
      )

      await expect(
        service.update(mockPlan.id, 'nonexistent', updateDto),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('update (partial)', () => {
    it('should partially update a task', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findUnique').mockResolvedValue(
        mockTask as never,
      )
      const patchedTask = { ...mockTask, title: 'Patched title' }
      vi.spyOn(prisma.campaignPlanTask, 'update').mockResolvedValue(
        patchedTask as never,
      )

      const result = await service.update(mockPlan.id, mockTask.id, {
        title: 'Patched title',
      })
      expect(result).toEqual(patchedTask)
      expect(prisma.campaignPlanTask.update).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        data: { title: 'Patched title' },
      })
    })

    it('should throw NotFoundException when task does not exist', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findUnique').mockResolvedValue(
        null as never,
      )

      await expect(
        service.update(mockPlan.id, 'nonexistent', { title: 'X' }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('should delete a task when it exists', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findUnique').mockResolvedValue(
        mockTask as never,
      )
      vi.spyOn(prisma.campaignPlanTask, 'delete').mockResolvedValue(
        mockTask as never,
      )

      await service.remove(mockPlan.id, mockTask.id)
      expect(prisma.campaignPlanTask.delete).toHaveBeenCalledWith({
        where: { id: mockTask.id },
      })
    })

    it('should throw NotFoundException when task does not exist', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findUnique').mockResolvedValue(
        null as never,
      )

      await expect(service.remove(mockPlan.id, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should propagate database errors', async () => {
      vi.spyOn(prisma.campaignPlanTask, 'findUnique').mockResolvedValue(
        mockTask as never,
      )
      vi.spyOn(prisma.campaignPlanTask, 'delete').mockRejectedValue(
        new Error('Connection refused'),
      )

      await expect(service.remove(mockPlan.id, mockTask.id)).rejects.toThrow(
        'Connection refused',
      )
    })
  })
})
