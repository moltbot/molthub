import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx } from '../_generated/server'

type ResourceInsert = Omit<Doc<'resources'>, '_id' | '_creationTime'>

async function resolveOwnerHandle(ctx: MutationCtx, ownerUserId: Id<'users'>) {
  const owner = await ctx.db.get(ownerUserId)
  return owner?.handle ?? owner?._id ?? undefined
}

function buildSkillResource(skill: Doc<'skills'>, ownerHandle?: string): ResourceInsert {
  return {
    type: 'skill',
    slug: skill.slug,
    displayName: skill.displayName,
    summary: skill.summary,
    ownerUserId: skill.ownerUserId,
    ownerHandle,
    softDeletedAt: skill.softDeletedAt,
    moderationStatus: skill.moderationStatus,
    moderationFlags: skill.moderationFlags,
    statsDownloads: skill.statsDownloads,
    statsStars: skill.statsStars,
    statsInstallsCurrent: skill.statsInstallsCurrent,
    statsInstallsAllTime: skill.statsInstallsAllTime,
    stats: skill.stats,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  }
}

function buildSoulResource(soul: Doc<'souls'>, ownerHandle?: string): ResourceInsert {
  return {
    type: 'soul',
    slug: soul.slug,
    displayName: soul.displayName,
    summary: soul.summary,
    ownerUserId: soul.ownerUserId,
    ownerHandle,
    softDeletedAt: soul.softDeletedAt,
    moderationStatus: soul.moderationStatus,
    moderationFlags: soul.moderationFlags,
    statsDownloads: soul.stats.downloads,
    statsStars: soul.stats.stars,
    statsInstallsCurrent: undefined,
    statsInstallsAllTime: undefined,
    stats: {
      downloads: soul.stats.downloads,
      stars: soul.stats.stars,
      versions: soul.stats.versions,
      comments: soul.stats.comments,
    },
    createdAt: soul.createdAt,
    updatedAt: soul.updatedAt,
  }
}

export async function upsertResourceForSkill(
  ctx: MutationCtx,
  skill: Doc<'skills'>,
  overrides?: Partial<ResourceInsert>,
) {
  const resolvedOwnerHandle =
    overrides?.ownerHandle ?? (await resolveOwnerHandle(ctx, skill.ownerUserId))
  if (skill.resourceId) {
    const existing = await ctx.db.get(skill.resourceId)
    if (existing) {
      await ctx.db.patch(skill.resourceId, { ...overrides, ownerHandle: resolvedOwnerHandle })
      return skill.resourceId
    }
  }
  const resourceId = await ctx.db.insert('resources', {
    ...buildSkillResource(skill, resolvedOwnerHandle),
    ...overrides,
    ownerHandle: resolvedOwnerHandle,
  })
  await ctx.db.patch(skill._id, { resourceId })
  return resourceId
}

export async function upsertResourceForSoul(
  ctx: MutationCtx,
  soul: Doc<'souls'>,
  overrides?: Partial<ResourceInsert>,
) {
  const resolvedOwnerHandle =
    overrides?.ownerHandle ?? (await resolveOwnerHandle(ctx, soul.ownerUserId))
  if (soul.resourceId) {
    const existing = await ctx.db.get(soul.resourceId)
    if (existing) {
      await ctx.db.patch(soul.resourceId, { ...overrides, ownerHandle: resolvedOwnerHandle })
      return soul.resourceId
    }
  }
  const resourceId = await ctx.db.insert('resources', {
    ...buildSoulResource(soul, resolvedOwnerHandle),
    ...overrides,
    ownerHandle: resolvedOwnerHandle,
  })
  await ctx.db.patch(soul._id, { resourceId })
  return resourceId
}
