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
import type { CampaignPlan } from '@prisma-generated/client'
import { PlanService } from './plan.service'
import { CreatePlanDto } from './dto/create-plan.dto'

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(
    @Body() createPlanDto: CreatePlanDto,
  ): Promise<{ planId: string; status: CampaignPlan['status'] }> {
    return this.planService.create(createPlanDto)
  }

  @Get(':planId')
  async findOne(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
  ) {
    return this.planService.findOne(planId)
  }

  @Delete(':planId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('planId', new ParseUUIDPipe({ version: '7' })) planId: string,
  ) {
    await this.planService.remove(planId)
  }
}
