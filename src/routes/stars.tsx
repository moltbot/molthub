import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/stars')({
  component: Stars,
})

function Stars() {
  const me = useQuery(api.users.me)
  const skills =
    (useQuery(api.stars.listByUser, me ? { userId: me._id, limit: 50 } : 'skip') as
      | Doc<'skills'>[]
      | undefined) ?? []

  const toggleStar = useMutation(api.stars.toggle)

  if (!me) {
    return (
      <main className="section">
        <div className="card">Sign in to see your highlights.</div>
      </main>
    )
  }

  return (
    <main className="section">
      <h1 className="section-title">Your highlights</h1>
      <p className="section-subtitle">Skills you've starred for quick access.</p>
      <div className="grid">
        {skills.length === 0 ? (
          <div className="card">No stars yet.</div>
        ) : (
          skills.map((skill) => (
            <div key={skill._id} className="card">
              <Link to="/skills/$slug" params={{ slug: skill.slug }} className="card-link">
                <h3 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                  {skill.displayName}
                </h3>
              </Link>
              <div className="card-actions">
                <span className="stat">⭐ {skill.stats.stars}</span>
                <button
                  className="button button-small"
                  onClick={() => void toggleStar({ skillId: skill._id })}
                >
                  Unstar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
