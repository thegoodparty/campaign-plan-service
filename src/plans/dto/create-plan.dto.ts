import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const createPlanSchema = z.object({
  campaignId: z.coerce.number().int().positive(),
  version: z.coerce.number().int().positive(),
  aiModel: z.string().min(1),
  sourceReason: z.string().optional(),
})

export type CreatePlanInput = z.infer<typeof createPlanSchema>

export class CreatePlanDto extends createZodDto(createPlanSchema) {}
