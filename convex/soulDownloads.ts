import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { upsertResourceForSoul } from './lib/resource'

export const increment = mutation({
  args: { soulId: v.id('souls') },
  handler: async (ctx, args) => {
    const soul = await ctx.db.get(args.soulId)
    if (!soul) return
    const now = Date.now()
    const nextStats = { ...soul.stats, downloads: soul.stats.downloads + 1 }
    await ctx.db.patch(soul._id, {
      stats: nextStats,
      updatedAt: now,
    })
    await upsertResourceForSoul(ctx, soul, {
      statsDownloads: nextStats.downloads,
      statsStars: nextStats.stars,
      stats: {
        downloads: nextStats.downloads,
        stars: nextStats.stars,
        versions: nextStats.versions,
        comments: nextStats.comments,
      },
      updatedAt: now,
    })
  },
})
