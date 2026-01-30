import { paginationOptsValidator } from 'convex/server'
import { v } from 'convex/values'
import { paginator } from 'convex-helpers/server/pagination'
import type { Doc } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { query } from './_generated/server'
import { getResourceBadgeMap, getResourceBadgeMaps, type ResourceBadgeMap } from './lib/badges'
import schema from './schema'

export type PublicExtension = Pick<
  Doc<'resources'>,
  | '_id'
  | '_creationTime'
  | 'type'
  | 'slug'
  | 'displayName'
  | 'summary'
  | 'ownerUserId'
  | 'ownerHandle'
  | 'stats'
  | 'createdAt'
  | 'updatedAt'
> & {
  badges?: ResourceBadgeMap
}

async function buildPublicExtensions(ctx: QueryCtx, resources: Doc<'resources'>[]) {
  const badgeMapByResourceId = await getResourceBadgeMaps(
    ctx,
    resources.map((resource) => resource._id),
  )
  return resources
    .map((resource) =>
      toPublicExtension({
        ...resource,
        badges: badgeMapByResourceId.get(resource._id) ?? {},
      }),
    )
    .filter(Boolean)
}

export const listPublicPage = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await paginator(ctx.db, schema)
      .query('resources')
      .withIndex('by_type_active_updated', (q) =>
        q.eq('type', 'extension').eq('softDeletedAt', undefined),
      )
      .order('desc')
      .paginate(args.paginationOpts)

    const page = await buildPublicExtensions(ctx, result.page)
    return {
      ...result,
      page,
    }
  },
})

export const listByOwner = query({
  args: { ownerUserId: v.id('users'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const resources = await ctx.db
      .query('resources')
      .withIndex('by_type_owner_updated', (q) =>
        q.eq('type', 'extension').eq('ownerUserId', args.ownerUserId),
      )
      .order('desc')
      .take(Math.min(limit * 3, 200))
    const filtered = resources.filter((resource) => !resource.softDeletedAt).slice(0, limit)
    return buildPublicExtensions(ctx, filtered)
  },
})

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const resource = await ctx.db
      .query('resources')
      .withIndex('by_type_slug', (q) => q.eq('type', 'extension').eq('slug', args.slug))
      .unique()
    if (!resource) return null
    const badges = await getResourceBadgeMap(ctx, resource._id)
    return toPublicExtension({ ...resource, badges })
  },
})

function toPublicExtension(
  resource: (Doc<'resources'> & { badges?: ResourceBadgeMap }) | null | undefined,
): PublicExtension | null {
  if (!resource || resource.softDeletedAt || resource.type !== 'extension') return null
  return {
    _id: resource._id,
    _creationTime: resource._creationTime,
    type: resource.type,
    slug: resource.slug,
    displayName: resource.displayName,
    summary: resource.summary,
    ownerUserId: resource.ownerUserId,
    ownerHandle: resource.ownerHandle,
    stats: resource.stats,
    badges: resource.badges,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  }
}
