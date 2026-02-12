import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common'
import { PlanService } from './plan.service'
import { CreatePlanDto } from './dto/create-plan.dto'

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.create(createPlanDto)
  }

  @Get(':planId')
  async findOne(@Param('planId', ParseUUIDPipe) planId: string) {
    return this.planService.findOne(planId)
  }

  @Delete(':planId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('planId', ParseUUIDPipe) planId: string) {
    await this.planService.remove(planId)
  }
}
