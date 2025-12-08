import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}
  private readonly logger = new Logger(HealthService.name)
  async checkHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      this.logger.error(
        'Health check failed',
        error instanceof Error ? error.message : error,
      )
      return false
    }
  }
}
