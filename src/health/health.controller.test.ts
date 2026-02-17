import { Test, TestingModule } from '@nestjs/testing'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'
import { PrismaService } from '@/prisma/prisma.service'

describe('HealthController', () => {
  let controller: HealthController
  let prismaService: PrismaService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: vi.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<HealthController>(HealthController)
    prismaService = module.get<PrismaService>(PrismaService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('checkHealth', () => {
    it('should return status ok', async () => {
      vi.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        { '?column?': 1 },
      ])
      const result = await controller.checkHealth()
      expect(result).toEqual({ status: 'ok' })
    })

    it('should return 200 OK with expected format', async () => {
      vi.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        { '?column?': 1 },
      ])
      const result = await controller.checkHealth()
      expect(result).toHaveProperty('status')
      expect(result.status).toBe('ok')
    })
  })
})
