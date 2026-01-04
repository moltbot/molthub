/* @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { buildCliAuthUrl, isAllowedLoopbackRedirectUri, startLoopbackAuthServer } from './browserAuth'

describe('browserAuth', () => {
  it('builds auth url', () => {
    const url = buildCliAuthUrl({
      siteUrl: 'https://example.com',
      redirectUri: 'http://127.0.0.1:1234/callback',
      label: 'CLI token',
    })
    expect(url).toContain('https://example.com/cli/auth?')
    expect(url).toContain('redirect_uri=')
    expect(url).toContain('label=')
  })

  it('accepts only loopback http redirect uris', () => {
    expect(isAllowedLoopbackRedirectUri('http://127.0.0.1:1234/callback')).toBe(true)
    expect(isAllowedLoopbackRedirectUri('http://localhost:1234/callback')).toBe(true)
    expect(isAllowedLoopbackRedirectUri('http://[::1]:1234/callback')).toBe(true)
    expect(isAllowedLoopbackRedirectUri('https://127.0.0.1:1234/callback')).toBe(false)
    expect(isAllowedLoopbackRedirectUri('http://evil.com/callback')).toBe(false)
  })

  it('receives token via loopback server', async () => {
    const server = await startLoopbackAuthServer({ timeoutMs: 2000 })
    const payload = { token: 'clh_test', registry: 'https://example.convex.site' }
    await fetch(server.redirectUri.replace('/callback', '/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await expect(server.waitForResult()).resolves.toEqual(payload)
  })
})
