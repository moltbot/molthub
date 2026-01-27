import { v } from 'convex/values'
import { zipSync } from 'fflate'
import { api } from './_generated/api'
import { httpAction, mutation } from './_generated/server'
import { insertStatEvent } from './skillStatEvents'

export const downloadZip = httpAction(async (ctx, request) => {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')?.trim().toLowerCase()
  const versionParam = url.searchParams.get('version')?.trim()
  const tagParam = url.searchParams.get('tag')?.trim()

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

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

  await ctx.runMutation(api.downloads.increment, { skillId: skill._id })

  return new Response(zipBlob, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slug}-${version.version}.zip"`,
      'Cache-Control': 'private, max-age=60',
    },
  })
})

export const increment = mutation({
  args: { skillId: v.id('skills') },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId)
    if (!skill) return
    await insertStatEvent(ctx, {
      skillId: skill._id,
      kind: 'download',
    })
  },
})
