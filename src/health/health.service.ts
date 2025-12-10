import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Performs a health check that includes database connectivity.
   * This ensures that during green/blue deployments, the load balancer
   * doesn't route traffic to a new instance until it has successfully
   * connected to the database. Without this check, a new instance could
   * appear healthy (process running) but fail requests due to missing DB connection.
   */
  async checkHealth(): Promise<{ status: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ok' }
    } catch (error) {
      this.logger.error(
        'Health check failed',
        error instanceof Error ? error.message : error,
      )
      return { status: 'error' }
    }
  }
}
