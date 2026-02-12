import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { FastifyReply } from 'fastify'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let details: unknown = undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const response = exception.getResponse()

      if (typeof response === 'string') {
        message = response
      } else if (typeof response === 'object' && response !== null) {
        const res = response as Record<string, unknown>
        message = (res.message as string) ?? (res.error as string) ?? message

        // ZodValidationException from nestjs-zod puts errors here
        if (res.errors) {
          details = res.errors
        }
      }
    } else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : exception,
      )
    }

    void reply.status(status).send({
      code: status,
      message,
      ...(details !== undefined ? { details } : {}),
    })
  }
}
