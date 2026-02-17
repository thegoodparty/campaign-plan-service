import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const adapter = new PrismaPg(pool)

// Re-export PrismaClient for use in services
export { PrismaClient }

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter })
}
