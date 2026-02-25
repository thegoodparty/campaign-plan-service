import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Prisma } from '@prisma-generated/client'
import type { FastifyReply, FastifyRequest } from 'fastify'

interface HttpExceptionBody {
  message?: string | string[]
  error?: string
  errors?: unknown
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<FastifyRequest>()
    const reply = ctx.getResponse<FastifyReply>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let details: unknown = undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const response = exception.getResponse()

      if (typeof response === 'string') {
        message = response
      } else {
        const body = response as HttpExceptionBody

        if (Array.isArray(body.message)) {
          message = body.error ?? exception.message
          details = body.message
        } else {
          message = body.message ?? body.error ?? exception.message
        }

        // ZodValidationException from nestjs-zod puts errors here
        if (body.errors) {
          details = body.errors
        }
      }
    } else if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2025'
    ) {
      status = HttpStatus.NOT_FOUND
      message = 'Record not found'
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      )
    }

    void reply.status(status).send({
      code: status,
      message,
      method: request.method,
      path: request.url,
      ...(details !== undefined ? { details } : {}),
    })
  }
}
