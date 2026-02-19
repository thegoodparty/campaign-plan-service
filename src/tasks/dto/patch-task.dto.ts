import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { createTaskSchema } from './create-task.dto'

export const patchTaskSchema = createTaskSchema.partial()

export type PatchTaskInput = z.infer<typeof patchTaskSchema>

export class PatchTaskDto extends createZodDto(patchTaskSchema) {}
