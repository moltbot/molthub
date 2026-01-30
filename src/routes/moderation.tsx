import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { PageShell } from '../components/PageShell'
import { SectionHeader } from '../components/SectionHeader'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  getSkillBadges,
  isSkillDeprecated,
  isSkillHighlighted,
  isSkillOfficial,
  type SkillBadgeMap,
} from '../lib/badges'
import type { PublicSkill } from '../lib/publicUser'
import { isAdmin, isModerator } from '../lib/roles'
import { useAuthStatus } from '../lib/useAuthStatus'

type ReportedSkillEntry = {
  skill: Doc<'skills'>
  latestVersion: Doc<'skillVersions'> | null
  owner: Doc<'users'> | null
  reportStats: Doc<'skillReportStats'>
}

type SimilarSkillEntry = {
  skill: PublicSkill
  latestVersion: Doc<'skillVersions'> | null
  ownerHandle: string | null
  score: number
}

type SkillBySlugResult = {
  skill: Doc<'skills'>
  latestVersion: Doc<'skillVersions'> | null
  owner: Doc<'users'> | null
} | null

function resolveOwnerParam(handle: string | null | undefined, ownerId?: Id<'users'>) {
  return handle?.trim() || (ownerId ? String(ownerId) : 'unknown')
}

export const Route = createFileRoute('/moderation')({
  validateSearch: (search) => ({
    skill: typeof search.skill === 'string' && search.skill.trim() ? search.skill : undefined,
    tab: search.tab === 'queue' || search.tab === 'lookup' ? search.tab : undefined,
  }),
  component: Moderation,
})

function Moderation() {
  const { me, bypassEnabled } = useAuthStatus()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const staff = isModerator(me) || bypassEnabled
  const admin = isAdmin(me) || bypassEnabled
  const tab = search.tab ?? 'queue'

  const selectedSlug = search.skill?.trim()
  const selectedSkill = useQuery(
    api.skills.getBySlug,
    staff && selectedSlug ? { slug: selectedSlug } : 'skip',
  ) as SkillBySlugResult | undefined
  const reportedSkills = useQuery(api.skills.listReportedSkills, staff ? { limit: 25 } : 'skip') as
    | ReportedSkillEntry[]
    | undefined

  const setRole = useMutation(api.users.setRole)
  const setBatch = useMutation(api.skills.setBatch)
  const setSoftDeleted = useMutation(api.skills.setSoftDeleted)
  const hardDelete = useMutation(api.skills.hardDelete)
  const changeOwner = useMutation(api.skills.changeOwner)
  const setOfficialBadge = useMutation(api.skills.setOfficialBadge)
  const setDeprecatedBadge = useMutation(api.skills.setDeprecatedBadge)

  const [lookupSkill, setLookupSkill] = useState('')
  const [lookupUser, setLookupUser] = useState('')
  const [lookupOwnerHandle, setLookupOwnerHandle] = useState('')
  const [activeLookupUser, setActiveLookupUser] = useState<string | null>(null)
  const [similarForSkill, setSimilarForSkill] = useState<Id<'skills'> | null>(null)

  const lookupUserResult = useQuery(
    api.users.lookupByHandle,
    staff && activeLookupUser ? { handle: activeLookupUser } : 'skip',
  ) as Doc<'users'> | null | undefined

  const lookupUserSkills = useQuery(
    api.skills.listWithLatest,
    lookupUserResult ? { ownerUserId: lookupUserResult._id, limit: 25 } : 'skip',
  ) as
    | Array<{
        skill: PublicSkill
        latestVersion: Doc<'skillVersions'> | null
        ownerHandle?: string | null
      }>
    | undefined

  const findSimilarSkills = useAction(api.skills.findSimilarSkills)
  const [similarSkills, setSimilarSkills] = useState<SimilarSkillEntry[] | null>(null)
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false)

  const ownerLookupResult = useQuery(
    api.users.lookupByHandle,
    staff && lookupOwnerHandle.trim() ? { handle: lookupOwnerHandle.trim() } : 'skip',
  ) as Doc<'users'> | null | undefined

  const selectedSkillId = selectedSkill?.skill?._id ?? null
  const isDrawerOpen = Boolean(selectedSlug)

  const closeDrawer = () => {
    void navigate({ search: (prev) => ({ ...prev, skill: undefined }), replace: true })
  }

  useEffect(() => {
    if (!selectedSkillId) return
    setSimilarForSkill(null)
    setLookupOwnerHandle(selectedSkill?.owner?.handle ?? '')
  }, [selectedSkill?.owner?.handle, selectedSkillId])

  useEffect(() => {
    if (!similarForSkill) {
      setSimilarSkills(null)
      setIsLoadingSimilar(false)
      return
    }
    setIsLoadingSimilar(true)
    void findSimilarSkills({ skillId: similarForSkill, limit: 8 })
      .then((results) => setSimilarSkills(results as SimilarSkillEntry[]))
      .finally(() => setIsLoadingSimilar(false))
  }, [findSimilarSkills, similarForSkill])

  if (!staff) {
    return (
      <main className="py-10">
        <PageShell>
          <Card className="p-6 text-sm text-muted-foreground">Moderation only.</Card>
        </PageShell>
      </main>
    )
  }

  if (!reportedSkills) {
    return (
      <main className="py-10">
        <PageShell>
          <Card className="p-6 text-sm text-muted-foreground">Loading moderation console…</Card>
        </PageShell>
      </main>
    )
  }

  return (
    <main className="py-10">
      <PageShell className="space-y-8">
        <SectionHeader
          title="Moderation"
          description="Reported queue, lookup tools, and ownership controls."
        />

        <Sheet open={isDrawerOpen} onOpenChange={(open) => (!open ? closeDrawer() : undefined)}>
          <SheetContent className="w-full max-w-xl sm:max-w-2xl">
            <SheetHeader>
              <div className="flex items-center justify-between gap-3">
                <SheetTitle>{selectedSkill?.skill?.displayName ?? 'Selected skill'}</SheetTitle>
                <SheetClose asChild>
                  <Button variant="ghost" size="sm">
                    Close
                  </Button>
                </SheetClose>
              </div>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {selectedSkill === undefined ? (
                <div className="text-sm text-muted-foreground">Loading skill…</div>
              ) : !selectedSkill?.skill ? (
                <div className="text-sm text-muted-foreground">
                  No skill found for "{selectedSlug}".
                </div>
              ) : (
                (() => {
                  const { skill, owner, latestVersion } = selectedSkill
                  const ownerParam = resolveOwnerParam(
                    owner?.handle ?? null,
                    owner?._id ?? skill.ownerUserId,
                  )
                  const badgeMap = (skill as { badges?: SkillBadgeMap | null }).badges
                  const badges = getSkillBadges({ badges: badgeMap })
                  const isHighlighted = isSkillHighlighted({ badges: badgeMap })
                  const isOfficial = isSkillOfficial({ badges: badgeMap })
                  const isDeprecated = isSkillDeprecated({ badges: badgeMap })
                  return (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Link
                          to="/skills/$owner/$slug"
                          params={{ owner: ownerParam, slug: skill.slug }}
                          className="text-lg font-semibold"
                        >
                          {skill.displayName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          @{owner?.handle ?? owner?.name ?? 'user'} · v
                          {latestVersion?.version ?? '—'} · updated{' '}
                          {formatTimestamp(skill.updatedAt)}
                          {badges.length ? ` · ${badges.join(', ').toLowerCase()}` : ''}
                        </div>
                        {skill.moderationFlags?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {skill.moderationFlags.map((flag: string) => (
                              <Badge key={flag} variant="secondary">
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void setSoftDeleted({
                              skillId: skill._id,
                              deleted: !skill.softDeletedAt,
                            })
                          }
                        >
                          {skill.softDeletedAt ? 'Restore' : 'Hide'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void setBatch({
                              skillId: skill._id,
                              batch: isHighlighted ? undefined : 'highlighted',
                            })
                          }
                        >
                          {isHighlighted ? 'Unhighlight' : 'Highlight'}
                        </Button>
                        {admin ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void setOfficialBadge({
                                  skillId: skill._id,
                                  official: !isOfficial,
                                })
                              }
                            >
                              {isOfficial ? 'Remove official' : 'Mark official'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void setDeprecatedBadge({
                                  skillId: skill._id,
                                  deprecated: !isDeprecated,
                                })
                              }
                            >
                              {isDeprecated ? 'Remove deprecated' : 'Mark deprecated'}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!window.confirm(`Hard delete ${skill.displayName}?`)) return
                                void hardDelete({ skillId: skill._id })
                              }}
                            >
                              Hard delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSimilarForSkill(skill._id)}
                          >
                            Find similar skills
                          </Button>
                          {similarForSkill === skill._id ? (
                            isLoadingSimilar ? (
                              <div className="text-xs text-muted-foreground">
                                Loading similar skills…
                              </div>
                            ) : !similarSkills ? null : similarSkills.length === 0 ? (
                              <div className="text-xs text-muted-foreground">
                                No similar skills found.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {similarSkills.map((entry) => (
                                  <div
                                    key={entry.skill._id}
                                    className="rounded-[var(--radius)] border border-border p-3 text-xs"
                                  >
                                    <Link
                                      to="/skills/$owner/$slug"
                                      params={{
                                        owner: entry.ownerHandle ?? String(entry.skill.ownerUserId),
                                        slug: entry.skill.slug,
                                      }}
                                      className="font-medium"
                                    >
                                      {entry.skill.displayName}
                                    </Link>
                                    <div className="text-muted-foreground">
                                      @{entry.ownerHandle ?? 'user'} · v
                                      {entry.latestVersion?.version ?? '—'} · score{' '}
                                      {entry.score.toFixed(3)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : null}
                        </div>
                        {admin ? (
                          <div className="space-y-2">
                            <label
                              className="text-xs font-medium"
                              htmlFor="moderation-owner-handle"
                            >
                              Owner handle
                            </label>
                            <Input
                              id="moderation-owner-handle"
                              value={lookupOwnerHandle}
                              onChange={(event) => setLookupOwnerHandle(event.target.value)}
                              placeholder="new owner handle"
                            />
                            {lookupOwnerHandle.trim() ? (
                              <div className="text-xs text-muted-foreground">
                                {ownerLookupResult
                                  ? `Resolved @${ownerLookupResult.handle ?? ownerLookupResult.name ?? 'user'}`
                                  : 'No user found.'}
                              </div>
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!ownerLookupResult}
                              onClick={() =>
                                ownerLookupResult
                                  ? void changeOwner({
                                      skillId: skill._id,
                                      ownerUserId: ownerLookupResult._id,
                                    })
                                  : undefined
                              }
                            >
                              Change owner
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Tabs
          value={tab}
          onValueChange={(value) =>
            void navigate({
              search: (prev) => ({ ...prev, tab: value as typeof tab }),
              replace: true,
            })
          }
        >
          <TabsList>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="lookup">Lookup</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-6">
            <Card className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Reported skills</h2>
                {selectedSlug ? (
                  <Link to="/moderation" search={{ skill: undefined, tab }}>
                    <Button variant="outline" size="sm">
                      Clear selection
                    </Button>
                  </Link>
                ) : null}
              </div>
              <div className="space-y-3">
                {reportedSkills.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No reports yet.</div>
                ) : (
                  reportedSkills.map((entry) => {
                    const { skill, latestVersion, owner, reportStats } = entry
                    const ownerParam = resolveOwnerParam(
                      owner?.handle ?? null,
                      owner?._id ?? skill.ownerUserId,
                    )
                    return (
                      <div
                        key={skill._id}
                        className="flex flex-col gap-3 rounded-[var(--radius)] border border-border p-4"
                      >
                        <div className="space-y-1">
                          <Link
                            to="/skills/$owner/$slug"
                            params={{ owner: ownerParam, slug: skill.slug }}
                            className="font-medium"
                          >
                            {skill.displayName}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            @{owner?.handle ?? owner?.name ?? 'user'} · v
                            {latestVersion?.version ?? '—'} · {reportStats.reportCount} report
                            {reportStats.reportCount === 1 ? '' : 's'}
                            {reportStats.lastReportedAt
                              ? ` · last ${formatTimestamp(reportStats.lastReportedAt)}`
                              : ''}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link to="/moderation" search={{ skill: skill.slug, tab }}>
                            <Button variant="outline" size="sm">
                              Manage
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void setSoftDeleted({
                                skillId: skill._id,
                                deleted: !skill.softDeletedAt,
                              })
                            }
                          >
                            {skill.softDeletedAt ? 'Restore' : 'Hide'}
                          </Button>
                          {admin ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!window.confirm(`Hard delete ${skill.displayName}?`)) return
                                void hardDelete({ skillId: skill._id })
                              }}
                            >
                              Hard delete
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="space-y-4 p-6">
              <h2 className="font-display text-lg font-semibold">Reports</h2>
              <div className="space-y-3">
                {reportedSkills.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No reports yet.</div>
                ) : (
                  reportedSkills.map((entry) => {
                    const { skill, latestVersion, owner, reportStats } = entry
                    const ownerParam = resolveOwnerParam(
                      owner?.handle ?? null,
                      owner?._id ?? skill.ownerUserId,
                    )
                    return (
                      <div
                        key={skill._id}
                        className="flex flex-col gap-3 rounded-[var(--radius)] border border-border p-4"
                      >
                        <div className="space-y-1">
                          <Link
                            to="/skills/$owner/$slug"
                            params={{ owner: ownerParam, slug: skill.slug }}
                            className="font-medium"
                          >
                            {skill.displayName}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            @{owner?.handle ?? owner?.name ?? 'user'} · v
                            {latestVersion?.version ?? '—'} · {reportStats.reportCount} report
                            {reportStats.reportCount === 1 ? '' : 's'}
                            {reportStats.lastReportedAt
                              ? ` · last ${formatTimestamp(reportStats.lastReportedAt)}`
                              : ''}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void setSoftDeleted({
                                skillId: skill._id,
                                deleted: !skill.softDeletedAt,
                              })
                            }
                          >
                            {skill.softDeletedAt ? 'Restore' : 'Hide'}
                          </Button>
                          {admin ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!window.confirm(`Hard delete ${skill.displayName}?`)) return
                                void hardDelete({ skillId: skill._id })
                              }}
                            >
                              Hard delete
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="lookup" className="space-y-6">
            <Card className="space-y-4 p-6">
              <h2 className="font-display text-lg font-semibold">Lookup</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium" htmlFor="moderation-skill-slug">
                    Skill slug
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      id="moderation-skill-slug"
                      value={lookupSkill}
                      onChange={(event) => setLookupSkill(event.target.value)}
                      placeholder="skill slug"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!lookupSkill.trim()}
                      onClick={() =>
                        void navigate({
                          search: (prev) => ({
                            ...prev,
                            skill: lookupSkill.trim(),
                            tab: 'lookup',
                          }),
                        })
                      }
                    >
                      Open
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium" htmlFor="moderation-user-handle">
                    User handle
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      id="moderation-user-handle"
                      value={lookupUser}
                      onChange={(event) => setLookupUser(event.target.value)}
                      placeholder="user handle"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!lookupUser.trim()}
                      onClick={() => setActiveLookupUser(lookupUser.trim())}
                    >
                      Find
                    </Button>
                  </div>
                  {activeLookupUser && lookupUserResult === undefined ? (
                    <div className="text-xs text-muted-foreground">Loading user…</div>
                  ) : null}
                </div>
              </div>

              {lookupUserResult ? (
                <div className="space-y-4">
                  <div className="rounded-[var(--radius)] border border-border p-4">
                    <div className="font-medium">
                      @{lookupUserResult.handle ?? lookupUserResult.name ?? 'user'}
                    </div>
                    <div className="text-xs text-muted-foreground">{lookupUserResult._id}</div>
                    {admin ? (
                      <div className="mt-3">
                        <Select
                          value={lookupUserResult.role ?? 'user'}
                          onValueChange={(value) => {
                            if (value === 'admin' || value === 'moderator' || value === 'user') {
                              void setRole({ userId: lookupUserResult._id, role: value })
                            }
                          }}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Skills</h3>
                    {!lookupUserSkills ? (
                      <div className="text-xs text-muted-foreground">Loading skills…</div>
                    ) : lookupUserSkills.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No skills found.</div>
                    ) : (
                      <div className="space-y-2">
                        {lookupUserSkills.map((entry) => (
                          <div
                            key={entry.skill._id}
                            className="flex flex-col gap-2 rounded-[var(--radius)] border border-border p-3"
                          >
                            <Link
                              to="/skills/$owner/$slug"
                              params={{
                                owner: entry.ownerHandle ?? String(entry.skill.ownerUserId),
                                slug: entry.skill.slug,
                              }}
                              className="text-sm font-medium"
                            >
                              {entry.skill.displayName}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              v{entry.latestVersion?.version ?? '—'} · updated{' '}
                              {formatTimestamp(entry.skill.updatedAt)}
                            </div>
                            <div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void navigate({
                                    search: (prev) => ({
                                      ...prev,
                                      skill: entry.skill.slug,
                                      tab: 'lookup',
                                    }),
                                  })
                                }
                              >
                                Manage
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeLookupUser ? (
                <div className="text-xs text-muted-foreground">No user found.</div>
              ) : null}
            </Card>
          </TabsContent>
        </Tabs>
      </PageShell>
    </main>
  )
}

function formatTimestamp(value: number) {
  return new Date(value).toLocaleString()
}
