import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common'
import type { ArgumentsHost } from '@nestjs/common'
import { Prisma } from '@prisma-generated/client'
import { AllExceptionsFilter } from './all-exceptions.filter'

function createMockHost() {
  const send = vi.fn()
  const status = vi.fn().mockReturnValue({ send })
  const reply = { status, send }
  const request = { method: 'GET', url: '/plans/123/tasks' }
  const host = {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost
  return { host, status, send }
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter

  beforeEach(() => {
    filter = new AllExceptionsFilter()
  })

  it('should format NotFoundException as { code, message }', () => {
    const { host, status, send } = createMockHost()

    filter.catch(new NotFoundException('Plan not found'), host)

    expect(status).toHaveBeenCalledWith(404)
    expect(send).toHaveBeenCalledWith({
      code: 404,
      message: 'Plan not found',
      method: 'GET',
      path: '/plans/123/tasks',
    })
  })

  it('should format HttpException with string response', () => {
    const { host, status, send } = createMockHost()

    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host)

    expect(status).toHaveBeenCalledWith(403)
    expect(send).toHaveBeenCalledWith({
      code: 403,
      message: 'Forbidden',
      method: 'GET',
      path: '/plans/123/tasks',
    })
  })

  it('should include details when errors array is present', () => {
    const { host, status, send } = createMockHost()
    const exception = new HttpException(
      {
        message: 'Validation failed',
        errors: [{ path: ['title'], message: 'Required' }],
      },
      HttpStatus.BAD_REQUEST,
    )

    filter.catch(exception, host)

    expect(status).toHaveBeenCalledWith(400)
    expect(send).toHaveBeenCalledWith({
      code: 400,
      message: 'Validation failed',
      method: 'GET',
      path: '/plans/123/tasks',
      details: [{ path: ['title'], message: 'Required' }],
    })
  })

  it('should return generic 500 for unknown errors without stack trace', () => {
    const { host, status, send } = createMockHost()

    filter.catch(new Error('DB connection lost'), host)

    expect(status).toHaveBeenCalledWith(500)
    expect(send).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal server error',
      method: 'GET',
      path: '/plans/123/tasks',
    })
  })

  it('should handle non-Error thrown values', () => {
    const { host, status, send } = createMockHost()

    filter.catch('something broke', host)

    expect(status).toHaveBeenCalledWith(500)
    expect(send).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal server error',
      method: 'GET',
      path: '/plans/123/tasks',
    })
  })

  it('should put message array in details for NestJS validation errors', () => {
    const { host, status, send } = createMockHost()
    const exception = new HttpException(
      {
        message: ['title must be a string', 'description should not be empty'],
        error: 'Bad Request',
      },
      HttpStatus.BAD_REQUEST,
    )

    filter.catch(exception, host)

    expect(status).toHaveBeenCalledWith(400)
    expect(send).toHaveBeenCalledWith({
      code: 400,
      message: 'Bad Request',
      method: 'GET',
      path: '/plans/123/tasks',
      details: ['title must be a string', 'description should not be empty'],
    })
  })

  it('should map Prisma P2025 (record not found) to 404', () => {
    const { host, status, send } = createMockHost()
    const exception = new Prisma.PrismaClientKnownRequestError(
      'An operation failed because it depends on one or more records that were required but not found.',
      { code: 'P2025', clientVersion: '7.0.0' },
    )

    filter.catch(exception, host)

    expect(status).toHaveBeenCalledWith(404)
    expect(send).toHaveBeenCalledWith({
      code: 404,
      message: 'Record not found',
      method: 'GET',
      path: '/plans/123/tasks',
    })
  })
})
