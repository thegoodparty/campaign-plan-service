import { test, expect } from '@playwright/test'

test.describe('App (e2e)', () => {
  test('GET / should return Hello World', async ({ request }) => {
    const response = await request.get('/v1')

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toBe('Hello World!')
  })
})
