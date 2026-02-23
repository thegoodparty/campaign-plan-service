import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { ZodValidationPipe } from 'nestjs-zod'
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter'
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

describe('PlanController (HTTP)', () => {
  let app: NestFastifyApplication

  const mockService = {
    create: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanController],
      providers: [{ provide: PlanService, useValue: mockService }],
    }).compile()

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    )
    app.setGlobalPrefix('v1')
    app.useGlobalPipes(new ZodValidationPipe())
    app.useGlobalFilters(new AllExceptionsFilter())
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterEach(async () => {
    await app.close()
    vi.restoreAllMocks()
  })

  describe('POST /v1/plans', () => {
    it('should return 202 with { planId, status }', async () => {
      mockService.create.mockResolvedValue({
        planId: '01961234-5678-7abc-def0-123456789abc',
        status: 'QUEUED',
      })

      const res = await app.inject({
        method: 'POST',
        url: '/v1/plans',
        payload: { campaignId: 42, version: 1, aiModel: 'gpt-4' },
      })

      expect(res.statusCode).toBe(202)
      const body = res.json()
      expect(body).toEqual({
        planId: '01961234-5678-7abc-def0-123456789abc',
        status: 'QUEUED',
      })
    })

    it('should return 400 with structured error on invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/plans',
        payload: { campaignId: -1, version: 'bad' },
      })

      expect(res.statusCode).toBe(400)
      const body = res.json()
      expect(body).toHaveProperty('code', 400)
      expect(body).toHaveProperty('message')
      expect(body).toHaveProperty('details')
    })

    it('should return 5xx with structured error and no stack trace on internal failure', async () => {
      mockService.create.mockRejectedValue(new Error('DB connection lost'))

      const res = await app.inject({
        method: 'POST',
        url: '/v1/plans',
        payload: { campaignId: 42, version: 1, aiModel: 'gpt-4' },
      })

      expect(res.statusCode).toBe(500)
      const body = res.json()
      expect(body).toEqual({
        code: 500,
        message: 'Internal server error',
        method: 'POST',
        path: '/v1/plans',
      })
      expect(JSON.stringify(body)).not.toContain('stack')
    })
  })

  describe('GET /v1/plans/:planId', () => {
    const validId = '01961234-5678-7abc-def0-123456789abc'

    it('should return 200 with plan data', async () => {
      const plan = {
        id: validId,
        campaignId: 42,
        version: 1,
        status: 'QUEUED',
        sections: [],
      }
      mockService.findOne.mockResolvedValue(plan)

      const res = await app.inject({
        method: 'GET',
        url: `/v1/plans/${validId}`,
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual(plan)
    })

    it('should return 404 with structured error when not found', async () => {
      mockService.findOne.mockRejectedValue(
        new NotFoundException(`Plan ${validId} not found`),
      )

      const res = await app.inject({
        method: 'GET',
        url: `/v1/plans/${validId}`,
      })

      expect(res.statusCode).toBe(404)
      const body = res.json()
      expect(body).toHaveProperty('code', 404)
      expect(body).toHaveProperty('message', `Plan ${validId} not found`)
    })

    it('should return 5xx with structured error on internal failure', async () => {
      mockService.findOne.mockRejectedValue(new Error('Unexpected'))

      const res = await app.inject({
        method: 'GET',
        url: `/v1/plans/${validId}`,
      })

      expect(res.statusCode).toBe(500)
      const body = res.json()
      expect(body).toEqual({
        code: 500,
        message: 'Internal server error',
        method: 'GET',
        path: `/v1/plans/${validId}`,
      })
      expect(JSON.stringify(body)).not.toContain('stack')
    })
  })

  describe('DELETE /v1/plans/:planId', () => {
    const validId = '01961234-5678-7abc-def0-123456789abc'

    it('should return 204 on success', async () => {
      mockService.remove.mockResolvedValue(undefined)

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/plans/${validId}`,
      })

      expect(res.statusCode).toBe(204)
      expect(res.body).toBe('')
    })

    it('should return 404 with structured error when not found', async () => {
      mockService.remove.mockRejectedValue(
        new NotFoundException(`Plan ${validId} not found`),
      )

      const res = await app.inject({
        method: 'DELETE',
        url: `/v1/plans/${validId}`,
      })

      expect(res.statusCode).toBe(404)
      const body = res.json()
      expect(body).toHaveProperty('code', 404)
      expect(body).toHaveProperty('message', `Plan ${validId} not found`)
    })
  })
})
