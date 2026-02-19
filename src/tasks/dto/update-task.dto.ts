import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import {
  CampaignPlanTaskType,
  CampaignPlanTaskStatus,
} from '@prisma-generated/client'

export const updateTaskSchema = z.object({
  type: z.enum(CampaignPlanTaskType),
  title: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.coerce.date().nullable(),
  weekIndex: z.number().int().nullable(),
  status: z.enum(CampaignPlanTaskStatus),
  actionUrl: z.string().url().nullable(),
  priority: z.number().int().nullable(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
