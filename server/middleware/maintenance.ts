import { defineEventHandler, getHeader, setResponseHeader, setResponseStatus } from 'h3'

type MaintenancePayload = {
  enabled?: boolean
  message?: string | null
}

type CachedMaintenance = {
  checkedAt: number
  enabled: boolean
  message?: string | null
}

const CACHE_TTL_MS = 5000
let cached: CachedMaintenance | null = null

async function fetchMaintenanceStatus(): Promise<CachedMaintenance | null> {
  const baseUrl = process.env.VITE_CONVEX_SITE_URL ?? process.env.CONVEX_SITE_URL
  if (!baseUrl) return null

  try {
    const url = new URL('/maintenance', baseUrl)
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    const payload = (await response.json()) as MaintenancePayload
    return {
      checkedAt: Date.now(),
      enabled: Boolean(payload.enabled),
      message: payload.message ?? null,
    }
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  if (event.path === '/maintenance') return

  const now = Date.now()
  if (!cached || now - cached.checkedAt > CACHE_TTL_MS) {
    cached = await fetchMaintenanceStatus()
  }

  if (!cached?.enabled) return

  const accept = getHeader(event, 'accept') ?? ''
  const message = cached.message || 'Clawhub is temporarily unavailable while we run maintenance.'
  setResponseStatus(event, 503)
  setResponseHeader(event, 'retry-after', '300')

  if (accept.includes('application/json')) {
    return { error: 'maintenance', message }
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Maintenance</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        font-family: "Manrope", system-ui, -apple-system, sans-serif;
        background: radial-gradient(circle at top, #1f2937, #0f172a 55%, #0b1020);
        color: #e2e8f0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2.5rem;
      }
      .card {
        max-width: 520px;
        width: 100%;
        padding: 2.5rem;
        border-radius: 20px;
        background: rgba(15, 23, 42, 0.8);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(148, 163, 184, 0.2);
        text-align: left;
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 2rem;
        letter-spacing: -0.02em;
      }
      p {
        margin: 0;
        font-size: 1rem;
        line-height: 1.6;
        color: #cbd5f5;
      }
      .meta {
        margin-top: 1.5rem;
        font-size: 0.85rem;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>We’ll be right back.</h1>
      <p>${message}</p>
      <div class="meta">Thanks for your patience while we finish maintenance.</div>
    </div>
  </body>
</html>`
})
