import { test, expect } from '@playwright/test'

test.describe('Health Check (e2e)', () => {
  test('GET /v1/health should return 200 OK', async ({ request }) => {
    const response = await request.get('/v1/health')
    expect(response.status()).toBe(200)
  })

  test('GET /v1/health should return correct JSON format', async ({
    request,
  }) => {
    const response = await request.get('/v1/health')
    const body = await response.json() as { status: string }
    expect(body).toEqual({ status: 'ok' })
  })

  test('GET /v1/health should respond quickly', async ({ request }) => {
    const startTime = Date.now()
    await request.get('/v1/health')
    const duration = Date.now() - startTime
    expect(duration).toBeLessThan(100)
  })
})
