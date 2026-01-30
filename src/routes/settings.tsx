import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { PageShell } from '../components/PageShell'
import { SectionHeader } from '../components/SectionHeader'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { gravatarUrl } from '../lib/gravatar'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

function Settings() {
  const me = useQuery(api.users.me)
  const updateProfile = useMutation(api.users.updateProfile)
  const deleteAccount = useMutation(api.users.deleteAccount)
  const tokens = useQuery(api.tokens.listMine) as
    | Array<{
        _id: Id<'apiTokens'>
        label: string
        prefix: string
        createdAt: number
        lastUsedAt?: number
        revokedAt?: number
      }>
    | undefined
  const createToken = useMutation(api.tokens.create)
  const revokeToken = useMutation(api.tokens.revoke)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [tokenLabel, setTokenLabel] = useState('CLI token')
  const [newToken, setNewToken] = useState<string | null>(null)

  useEffect(() => {
    if (!me) return
    setDisplayName(me.displayName ?? '')
    setBio(me.bio ?? '')
  }, [me])

  if (!me) {
    return (
      <main className="py-10">
        <PageShell>
          <Card className="p-6 text-sm text-muted-foreground">Sign in to access settings.</Card>
        </PageShell>
      </main>
    )
  }

  const avatar = me.image ?? (me.email ? gravatarUrl(me.email, 160) : undefined)
  const identityName = me.displayName ?? me.name ?? me.handle ?? 'Profile'
  const handle = me.handle ?? (me.email ? me.email.split('@')[0] : undefined)

  async function onSave(event: React.FormEvent) {
    event.preventDefault()
    await updateProfile({ displayName, bio })
    setStatus('Saved.')
  }

  async function onDelete() {
    const ok = window.confirm('Soft delete your account? This cannot be undone.')
    if (!ok) return
    await deleteAccount()
  }

  async function onCreateToken() {
    const label = tokenLabel.trim() || 'CLI token'
    const result = await createToken({ label })
    setNewToken(result.token)
  }

  return (
    <main className="py-10">
      <PageShell className="space-y-8">
        <SectionHeader title="Settings" />

        <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16">
            {avatar ? <AvatarImage src={avatar} alt={identityName} /> : null}
            <AvatarFallback>{identityName[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="text-lg font-semibold">{identityName}</div>
            {handle ? <div className="text-sm text-muted-foreground">@{handle}</div> : null}
            {me.email ? <div className="text-sm text-muted-foreground">{me.email}</div> : null}
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Profile</h2>
          <form className="space-y-4" onSubmit={onSave}>
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="settings-display-name">
                Display name
              </label>
              <Input
                id="settings-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium" htmlFor="settings-bio">
                Bio
              </label>
              <Textarea
                id="settings-bio"
                rows={5}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Tell people what you're building."
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit">Save</Button>
              {status ? <span className="text-xs text-muted-foreground">{status}</span> : null}
            </div>
          </form>
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">API tokens</h2>
          <p className="text-sm text-muted-foreground">
            Use these tokens for the `molthub` CLI. Tokens are shown once on creation.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium" htmlFor="settings-token-label">
              Label
            </label>
            <Input
              id="settings-token-label"
              value={tokenLabel}
              onChange={(event) => setTokenLabel(event.target.value)}
              placeholder="CLI token"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void onCreateToken()}>
              Create token
            </Button>
            {newToken ? (
              <div className="rounded-[var(--radius)] border border-border bg-muted px-3 py-2 text-xs">
                <div className="mb-2 text-muted-foreground">Copy this token now:</div>
                <code className="font-mono text-xs">{newToken}</code>
              </div>
            ) : null}
          </div>

          {(tokens ?? []).length ? (
            <div className="space-y-2">
              {(tokens ?? []).map((token) => (
                <div
                  key={token._id}
                  className="flex flex-col gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {token.label} <span className="text-muted-foreground">({token.prefix}…)</span>
                    </div>
                    <div className="text-muted-foreground">
                      Created {formatDate(token.createdAt)}
                      {token.lastUsedAt ? ` · Used ${formatDate(token.lastUsedAt)}` : ''}
                      {token.revokedAt ? ` · Revoked ${formatDate(token.revokedAt)}` : ''}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(token.revokedAt)}
                    onClick={() => void revokeToken({ tokenId: token._id })}
                  >
                    {token.revokedAt ? 'Revoked' : 'Revoke'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tokens yet.</p>
          )}
        </Card>

        <Card className="space-y-3 border border-destructive/40 bg-destructive/5 p-6">
          <h2 className="font-display text-lg font-semibold text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Soft delete your account. Skills remain public.
          </p>
          <Button type="button" variant="destructive" onClick={() => void onDelete()}>
            Delete account
          </Button>
        </Card>
      </PageShell>
    </main>
  )
}

function formatDate(value: number) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}
