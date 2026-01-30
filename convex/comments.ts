import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { assertModerator, requireUser } from './lib/access'
import { type PublicUser, toPublicUser } from './lib/public'
import { upsertResourceForSkill } from './lib/resource'

export const listBySkill = query({
  args: { skillId: v.id('skills'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const comments = await ctx.db
      .query('comments')
      .withIndex('by_skill', (q) => q.eq('skillId', args.skillId))
      .order('desc')
      .take(limit)

    const results: Array<{ comment: Doc<'comments'>; user: PublicUser | null }> = []
    for (const comment of comments) {
      if (comment.softDeletedAt) continue
      const user = toPublicUser(await ctx.db.get(comment.userId))
      results.push({ comment, user })
    }
    return results
  },
})

export const add = mutation({
  args: { skillId: v.id('skills'), body: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const body = args.body.trim()
    if (!body) throw new Error('Comment body required')

    const skill = await ctx.db.get(args.skillId)
    if (!skill) throw new Error('Skill not found')

    await ctx.db.insert('comments', {
      skillId: args.skillId,
      userId,
      body,
      createdAt: Date.now(),
      softDeletedAt: undefined,
      deletedBy: undefined,
    })

    const now = Date.now()
    const nextStats = { ...skill.stats, comments: skill.stats.comments + 1 }
    await ctx.db.patch(skill._id, {
      stats: nextStats,
      updatedAt: now,
    })
    await upsertResourceForSkill(ctx, skill, {
      stats: nextStats,
      statsDownloads: skill.statsDownloads,
      statsStars: skill.statsStars,
      statsInstallsCurrent: skill.statsInstallsCurrent,
      statsInstallsAllTime: skill.statsInstallsAllTime,
      updatedAt: now,
    })
  },
})

export const remove = mutation({
  args: { commentId: v.id('comments') },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const comment = await ctx.db.get(args.commentId)
    if (!comment) throw new Error('Comment not found')
    if (comment.softDeletedAt) return

    const isOwner = comment.userId === user._id
    if (!isOwner) {
      assertModerator(user)
    }

    await ctx.db.patch(comment._id, {
      softDeletedAt: Date.now(),
      deletedBy: user._id,
    })

    const skill = await ctx.db.get(comment.skillId)
    if (skill) {
      const now = Date.now()
      const nextStats = { ...skill.stats, comments: Math.max(0, skill.stats.comments - 1) }
      await ctx.db.patch(skill._id, {
        stats: nextStats,
        updatedAt: now,
      })
      await upsertResourceForSkill(ctx, skill, {
        stats: nextStats,
        statsDownloads: skill.statsDownloads,
        statsStars: skill.statsStars,
        statsInstallsCurrent: skill.statsInstallsCurrent,
        statsInstallsAllTime: skill.statsInstallsAllTime,
        updatedAt: now,
      })
    }

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      action: 'comment.delete',
      targetType: 'comment',
      targetId: comment._id,
      metadata: { skillId: comment.skillId },
      createdAt: Date.now(),
    })
  },
})
