import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { PlanController } from './plan.controller'
import { PlanService } from './plan.service'

const mockPlanResponse = {
  planId: '01961234-5678-7abc-def0-123456789abc',
  status: 'QUEUED',
}

const mockPlanFull = {
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

describe('PlanController', () => {
  let controller: PlanController
  let planService: PlanService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanController],
      providers: [
        {
          provide: PlanService,
          useValue: {
            create: vi.fn(),
            findOne: vi.fn(),
            remove: vi.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<PlanController>(PlanController)
    planService = module.get<PlanService>(PlanService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('create', () => {
    it('should create a plan and return planId and status', async () => {
      vi.spyOn(planService, 'create').mockResolvedValue(
        mockPlanResponse as never,
      )

      const result = await controller.create(createDto)
      expect(result).toEqual(mockPlanResponse)
      expect(planService.create).toHaveBeenCalledWith(createDto)
    })

    it('should return existing plan on idempotent call', async () => {
      vi.spyOn(planService, 'create').mockResolvedValue(
        mockPlanResponse as never,
      )

      const result = await controller.create(createDto)
      expect(result).toEqual(mockPlanResponse)
    })

    it('should propagate errors from service', async () => {
      vi.spyOn(planService, 'create').mockRejectedValue(new Error('DB error'))

      await expect(controller.create(createDto)).rejects.toThrow('DB error')
    })
  })

  describe('findOne', () => {
    it('should return a plan with sections', async () => {
      vi.spyOn(planService, 'findOne').mockResolvedValue(mockPlanFull as never)

      const result = await controller.findOne(mockPlanFull.id)
      expect(result).toEqual(mockPlanFull)
      expect(planService.findOne).toHaveBeenCalledWith(mockPlanFull.id)
    })

    it('should propagate NotFoundException from service', async () => {
      vi.spyOn(planService, 'findOne').mockRejectedValue(
        new NotFoundException(),
      )

      await expect(controller.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('remove', () => {
    it('should call service.remove and return void', async () => {
      vi.spyOn(planService, 'remove').mockResolvedValue(undefined as never)

      const result = await controller.remove(mockPlanFull.id)
      expect(result).toBeUndefined()
      expect(planService.remove).toHaveBeenCalledWith(mockPlanFull.id)
    })

    it('should propagate NotFoundException from service', async () => {
      vi.spyOn(planService, 'remove').mockRejectedValue(new NotFoundException())

      await expect(controller.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      )
    })
  })
})
