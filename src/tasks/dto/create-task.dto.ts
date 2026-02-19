import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  CampaignPlanTaskType,
  CampaignPlanTaskStatus,
} from '@prisma-generated/client'

export const createTaskSchema = z.object({
  type: z.enum(CampaignPlanTaskType),
  title: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.iso
    .datetime()
    .transform((s) => new Date(s))
    .nullable()
    .optional(),
  weekIndex: z.number().int().nullable().optional(),
  status: z.enum(CampaignPlanTaskStatus).optional().default('NOT_STARTED'),
  actionUrl: z.url().nullable().optional(),
  priority: z.number().int().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

export class CreateTaskDto extends createZodDto(createTaskSchema) {}
