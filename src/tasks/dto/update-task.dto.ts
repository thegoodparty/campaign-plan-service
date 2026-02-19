import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { createTaskSchema } from './create-task.dto'

export const updateTaskSchema = createTaskSchema.required()

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}
