import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { ZodValidationPipe } from 'nestjs-zod'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { Logger } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'

const APP_LISTEN_CONFIG = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || 'localhost',
}

const bootstrap = async () => {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      ...(process.env.LOG_LEVEL
        ? {
            logger: { level: process.env.LOG_LEVEL },
          }
        : {}),
    }),
    {
      rawBody: true,
    },
  )

  app.setGlobalPrefix('v1')
  app.useGlobalPipes(new ZodValidationPipe())

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Campaign Plan Service')
    .setDescription('Campaign Plan Service API')
    .setVersion('1.0')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api', app, document)

  await app.register(helmet)

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })

  await app.listen(APP_LISTEN_CONFIG)
  return app
}

const logger = new Logger('bootstrap')

bootstrap()
  .then(() => {
    logger.log(
      `App bootstrap successful => ${APP_LISTEN_CONFIG.host}:${APP_LISTEN_CONFIG.port}`,
    )
  })
  .catch((error) => {
    logger.error('Failed to start application', error)
    process.exit(1)
  })
