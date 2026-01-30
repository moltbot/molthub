import { useAuthActions } from '@convex-dev/auth/react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { PageShell } from '../../components/PageShell'
import { SectionHeader } from '../../components/SectionHeader'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { useAuthStatus } from '../../lib/useAuthStatus'

export const Route = createFileRoute('/cli/auth')({
  component: CliAuth,
})

function CliAuth() {
  const { isAuthenticated, isLoading, me } = useAuthStatus()
  const { signIn } = useAuthActions()
  const createToken = useMutation(api.tokens.create)

  const search = Route.useSearch() as {
    redirect_uri?: string
    label?: string
    label_b64?: string
    state?: string
  }
  const [status, setStatus] = useState<string>('Preparing…')
  const [token, setToken] = useState<string | null>(null)
  const hasRun = useRef(false)

  const redirectUri = search.redirect_uri ?? ''
  const label = (decodeLabel(search.label_b64) ?? search.label ?? 'CLI token').trim() || 'CLI token'
  const state = typeof search.state === 'string' ? search.state.trim() : ''

  const safeRedirect = useMemo(() => isAllowedRedirectUri(redirectUri), [redirectUri])
  const registry = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined

  useEffect(() => {
    if (hasRun.current) return
    if (!safeRedirect) return
    if (!state) return
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
      hash.set('state', state)
      window.location.assign(`${redirectUri}#${hash.toString()}`)
    }

    void run().catch((error) => {
      const message = error instanceof Error ? error.message : 'Failed to create token'
      setStatus(message)
      setToken(null)
    })
  }, [createToken, isAuthenticated, label, me, redirectUri, safeRedirect, state])

  if (!safeRedirect) {
    return (
      <main className="py-10">
        <PageShell>
          <Card className="space-y-3 p-6">
            <SectionHeader title="CLI login" />
            <p className="text-sm text-muted-foreground">Invalid redirect URL.</p>
            <p className="text-sm text-muted-foreground">
              Run the CLI again to start a fresh login.
            </p>
          </Card>
        </PageShell>
      </main>
    )
  }

  if (!state) {
    return (
      <main className="py-10">
        <PageShell>
          <Card className="space-y-3 p-6">
            <SectionHeader title="CLI login" />
            <p className="text-sm text-muted-foreground">Missing state.</p>
            <p className="text-sm text-muted-foreground">
              Run the CLI again to start a fresh login.
            </p>
          </Card>
        </PageShell>
      </main>
    )
  }

  if (!registry) {
    return (
      <main className="py-10">
        <PageShell>
          <Card className="p-6 text-sm text-muted-foreground">
            Missing VITE_CONVEX_SITE_URL configuration.
          </Card>
        </PageShell>
      </main>
    )
  }

  if (!isAuthenticated || !me) {
    return (
      <main className="py-10">
        <PageShell>
          <Card className="space-y-4 p-6">
            <SectionHeader title="CLI login" />
            <p className="text-sm text-muted-foreground">
              Sign in to create an API token for the CLI.
            </p>
            <Button type="button" disabled={isLoading} onClick={() => void signIn('github')}>
              Sign in with GitHub
            </Button>
          </Card>
        </PageShell>
      </main>
    )
  }

  return (
    <main className="py-10">
      <PageShell>
        <Card className="space-y-4 p-6">
          <SectionHeader title="CLI login" />
          <p className="text-sm text-muted-foreground">{status}</p>
          {token ? (
            <div className="rounded-[var(--radius)] border border-border bg-muted px-3 py-2 text-xs">
              <div className="mb-2 text-muted-foreground">If redirect fails, copy this token:</div>
              <code className="font-mono text-xs">{token}</code>
            </div>
          ) : null}
        </Card>
      </PageShell>
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
  return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]'
}

function decodeLabel(value: string | undefined) {
  if (!value) return null
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    const decoded = new TextDecoder().decode(bytes)
    const label = decoded.trim()
    if (!label) return null
    return label.slice(0, 80)
  } catch {
    return null
  }
}
