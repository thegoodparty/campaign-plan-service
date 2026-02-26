import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { PrismaModule } from '@/prisma/prisma.module'
import { HealthModule } from '@/health/health.module'
import { TaskModule } from '@/tasks/task.module'
import { PlanModule } from '@/plans/plan.module'

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    HealthModule,
    TaskModule,
    PlanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
