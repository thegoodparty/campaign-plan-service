import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common'
import { PrismaClient } from '@prisma-generated/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
})

// Prevent unhandled 'error' events from crashing the process when an idle
// connection is dropped (e.g. Aurora scaling down).
pool.on('error', (err: Error) => {
  const logger = new Logger('PgPool')
  logger.error('Idle pg client error', err.message)
})

const adapter = new PrismaPg(pool)

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

    await pool.end()
  }
}
