import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export const adapter = new PrismaPg(pool)

export function createPrismaClient() {
  return new PrismaClient({ adapter })
}

