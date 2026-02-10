import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { TaskService } from './task.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { PatchTaskDto } from './dto/patch-task.dto'

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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('planId') planId: string,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.taskService.create(planId, createTaskDto)
  }

  @Put(':taskId')
  async update(
    @Param('planId') planId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.taskService.update(planId, taskId, updateTaskDto)
  }

  @Patch(':taskId')
  async patch(
    @Param('planId') planId: string,
    @Param('taskId') taskId: string,
    @Body() patchTaskDto: PatchTaskDto,
  ) {
    return this.taskService.patch(planId, taskId, patchTaskDto)
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('planId') planId: string,
    @Param('taskId') taskId: string,
  ) {
    await this.taskService.remove(planId, taskId)
  }
}
