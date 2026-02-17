import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common'
import { TaskService } from './task.service'

@Controller('plans/:planId/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async findAll(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
  ) {
    return this.taskService.findAllByPlanId(planId)
  }

  @Get(':taskId')
  async findOne(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '7' })) taskId: string,
  ) {
    return this.taskService.findOne(planId, taskId)
  }
}
