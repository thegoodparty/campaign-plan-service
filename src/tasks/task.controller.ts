import { Controller, Get, Param } from '@nestjs/common'
import { TaskService } from './task.service'

@Controller('plans/:planId/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async findAll(@Param('planId') planId: string) {
    return this.taskService.findAllByPlanId(planId)
  }

  @Get(':taskId')
  async findOne(
    @Param('planId') planId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.findOne(planId, taskId)
  }
}
