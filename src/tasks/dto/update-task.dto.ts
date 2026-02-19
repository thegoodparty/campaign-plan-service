import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const CampaignPlanTaskTypeEnum = z.enum([
  'TEXT',
  'ROBOCALL',
  'DOOR_KNOCKING',
  'PHONE_BANKING',
  'SOCIAL_MEDIA',
  'EVENTS',
  'EDUCATION',
])

const CampaignPlanTaskStatusEnum = z.enum(['NOT_STARTED', 'COMPLETE'])

export const updateTaskSchema = z.object({
  type: CampaignPlanTaskTypeEnum,
  title: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.coerce.date().nullable(),
  weekIndex: z.number().int().nullable(),
  status: CampaignPlanTaskStatusEnum,
  actionUrl: z.string().url().nullable(),
  priority: z.number().int().nullable(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
