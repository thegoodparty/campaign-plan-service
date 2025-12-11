import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient, adapter, pool } from '../../prisma/prisma-client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter })
  }

  async onModuleInit() {
    await super.$connect()
  }

  async onModuleDestroy() {
    await super.$disconnect()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await pool.end()
  }
}
