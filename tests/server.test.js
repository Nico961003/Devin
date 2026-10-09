import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../server/src/app.js'

let server
let baseUrl

beforeAll(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

describe('servidor base', () => {
  it('expone la comprobación de estado bajo /api', async () => {
    const response = await fetch(`${baseUrl}/api/health`)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
    expect(response.headers.get('x-powered-by')).toBeNull()
  })
})
