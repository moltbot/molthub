import { createFileRoute } from '@tanstack/react-router'
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'

export const Route = createFileRoute('/skills/$slug')({
  component: SkillDetail,
})

function SkillDetail() {
  const { slug } = Route.useParams()
  const { isAuthenticated } = useConvexAuth()
  const me = useQuery(api.users.me)
  const result = useQuery(api.skills.getBySlug, { slug })
  const toggleStar = useMutation(api.stars.toggle)
  const addComment = useMutation(api.comments.add)
  const removeComment = useMutation(api.comments.remove)
  const updateTags = useMutation(api.skills.updateTags)
  const getReadme = useAction(api.skills.getReadme)
  const [readme, setReadme] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [tagName, setTagName] = useState('latest')
  const [tagVersionId, setTagVersionId] = useState<Id<'skillVersions'> | ''>('')

  const skill = result?.skill
  const owner = result?.owner
  const latestVersion = result?.latestVersion
  const versions = useQuery(
    api.skills.listVersions,
    skill ? { skillId: skill._id, limit: 10 } : 'skip',
  )

  const isStarred = useQuery(
    api.stars.isStarred,
    isAuthenticated && skill ? { skillId: skill._id } : 'skip',
  )
  const comments = useQuery(
    api.comments.listBySkill,
    skill ? { skillId: skill._id, limit: 50 } : 'skip',
  )

  const canManage = Boolean(
    me && skill && (me._id === skill.ownerUserId || ['admin', 'moderator'].includes(me.role ?? '')),
  )

  const versionById = new Map((versions ?? []).map((version) => [version._id, version]))

  useEffect(() => {
    if (!latestVersion) return
    void getReadme({ versionId: latestVersion._id }).then((data) => {
      setReadme(data.text)
    })
  }, [latestVersion, getReadme])

  useEffect(() => {
    if (!tagVersionId && latestVersion) {
      setTagVersionId(latestVersion._id)
    }
  }, [latestVersion, tagVersionId])

  if (!skill) {
    return (
      <main className="section">
        <div className="card">Skill not found.</div>
      </main>
    )
  }

  return (
    <main className="section">
      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <h1 className="section-title" style={{ margin: 0 }}>
              {skill.displayName}
            </h1>
            <p className="section-subtitle">{skill.summary ?? 'No summary provided.'}</p>
            <div className="stat">
              ⭐ {skill.stats.stars} · ⤓ {skill.stats.downloads} · v{latestVersion?.version}
            </div>
            {owner?.handle ? (
              <div className="stat">
                by <a href={`/u/${owner.handle}`}>@{owner.handle}</a>
              </div>
            ) : null}
            {skill.badges.redactionApproved ? <div className="tag">Redaction approved</div> : null}
            {isAuthenticated ? (
              <button
                className="btn"
                type="button"
                onClick={() => void toggleStar({ skillId: skill._id })}
              >
                {isStarred ? 'Unstar' : 'Star'}
              </button>
            ) : null}
          </div>
          <div className="card">
            <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
              SKILL.md
            </h2>
            <div className="markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme ?? 'Loading…'}</ReactMarkdown>
            </div>
          </div>
          <div className="card">
            <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
              Comments
            </h2>
            {isAuthenticated ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!comment.trim()) return
                  void addComment({ skillId: skill._id, body: comment.trim() }).then(() =>
                    setComment(''),
                  )
                }}
                style={{ display: 'grid', gap: 10, marginTop: 12 }}
              >
                <textarea
                  className="search-input"
                  rows={2}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Leave a note…"
                />
                <button className="btn" type="submit">
                  Post comment
                </button>
              </form>
            ) : (
              <p className="section-subtitle">Sign in to comment.</p>
            )}
            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {(comments ?? []).length === 0 ? (
                <div className="stat">No comments yet.</div>
              ) : (
                (comments ?? []).map(
                  (entry: { comment: Doc<'comments'>; user: Doc<'users'> | null }) => (
                    <div
                      key={entry.comment._id}
                      className="stat"
                      style={{ alignItems: 'flex-start' }}
                    >
                      <div>
                        <strong>@{entry.user?.handle ?? entry.user?.name ?? 'user'}</strong>
                        <div style={{ color: '#5c554e' }}>{entry.comment.body}</div>
                      </div>
                      {isAuthenticated &&
                      me &&
                      (me._id === entry.comment.userId ||
                        me.role === 'admin' ||
                        me.role === 'moderator') ? (
                        <button
                          className="btn"
                          type="button"
                          onClick={() => void removeComment({ commentId: entry.comment._id })}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="card">
            <h3 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
              Versions
            </h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {(versions ?? []).map((version) => (
                <div key={version._id} className="stat" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div>
                      v{version.version} · {new Date(version.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ color: '#5c554e' }}>{version.changelog}</div>
                  </div>
                  <a
                    className="btn"
                    href={`${import.meta.env.VITE_CONVEX_SITE_URL}/api/download?slug=${skill.slug}&version=${version.version}`}
                  >
                    Zip
                  </a>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
              Tags
            </h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(skill.tags ?? {}).map(([tag, versionId]) => (
                <div key={tag} className="stat">
                  <strong>{tag}</strong>
                  <span>{versionById.get(versionId)?.version ?? versionId}</span>
                </div>
              ))}
            </div>
          </div>
          {canManage ? (
            <div className="card">
              <h3 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                Rollback / tag
              </h3>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!tagName.trim() || !tagVersionId) return
                  void updateTags({
                    skillId: skill._id,
                    tags: [{ tag: tagName.trim(), versionId: tagVersionId }],
                  })
                }}
                style={{ display: 'grid', gap: 10, marginTop: 10 }}
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
                  onChange={(event) => setTagVersionId(event.target.value)}
                >
                  {(versions ?? []).map((version) => (
                    <option key={version._id} value={version._id}>
                      v{version.version}
                    </option>
                  ))}
                </select>
                <button className="btn" type="submit">
                  Update tag
                </button>
              </form>
            </div>
          ) : null}
          <div className="card">
            <h3 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
              Download
            </h3>
            <a
              className="btn btn-primary"
              href={`${import.meta.env.VITE_CONVEX_SITE_URL}/api/download?slug=${skill.slug}`}
            >
              Download zip
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
