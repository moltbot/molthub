import { useNavigate } from '@tanstack/react-router'
import type { ClawdisSkillMetadata } from 'clawdhub-schema'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Doc, Id } from '../../convex/_generated/dataModel'
import { useAuthStatus } from '../lib/useAuthStatus'
import { SkillCommentsPanel } from './SkillCommentsPanel'
import { SkillDetailTabs } from './SkillDetailTabs'
import {
  buildSkillHref,
  formatConfigSnippet,
  formatInstallCommand,
  formatInstallLabel,
  formatNixInstallSnippet,
  formatOsList,
  stripFrontmatter,
} from './skillDetailUtils'

type SkillDetailPageProps = {
  slug: string
  canonicalOwner?: string
  redirectToCanonical?: boolean
}

type SkillFile = Doc<'skillVersions'>['files'][number]

export function SkillDetailPage({
  slug,
  canonicalOwner,
  redirectToCanonical,
}: SkillDetailPageProps) {
  const navigate = useNavigate()
  const { isAuthenticated, me } = useAuthStatus()
  const result = useQuery(api.skills.getBySlug, { slug })
  const toggleStar = useMutation(api.stars.toggle)
  const updateTags = useMutation(api.skills.updateTags)
  const setBatch = useMutation(api.skills.setBatch)
  const getReadme = useAction(api.skills.getReadme)
  const [readme, setReadme] = useState<string | null>(null)
  const [readmeError, setReadmeError] = useState<string | null>(null)
  const [tagName, setTagName] = useState('latest')
  const [tagVersionId, setTagVersionId] = useState<Id<'skillVersions'> | ''>('')
  const [activeTab, setActiveTab] = useState<'files' | 'compare' | 'versions'>('files')

  const isLoadingSkill = result === undefined
  const skill = result?.skill
  const owner = result?.owner
  const latestVersion = result?.latestVersion
  const versions = useQuery(
    api.skills.listVersions,
    skill ? { skillId: skill._id, limit: 50 } : 'skip',
  ) as Doc<'skillVersions'>[] | undefined
  const diffVersions = useQuery(
    api.skills.listVersions,
    skill ? { skillId: skill._id, limit: 200 } : 'skip',
  ) as Doc<'skillVersions'>[] | undefined

  const isStarred = useQuery(
    api.stars.isStarred,
    isAuthenticated && skill ? { skillId: skill._id } : 'skip',
  )
  const canManage = Boolean(
    me && skill && (me._id === skill.ownerUserId || ['admin', 'moderator'].includes(me.role ?? '')),
  )
  const canHighlight = Boolean(me && ['admin', 'moderator'].includes(me.role ?? ''))

  const ownerHandle = owner?.handle ?? owner?.name ?? null
  const wantsCanonicalRedirect = Boolean(
    ownerHandle &&
      (redirectToCanonical ||
        (typeof canonicalOwner === 'string' && canonicalOwner && canonicalOwner !== ownerHandle)),
  )

  const forkOf = result?.forkOf ?? null
  const canonical = result?.canonical ?? null
  const forkOfLabel = forkOf?.kind === 'duplicate' ? 'duplicate of' : 'fork of'
  const forkOfOwnerHandle = forkOf?.owner?.handle ?? null
  const canonicalOwnerHandle = canonical?.owner?.handle ?? null
  const forkOfHref = forkOf?.skill?.slug
    ? buildSkillHref(forkOfOwnerHandle, forkOf.skill.slug)
    : null
  const canonicalHref =
    canonical?.skill?.slug && canonical.skill.slug !== forkOf?.skill?.slug
      ? buildSkillHref(canonicalOwnerHandle, canonical.skill.slug)
      : null

  useEffect(() => {
    if (!wantsCanonicalRedirect || !ownerHandle) return
    void navigate({
      to: '/$owner/$slug',
      params: { owner: ownerHandle, slug },
      replace: true,
    })
  }, [navigate, ownerHandle, slug, wantsCanonicalRedirect])

  const versionById = new Map<Id<'skillVersions'>, Doc<'skillVersions'>>(
    (diffVersions ?? versions ?? []).map((version) => [version._id, version]),
  )
  const clawdis = (latestVersion?.parsed as { clawdis?: ClawdisSkillMetadata } | undefined)?.clawdis
  const osLabels = useMemo(() => formatOsList(clawdis?.os), [clawdis?.os])
  const requirements = clawdis?.requires
  const installSpecs = clawdis?.install ?? []
  const nixPlugin = clawdis?.nix?.plugin
  const nixSystems = clawdis?.nix?.systems ?? []
  const nixSnippet = nixPlugin ? formatNixInstallSnippet(nixPlugin) : null
  const configRequirements = clawdis?.config
  const configExample = configRequirements?.example
    ? formatConfigSnippet(configRequirements.example)
    : null
  const cliHelp = clawdis?.cliHelp
  const hasRuntimeRequirements = Boolean(
    clawdis?.emoji ||
      osLabels.length ||
      requirements?.bins?.length ||
      requirements?.anyBins?.length ||
      requirements?.env?.length ||
      requirements?.config?.length ||
      clawdis?.primaryEnv,
  )
  const hasInstallSpecs = installSpecs.length > 0
  const hasPluginBundle = Boolean(nixSnippet || configRequirements || cliHelp)
  const readmeContent = useMemo(() => {
    if (!readme) return null
    return stripFrontmatter(readme)
  }, [readme])
  const latestFiles: SkillFile[] = latestVersion?.files ?? []

  useEffect(() => {
    if (!latestVersion) return
    setReadme(null)
    setReadmeError(null)
    let cancelled = false
    void getReadme({ versionId: latestVersion._id })
      .then((data) => {
        if (cancelled) return
        setReadme(data.text)
      })
      .catch((error) => {
        if (cancelled) return
        setReadmeError(error instanceof Error ? error.message : 'Failed to load README')
        setReadme(null)
      })
    return () => {
      cancelled = true
    }
  }, [latestVersion, getReadme])

  useEffect(() => {
    if (!tagVersionId && latestVersion) {
      setTagVersionId(latestVersion._id)
    }
  }, [latestVersion, tagVersionId])

  if (isLoadingSkill || wantsCanonicalRedirect) {
    return (
      <main className="section">
        <div className="card">
          <div className="loading-indicator">Loading skill…</div>
        </div>
      </main>
    )
  }

  if (result === null || !skill) {
    return (
      <main className="section">
        <div className="card">Skill not found.</div>
      </main>
    )
  }

  const tagEntries = Object.entries(skill.tags ?? {}) as Array<[string, Id<'skillVersions'>]>

  return (
    <main className="section">
      <div className="skill-detail-stack">
        <div className="card skill-hero">
          <div className={`skill-hero-top${hasPluginBundle ? ' has-plugin' : ''}`}>
            <div className="skill-hero-header">
              <div className="skill-hero-title">
                <div className="skill-hero-title-row">
                  <h1 className="section-title" style={{ margin: 0 }}>
                    {skill.displayName}
                  </h1>
                  {nixPlugin ? <span className="tag tag-accent">Plugin bundle (nix)</span> : null}
                </div>
                <p className="section-subtitle">{skill.summary ?? 'No summary provided.'}</p>

                {nixPlugin ? (
                  <div className="skill-hero-note">
                    Bundles the skill pack, CLI binary, and config requirements in one Nix install.
                  </div>
                ) : null}
                <div className="stat">
                  ⭐ {skill.stats.stars} · ⤓ {skill.stats.downloads} · ⤒{' '}
                  {skill.stats.installsCurrent ?? 0} current · {skill.stats.installsAllTime ?? 0}{' '}
                  all-time
                </div>
                {owner?.handle ? (
                  <div className="stat">
                    by <a href={`/u/${owner.handle}`}>@{owner.handle}</a>
                  </div>
                ) : null}
                {forkOf && forkOfHref ? (
                  <div className="stat">
                    {forkOfLabel}{' '}
                    <a href={forkOfHref}>
                      {forkOfOwnerHandle ? `@${forkOfOwnerHandle}/` : ''}
                      {forkOf.skill.slug}
                    </a>
                    {forkOf.version ? ` (based on ${forkOf.version})` : null}
                  </div>
                ) : null}
                {canonicalHref ? (
                  <div className="stat">
                    canonical:{' '}
                    <a href={canonicalHref}>
                      {canonicalOwnerHandle ? `@${canonicalOwnerHandle}/` : ''}
                      {canonical?.skill?.slug}
                    </a>
                  </div>
                ) : null}
                {skill.batch === 'highlighted' ? <div className="tag">Highlighted</div> : null}
                <div className="skill-actions">
                  {isAuthenticated ? (
                    <button
                      className={`star-toggle${isStarred ? ' is-active' : ''}`}
                      type="button"
                      onClick={() => void toggleStar({ skillId: skill._id })}
                      aria-label={isStarred ? 'Unstar skill' : 'Star skill'}
                    >
                      <span aria-hidden="true">★</span>
                    </button>
                  ) : null}
                  {canHighlight ? (
                    <button
                      className={`highlight-toggle${skill.batch === 'highlighted' ? ' is-active' : ''}`}
                      type="button"
                      onClick={() =>
                        void setBatch({
                          skillId: skill._id,
                          batch: skill.batch === 'highlighted' ? undefined : 'highlighted',
                        })
                      }
                      aria-label={
                        skill.batch === 'highlighted' ? 'Unhighlight skill' : 'Highlight skill'
                      }
                    >
                      <span aria-hidden="true">✦</span>
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="skill-hero-cta">
                <div className="skill-version-pill">
                  <span className="skill-version-label">Current version</span>
                  <strong>v{latestVersion?.version ?? '—'}</strong>
                </div>
                {!nixPlugin ? (
                  <a
                    className="btn btn-primary"
                    href={`${import.meta.env.VITE_CONVEX_SITE_URL}/api/v1/download?slug=${skill.slug}`}
                  >
                    Download zip
                  </a>
                ) : null}
              </div>
            </div>
            {hasPluginBundle ? (
              <div className="skill-panel bundle-card">
                <div className="bundle-header">
                  <div className="bundle-title">Plugin bundle (nix)</div>
                  <div className="bundle-subtitle">Skill pack · CLI binary · Config</div>
                </div>
                <div className="bundle-includes">
                  <span>SKILL.md</span>
                  <span>CLI</span>
                  <span>Config</span>
                </div>
                {configRequirements ? (
                  <div className="bundle-section">
                    <div className="bundle-section-title">Config requirements</div>
                    <div className="bundle-meta">
                      {configRequirements.requiredEnv?.length ? (
                        <div className="stat">
                          <strong>Required env</strong>
                          <span>{configRequirements.requiredEnv.join(', ')}</span>
                        </div>
                      ) : null}
                      {configRequirements.stateDirs?.length ? (
                        <div className="stat">
                          <strong>State dirs</strong>
                          <span>{configRequirements.stateDirs.join(', ')}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {cliHelp ? (
                  <details className="bundle-section bundle-details">
                    <summary>CLI help (from plugin)</summary>
                    <pre className="hero-install-code mono">{cliHelp}</pre>
                  </details>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="skill-tag-row">
            {tagEntries.length === 0 ? (
              <span className="section-subtitle" style={{ margin: 0 }}>
                No tags yet.
              </span>
            ) : (
              tagEntries.map(([tag, versionId]) => (
                <span key={tag} className="tag">
                  {tag}
                  <span className="tag-meta">
                    v{versionById.get(versionId)?.version ?? versionId}
                  </span>
                </span>
              ))
            )}
          </div>
          {canManage ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (!tagName.trim() || !tagVersionId) return
                void updateTags({
                  skillId: skill._id,
                  tags: [{ tag: tagName.trim(), versionId: tagVersionId }],
                })
              }}
              className="tag-form"
            >
              <input
                className="search-input"
                value={tagName}
                onChange={(event) => setTagName(event.target.value)}
                placeholder="latest"
              />
              <select
                className="search-input"
                value={tagVersionId ?? ''}
                onChange={(event) => setTagVersionId(event.target.value as Id<'skillVersions'>)}
              >
                {(diffVersions ?? []).map((version) => (
                  <option key={version._id} value={version._id}>
                    v{version.version}
                  </option>
                ))}
              </select>
              <button className="btn" type="submit">
                Update tag
              </button>
            </form>
          ) : null}
          {hasRuntimeRequirements || hasInstallSpecs ? (
            <div className="skill-hero-content">
              <div className="skill-hero-panels">
                {hasRuntimeRequirements ? (
                  <div className="skill-panel">
                    <h3 className="section-title" style={{ fontSize: '1rem', margin: 0 }}>
                      Runtime requirements
                    </h3>
                    <div className="skill-panel-body">
                      {clawdis?.emoji ? <div className="tag">{clawdis.emoji} Clawdis</div> : null}
                      {osLabels.length ? (
                        <div className="stat">
                          <strong>OS</strong>
                          <span>{osLabels.join(' · ')}</span>
                        </div>
                      ) : null}
                      {requirements?.bins?.length ? (
                        <div className="stat">
                          <strong>Bins</strong>
                          <span>{requirements.bins.join(', ')}</span>
                        </div>
                      ) : null}
                      {requirements?.anyBins?.length ? (
                        <div className="stat">
                          <strong>Any bin</strong>
                          <span>{requirements.anyBins.join(', ')}</span>
                        </div>
                      ) : null}
                      {requirements?.env?.length ? (
                        <div className="stat">
                          <strong>Env</strong>
                          <span>{requirements.env.join(', ')}</span>
                        </div>
                      ) : null}
                      {requirements?.config?.length ? (
                        <div className="stat">
                          <strong>Config</strong>
                          <span>{requirements.config.join(', ')}</span>
                        </div>
                      ) : null}
                      {clawdis?.primaryEnv ? (
                        <div className="stat">
                          <strong>Primary env</strong>
                          <span>{clawdis.primaryEnv}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {hasInstallSpecs ? (
                  <div className="skill-panel">
                    <h3 className="section-title" style={{ fontSize: '1rem', margin: 0 }}>
                      Install
                    </h3>
                    <div className="skill-panel-body">
                      {installSpecs.map((spec, index) => {
                        const command = formatInstallCommand(spec)
                        return (
                          <div key={`${spec.id ?? spec.kind}-${index}`} className="stat">
                            <div>
                              <strong>{spec.label ?? formatInstallLabel(spec)}</strong>
                              {spec.bins?.length ? (
                                <div style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                                  Bins: {spec.bins.join(', ')}
                                </div>
                              ) : null}
                              {command ? <code>{command}</code> : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        {nixSnippet ? (
          <div className="card">
            <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
              Install via Nix
            </h2>
            <p className="section-subtitle" style={{ margin: 0 }}>
              {nixSystems.length ? `Systems: ${nixSystems.join(', ')}` : 'nix-clawdbot'}
            </p>
            <pre className="hero-install-code" style={{ marginTop: 12 }}>
              {nixSnippet}
            </pre>
          </div>
        ) : null}
        {configExample ? (
          <div className="card">
            <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
              Config example
            </h2>
            <p className="section-subtitle" style={{ margin: 0 }}>
              Starter config for this plugin bundle.
            </p>
            <pre className="hero-install-code" style={{ marginTop: 12 }}>
              {configExample}
            </pre>
          </div>
        ) : null}
        <SkillDetailTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          readmeContent={readmeContent}
          readmeError={readmeError}
          latestFiles={latestFiles}
          latestVersionId={latestVersion?._id ?? null}
          skill={skill}
          diffVersions={diffVersions}
          versions={versions}
          nixPlugin={Boolean(nixPlugin)}
        />
        <SkillCommentsPanel skillId={skill._id} isAuthenticated={isAuthenticated} me={me ?? null} />
      </div>
    </main>
  )
}
