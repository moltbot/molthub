import { v } from 'convex/values'
import { zipSync } from 'fflate'
import { api, internal } from './_generated/api'
import { httpAction, internalMutation } from './_generated/server'
import { applyRateLimit, getClientIp } from './lib/httpRateLimit'
import { applySkillStatDeltas, bumpDailySkillStats } from './lib/skillStats'
import { hashToken } from './lib/tokens'

const DAY_MS = 86_400_000
const DEDUPE_RETENTION_DAYS = 14

export const downloadZip = httpAction(async (ctx, request) => {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')?.trim().toLowerCase()
  const versionParam = url.searchParams.get('version')?.trim()
  const tagParam = url.searchParams.get('tag')?.trim()

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const rate = await applyRateLimit(ctx, request, 'download')
  if (!rate.ok) return rate.response

  const skillResult = await ctx.runQuery(api.skills.getBySlug, { slug })
  if (!skillResult?.skill) {
    return new Response('Skill not found', { status: 404 })
  }

  const skill = skillResult.skill
  let version = skillResult.latestVersion

  if (versionParam) {
    version = await ctx.runQuery(api.skills.getVersionBySkillAndVersion, {
      skillId: skill._id,
      version: versionParam,
    })
  } else if (tagParam) {
    const versionId = skill.tags[tagParam]
    if (versionId) {
      version = await ctx.runQuery(api.skills.getVersionById, { versionId })
    }
  }

  if (!version) {
    return new Response('Version not found', { status: 404 })
  }
  if (version.softDeletedAt) {
    return new Response('Version not available', { status: 410 })
  }

  const files: Record<string, Uint8Array> = {}
  for (const file of version.files) {
    const blob = await ctx.storage.get(file.storageId)
    if (!blob) continue
    const buffer = new Uint8Array(await blob.arrayBuffer())
    files[file.path] = buffer
  }

  const zipData = zipSync(files, { level: 6 })
  const zipArray = Uint8Array.from(zipData)
  const zipBlob = new Blob([zipArray], { type: 'application/zip' })

  const ip = getClientIp(request) ?? 'unknown'
  const ipHash = await hashToken(ip)
  const dayStart = getDayStart(Date.now())
  try {
    await ctx.runMutation(internal.downloads.recordDownloadInternal, {
      skillId: skill._id,
      ipHash,
      dayStart,
    })
  } catch {
    // Ignore download count failures.
  }

  return new Response(zipBlob, {
    status: 200,
    headers: mergeHeaders(rate.headers, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slug}-${version.version}.zip"`,
      'Cache-Control': 'private, max-age=60',
    }),
  })
})

export const recordDownloadInternal = internalMutation({
  args: {
    skillId: v.id('skills'),
    ipHash: v.string(),
    dayStart: v.number(),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId)
    if (!skill) return

    const existing = await ctx.db
      .query('downloadDedupes')
      .withIndex('by_skill_ip_day', (q) =>
        q.eq('skillId', args.skillId).eq('ipHash', args.ipHash).eq('dayStart', args.dayStart),
      )
      .unique()
    if (existing) return

    const now = Date.now()
    await ctx.db.insert('downloadDedupes', {
      skillId: args.skillId,
      ipHash: args.ipHash,
      dayStart: args.dayStart,
      createdAt: now,
    })

    const patch = applySkillStatDeltas(skill, { downloads: 1 })
    await ctx.db.patch(skill._id, { ...patch, updatedAt: now })
    await bumpDailySkillStats(ctx, { skillId: skill._id, now, downloads: 1 })
  },
})

export const pruneDownloadDedupesInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - DEDUPE_RETENTION_DAYS * DAY_MS
    let remaining = true
    let batches = 0
    while (remaining && batches < 10) {
      const stale = await ctx.db
        .query('downloadDedupes')
        .withIndex('by_day')
        .filter((q) => q.lt(q.field('dayStart'), cutoff))
        .take(200)
      if (stale.length === 0) {
        remaining = false
        break
      }
      for (const entry of stale) {
        await ctx.db.delete(entry._id)
      }
      batches += 1
    }
  },
})

export function getDayStart(timestamp: number) {
  return Math.floor(timestamp / DAY_MS) * DAY_MS
}

export const __test = {
  getDayStart,
}

function mergeHeaders(base: HeadersInit, extra: HeadersInit) {
  return { ...(base as Record<string, string>), ...(extra as Record<string, string>) }
}
