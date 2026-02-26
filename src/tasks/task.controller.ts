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
  ParseUUIDPipe,
} from '@nestjs/common'
import type { CampaignPlanTask } from '@prisma-generated/client'
import { TaskService } from './task.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { PatchTaskDto } from './dto/patch-task.dto'

@Controller('plans/:planId/tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  async findAll(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
  ): Promise<CampaignPlanTask[]> {
    return this.taskService.findAllByPlanId(planId)
  }

  @Get(':taskId')
  async findOne(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '7' })) taskId: string,
  ): Promise<CampaignPlanTask> {
    return this.taskService.findOne(planId, taskId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<CampaignPlanTask> {
    return this.taskService.create(planId, createTaskDto)
  }

  @Put(':taskId')
  async update(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '7' })) taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<CampaignPlanTask> {
    return this.taskService.update(planId, taskId, updateTaskDto)
  }

  @Patch(':taskId')
  async patch(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '7' })) taskId: string,
    @Body() patchTaskDto: PatchTaskDto,
  ): Promise<CampaignPlanTask> {
    return this.taskService.update(planId, taskId, patchTaskDto)
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
    @Param('taskId', new ParseUUIDPipe({ version: '7' })) taskId: string,
  ): Promise<void> {
    await this.taskService.remove(planId, taskId)
  }
}
