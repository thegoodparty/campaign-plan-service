import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { PlanService } from './plan.service'
import { PrismaService } from '@/prisma/prisma.service'

const mockPlan = {
  id: '01961234-5678-7abc-def0-123456789abc',
  campaignId: 42,
  version: 1,
  status: 'QUEUED',
  idempotencyKey: '42:1',
  aiModel: 'gpt-4',
  cost: null,
  sourceReason: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  completedAt: null,
  errorMessage: null,
  sections: [],
}

const createDto = {
  campaignId: 42,
  version: 1,
  aiModel: 'gpt-4',
}

describe('PlanService', () => {
  let service: PlanService
  let prisma: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanService,
        {
          provide: PrismaService,
          useValue: {
            campaignPlan: {
              findUnique: vi.fn(),
              create: vi.fn(),
              delete: vi.fn(),
            },
          },
        },
      ],
    }).compile()

    service = module.get<PlanService>(PlanService)
    prisma = module.get<PrismaService>(PrismaService)
  })

  describe('create', () => {
    it('should create a new plan and return planId and status', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        null as never,
      )
      vi.spyOn(prisma.campaignPlan, 'create').mockResolvedValue(
        mockPlan as never,
      )

      const result = await service.create(createDto)
      expect(result).toEqual({ planId: mockPlan.id, status: 'QUEUED' })
      expect(prisma.campaignPlan.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey: '42:1' },
      })
      expect(prisma.campaignPlan.create).toHaveBeenCalledWith({
        data: { ...createDto, idempotencyKey: '42:1' },
      })
    })

    it('should return existing plan when idempotency key matches', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        mockPlan as never,
      )

      const result = await service.create(createDto)
      expect(result).toEqual({ planId: mockPlan.id, status: 'QUEUED' })
      expect(prisma.campaignPlan.create).not.toHaveBeenCalled()
    })

    it('should propagate database errors', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        null as never,
      )
      vi.spyOn(prisma.campaignPlan, 'create').mockRejectedValue(
        new Error('DB connection lost'),
      )

      await expect(service.create(createDto)).rejects.toThrow(
        'DB connection lost',
      )
    })
  })

  describe('findOne', () => {
    it('should return plan with sections when it exists', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        mockPlan as never,
      )

      const result = await service.findOne(mockPlan.id)
      expect(result).toEqual(mockPlan)
      expect(prisma.campaignPlan.findUnique).toHaveBeenCalledWith({
        where: { id: mockPlan.id },
        include: { sections: true },
      })
    })

    it('should throw NotFoundException when plan does not exist', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        null as never,
      )

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('remove', () => {
    it('should delete the plan when it exists', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue({
        id: mockPlan.id,
      } as never)
      vi.spyOn(prisma.campaignPlan, 'delete').mockResolvedValue(
        mockPlan as never,
      )

      await service.remove(mockPlan.id)
      expect(prisma.campaignPlan.delete).toHaveBeenCalledWith({
        where: { id: mockPlan.id },
      })
    })

    it('should throw NotFoundException when plan does not exist', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue(
        null as never,
      )

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should propagate database errors', async () => {
      vi.spyOn(prisma.campaignPlan, 'findUnique').mockResolvedValue({
        id: mockPlan.id,
      } as never)
      vi.spyOn(prisma.campaignPlan, 'delete').mockRejectedValue(
        new Error('Connection refused'),
      )

      await expect(service.remove(mockPlan.id)).rejects.toThrow(
        'Connection refused',
      )
    })
  })
})
