import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction, useConvexAuth, useMutation } from 'convex/react'
import semver from 'semver'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { expandFiles } from '../lib/uploadFiles'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const Route = createFileRoute('/upload')({
  component: Upload,
})

export function Upload() {
  const { isAuthenticated } = useConvexAuth()
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl)
  const publishVersion = useAction(api.skills.publishVersion)
  const [files, setFiles] = useState<File[]>([])
  const [slug, setSlug] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [version, setVersion] = useState('1.0.0')
  const [tags, setTags] = useState('latest')
  const [changelog, setChangelog] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const validationRef = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const maxBytes = 50 * 1024 * 1024
  const totalBytes = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files])
  const hasSkillFile = useMemo(
    () =>
      files.some(
        (file) => file.name.toLowerCase() === 'skill.md' || file.name.toLowerCase() === 'skills.md',
      ),
    [files],
  )
  const sizeLabel = totalBytes ? formatBytes(totalBytes) : '0 B'
  const trimmedSlug = slug.trim()
  const trimmedName = displayName.trim()
  const trimmedChangelog = changelog.trim()
  const parsedTags = useMemo(
    () =>
      tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tags],
  )
  const validation = useMemo(() => {
    const issues: string[] = []
    if (!trimmedSlug) {
      issues.push('Slug is required.')
    } else if (!SLUG_PATTERN.test(trimmedSlug)) {
      issues.push('Slug must be lowercase and use dashes only.')
    }
    if (!trimmedName) {
      issues.push('Display name is required.')
    }
    if (!semver.valid(version)) {
      issues.push('Version must be valid semver (e.g. 1.0.0).')
    }
    if (parsedTags.length === 0) {
      issues.push('At least one tag is required.')
    }
    if (!trimmedChangelog) {
      issues.push('Changelog is required.')
    }
    if (files.length === 0) {
      issues.push('Add at least one file.')
    }
    if (!hasSkillFile) {
      issues.push('SKILL.md is required.')
    }
    if (totalBytes > maxBytes) {
      issues.push('Total file size exceeds 50MB.')
    }
    return {
      issues,
      ready: issues.length === 0,
    }
  }, [
    trimmedSlug,
    trimmedName,
    version,
    parsedTags.length,
    trimmedChangelog,
    files.length,
    hasSkillFile,
    totalBytes,
    maxBytes,
  ])

  useEffect(() => {
    if (!fileInputRef.current) return
    fileInputRef.current.setAttribute('webkitdirectory', '')
    fileInputRef.current.setAttribute('directory', '')
  }, [])

  if (!isAuthenticated) {
    return (
      <main className="section">
        <div className="card">Sign in to upload a skill.</div>
      </main>
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!validation.ready) {
      if (validationRef.current && 'scrollIntoView' in validationRef.current) {
        validationRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setError(null)
    if (totalBytes > maxBytes) {
      setError('Total size exceeds 50MB per version.')
      return
    }
    if (!hasSkillFile) {
      setError('SKILL.md is required.')
      return
    }
    setStatus('Uploading files…')

    const uploaded = [] as Array<{
      path: string
      size: number
      storageId: string
      sha256: string
      contentType?: string
    }>

    for (const file of files) {
      const uploadUrl = await generateUploadUrl()
      const storageId = await uploadFile(uploadUrl, file)
      const sha256 = await hashFile(file)
      const path = file.webkitRelativePath || file.name
      uploaded.push({
        path,
        size: file.size,
        storageId,
        sha256,
        contentType: file.type || undefined,
      })
    }

    setStatus('Publishing version…')
    try {
      await publishVersion({
        slug: trimmedSlug,
        displayName: trimmedName,
        version,
        changelog: trimmedChangelog,
        tags: parsedTags,
        files: uploaded,
      })
      setStatus('Published.')
      void navigate({ to: '/skills/$slug', params: { slug: trimmedSlug } })
    } catch (publishError) {
      const message = formatPublishError(publishError)
      setError(message)
      setStatus(null)
      if (validationRef.current && 'scrollIntoView' in validationRef.current) {
        validationRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  async function handleFilesSelected(selected: File[]) {
    if (selected.length === 0) return
    setError(null)
    setStatus('Preparing files…')
    let expanded: File[] = []
    try {
      expanded = await expandFiles(selected)
      setStatus(null)
    } catch (expandError) {
      const message =
        expandError instanceof Error ? expandError.message : 'Could not extract files.'
      setError(message)
      setStatus(null)
      return
    }
    const next = new Map<string, File>()
    for (const file of files) {
      const key = `${file.webkitRelativePath || file.name}:${file.size}`
      next.set(key, file)
    }
    for (const file of expanded) {
      const key = `${file.webkitRelativePath || file.name}:${file.size}`
      next.set(key, file)
    }
    setFiles(Array.from(next.values()))
  }

  function handleRemoveFile(target: File) {
    setFiles((current) =>
      current.filter(
        (file) =>
          `${file.webkitRelativePath || file.name}:${file.size}` !==
          `${target.webkitRelativePath || target.name}:${target.size}`,
      ),
    )
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    handleFilesSelected(Array.from(event.dataTransfer.files ?? []))
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  return (
    <main className="section upload-shell">
      <header className="upload-header">
        <div>
          <span className="upload-kicker">Publish</span>
          <h1 className="upload-title">Publish a skill</h1>
          <p className="upload-subtitle">Bundle SKILL.md + text files. Tag it, version it, ship it.</p>
        </div>
      </header>
      <form className="upload-card" onSubmit={handleSubmit}>
        <div className="upload-grid">
          <div className="upload-fields">
            <label className="upload-field">
              <span>Slug</span>
              <input
                className="search-input upload-input"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="my-skill-pack"
              />
            </label>
            <label className="upload-field">
              <span>Display name</span>
              <input
                className="search-input upload-input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="My Skill Pack"
              />
            </label>
            <div className="upload-row">
              <label className="upload-field">
                <span>Version</span>
                <input
                  className="search-input upload-input"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder="1.0.0"
                />
              </label>
              <label className="upload-field">
                <span>Tags</span>
                <input
                  className="search-input upload-input"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="latest, beta"
                />
              </label>
            </div>
            <label className="upload-field">
              <span>Changelog</span>
              <textarea
                className="search-input upload-input"
                rows={4}
                value={changelog}
                onChange={(event) => setChangelog(event.target.value)}
                placeholder="What changed in this version?"
              />
            </label>
          </div>
          <div className="upload-side">
            <div
              className={`dropzone${isDragging ? ' is-dragging' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  fileInputRef.current?.click()
                }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="dropzone-icon">⬇</div>
              <div>
                <strong>Drop a folder, files, or zip</strong>
                <p>Click to choose a folder. Archives auto-extract.</p>
              </div>
              <input
                ref={fileInputRef}
                className="dropzone-input"
                type="file"
                multiple
                data-testid="upload-input"
                onChange={(event) => void handleFilesSelected(Array.from(event.target.files ?? []))}
              />
            </div>
            <div className="upload-summary">
              <div>
                <strong>{files.length}</strong> files · <span>{sizeLabel}</span>
              </div>
              <div className={`upload-requirement${hasSkillFile ? ' ok' : ''}`}>
                SKILL.md {hasSkillFile ? 'found' : 'required'}
              </div>
              {files.length ? (
                <div className="upload-filelist">
                  {files.map((file) => (
                    <div
                      key={`${file.webkitRelativePath || file.name}:${file.size}`}
                      className="upload-file"
                    >
                      <span>{file.webkitRelativePath || file.name}</span>
                      <span>{formatBytes(file.size)}</span>
                      <button
                        className="upload-remove"
                        type="button"
                        onClick={() => handleRemoveFile(file)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="upload-muted">No files selected yet.</p>
              )}
              {files.length ? (
                <button className="btn" type="button" onClick={() => setFiles([])}>
                  Clear selection
                </button>
              ) : null}
            </div>
            <div className="upload-notes">
              <strong>Checks</strong>
              <ul>
                <li>Include SKILL.md</li>
                <li>50 MB max per version</li>
                <li>Changelog required</li>
                <li>Valid semver version</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="upload-footer" ref={validationRef}>
          <button className="btn btn-primary" type="submit" disabled={!validation.ready}>
            Publish
          </button>
          {!validation.ready ? (
            <div className="upload-validation">
              {validation.issues.map((issue) => (
                <div key={issue} className="upload-validation-item">
                  {issue}
                </div>
              ))}
            </div>
          ) : error ? null : (
            <div className="upload-ready">Ready to publish.</div>
          )}
          {error ? <div className="stat upload-error">{error}</div> : null}
          {status ? <div className="stat">{status}</div> : null}
        </div>
      </form>
    </main>
  )
}

async function uploadFile(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!response.ok) {
    throw new Error(`Upload failed: ${await response.text()}`)
  }
  const payload = (await response.json()) as { storageId: string }
  return payload.storageId
}

async function hashFile(file: File) {
  const buffer =
    typeof file.arrayBuffer === 'function'
      ? await file.arrayBuffer()
      : await new Response(file).arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  const bytes = new Uint8Array(hash)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toFixed(size < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`
}

function formatPublishError(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: unknown }).data
    if (typeof data === 'string' && data.trim()) return data.trim()
    if (
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as { message?: unknown }).message === 'string'
    ) {
      const message = (data as { message?: string }).message?.trim()
      if (message) return message
    }
  }
  if (error instanceof Error) {
    const cleaned = error.message
      .replace(/\[CONVEX[^\]]*\]\s*/g, '')
      .replace(/\[Request ID:[^\]]*\]\s*/g, '')
      .replace(/^Server Error Called by client\s*/i, '')
      .replace(/^ConvexError:\s*/i, '')
      .trim()
    if (cleaned && cleaned !== 'Server Error') return cleaned
  }
  return 'Publish failed. Please try again.'
}
