import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common'
import type { ArgumentsHost } from '@nestjs/common'
import { AllExceptionsFilter } from './all-exceptions.filter'

function createMockHost() {
  const send = vi.fn()
  const status = vi.fn().mockReturnValue({ send })
  const reply = { status, send }
  const host = {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => ({}),
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
    })
  })

  it('should format HttpException with string response', () => {
    const { host, status, send } = createMockHost()

    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host)

    expect(status).toHaveBeenCalledWith(403)
    expect(send).toHaveBeenCalledWith({
      code: 403,
      message: 'Forbidden',
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
    })
  })

  it('should handle non-Error thrown values', () => {
    const { host, status, send } = createMockHost()

    filter.catch('something broke', host)

    expect(status).toHaveBeenCalledWith(500)
    expect(send).toHaveBeenCalledWith({
      code: 500,
      message: 'Internal server error',
    })
  })
})
