import { Injectable } from '@nestjs/common'

@Injectable()
export class HealthService {
  checkHealth(): { status: string } {
    return { status: 'ok' }
  }
}
