import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common'
import { TaskService } from './task.service'

@Controller('plans/:planId/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async findAll(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.taskService.findAllByPlanId(planId)
  }

  @Get(':taskId')
  async findOne(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.taskService.findOne(planId, taskId)
  }
}
