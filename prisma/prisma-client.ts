import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const adapter = new PrismaPg(pool)

export function createPrismaClient(): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return new PrismaClient({ adapter })
}
