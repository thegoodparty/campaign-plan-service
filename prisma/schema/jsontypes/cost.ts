import { z } from 'zod'

export const CostSchema = z.object({
  totalCost: z.number().nonnegative(),
  currency: z.string().default('USD').optional(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cachedTokens: z.number().int().nonnegative().optional(),
  breakdown: z.object({
    inputCost: z.number().nonnegative(),
    outputCost: z.number().nonnegative(),
    cachedCost: z.number().nonnegative().optional(),
  }),
  calculatedAt: z.string().optional(),
})

// Prisma JSON type declaration
export {}

declare global {
  export namespace PrismaJson {
    export type Cost = z.infer<typeof CostSchema>
  }
}
