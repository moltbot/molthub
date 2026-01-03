import { createFileRoute, Link } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/search')({
  component: Search,
})

function Search() {
  const searchSkills = useAction(api.search.searchSkills)
  const [query, setQuery] = useState('')
  const [approvedOnly, setApprovedOnly] = useState(true)
  const [results, setResults] = useState<
    Array<{ skill: Doc<'skills'>; version: Doc<'skillVersions'> | null; score: number }>
  >([])
  const [isSearching, setIsSearching] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    setIsSearching(true)
    try {
      const data = (await searchSkills({ query, approvedOnly })) as Array<{
        skill: Doc<'skills'>
        version: Doc<'skillVersions'> | null
        score: number
      }>
      setResults(data)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <main className="section">
      <h1 className="section-title">Vector search</h1>
      <p className="section-subtitle">Ask for capabilities, get skill packs.</p>
      <form onSubmit={onSubmit} className="search-bar" style={{ marginBottom: 20 }}>
        <input
          className="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. summarize PDFs, book travel, scrape web"
        />
        <button className="btn btn-primary" type="submit" disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </form>
      <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={approvedOnly}
          onChange={(event) => setApprovedOnly(event.target.checked)}
        />
        Only redaction-approved skills
      </label>

      <div className="grid" style={{ marginTop: 24 }}>
        {results.length === 0 ? (
          <div className="card">No results yet. Try a different prompt.</div>
        ) : (
          results.map((result) => (
            <Link
              key={result.skill._id}
              to="/skills/$slug"
              params={{ slug: result.skill.slug }}
              className="card"
            >
              <div className="tag">Score {(result.score ?? 0).toFixed(2)}</div>
              <h3 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                {result.skill.displayName}
              </h3>
              <p className="section-subtitle" style={{ margin: 0 }}>
                {result.skill.summary ?? 'Skill pack'}
              </p>
              {result.skill.badges?.redactionApproved ? (
                <div className="tag">Redaction approved</div>
              ) : null}
            </Link>
          ))
        )}
      </div>
    </main>
  )
}
