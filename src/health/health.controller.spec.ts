import { Test, TestingModule } from '@nestjs/testing'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile()

    controller = module.get<HealthController>(HealthController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('checkHealth', () => {
    it('should return status ok', () => {
      const result = controller.checkHealth()
      expect(result).toEqual({ status: 'ok' })
    })

    it('should return 200 OK with expected format', () => {
      const result = controller.checkHealth()
      expect(result).toHaveProperty('status')
      expect(result.status).toBe('ok')
    })
  })
})
