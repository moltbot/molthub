import { useAuthActions } from '@convex-dev/auth/react'
import { createFileRoute } from '@tanstack/react-router'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/cli/auth')({
  component: CliAuth,
})

function CliAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()
  const me = useQuery(api.users.me)
  const createToken = useMutation(api.tokens.create)

  const search = Route.useSearch() as { redirect_uri?: string; label?: string }
  const [status, setStatus] = useState<string>('Preparing…')
  const [token, setToken] = useState<string | null>(null)
  const hasRun = useRef(false)

  const redirectUri = search.redirect_uri ?? ''
  const label = (search.label ?? 'CLI token').trim() || 'CLI token'

  const safeRedirect = useMemo(() => isAllowedRedirectUri(redirectUri), [redirectUri])
  const registry = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined

  useEffect(() => {
    if (hasRun.current) return
    if (!safeRedirect) return
    if (!registry) return
    if (!isAuthenticated || !me) return
    hasRun.current = true

    const run = async () => {
      setStatus('Creating token…')
      const result = await createToken({ label })
      setToken(result.token)
      setStatus('Redirecting to CLI…')
      const hash = new URLSearchParams()
      hash.set('token', result.token)
      hash.set('registry', registry)
      window.location.assign(`${redirectUri}#${hash.toString()}`)
    }

    void run().catch((error) => {
      const message = error instanceof Error ? error.message : 'Failed to create token'
      setStatus(message)
      setToken(null)
    })
  }, [createToken, isAuthenticated, label, me, redirectUri, registry, safeRedirect])

  if (!safeRedirect) {
    return (
      <main className="section">
        <div className="card">
          <h1 className="section-title" style={{ marginTop: 0 }}>
            CLI login
          </h1>
          <p className="section-subtitle">Invalid redirect URL.</p>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Run the CLI again to start a fresh login.
          </p>
        </div>
      </main>
    )
  }

  if (!registry) {
    return (
      <main className="section">
        <div className="card">Missing VITE_CONVEX_SITE_URL configuration.</div>
      </main>
    )
  }

  if (!isAuthenticated || !me) {
    return (
      <main className="section">
        <div className="card">
          <h1 className="section-title" style={{ marginTop: 0 }}>
            CLI login
          </h1>
          <p className="section-subtitle">Sign in to create an API token for the CLI.</p>
          <button
            className="btn btn-primary"
            type="button"
            disabled={isLoading}
            onClick={() => void signIn('github')}
          >
            Sign in with GitHub
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="section">
      <div className="card">
        <h1 className="section-title" style={{ marginTop: 0 }}>
          CLI login
        </h1>
        <p className="section-subtitle">{status}</p>
        {token ? (
          <div className="stat" style={{ overflowX: 'auto' }}>
            <div style={{ marginBottom: 8 }}>If redirect fails, copy this token:</div>
            <code>{token}</code>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function isAllowedRedirectUri(value: string) {
  if (!value) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase()
  return host === '127.0.0.1' || host === 'localhost' || host === '::1'
}

