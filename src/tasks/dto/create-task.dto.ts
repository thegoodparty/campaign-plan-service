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

export const createTaskSchema = z.object({
  type: CampaignPlanTaskTypeEnum,
  title: z.string().min(1),
  description: z.string().min(1),
  dueDate: z.iso
    .datetime()
    .transform((s) => new Date(s))
    .nullable()
    .optional(),
  weekIndex: z.number().int().nullable().optional(),
  status: CampaignPlanTaskStatusEnum.optional().default('NOT_STARTED'),
  actionUrl: z.string().url().nullable().optional(),
  priority: z.number().int().nullable().optional(),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>

export class CreateTaskDto extends createZodDto(createTaskSchema) {}
