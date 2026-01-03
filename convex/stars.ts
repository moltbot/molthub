import { v } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { requireUser } from './lib/access'

export const isStarred = query({
  args: { skillId: v.id('skills') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const existing = await ctx.db
      .query('stars')
      .withIndex('by_skill_user', (q) => q.eq('skillId', args.skillId).eq('userId', userId))
      .unique()
    return Boolean(existing)
  },
})

export const toggle = mutation({
  args: { skillId: v.id('skills') },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx)
    const skill = await ctx.db.get(args.skillId)
    if (!skill) throw new Error('Skill not found')

    const existing = await ctx.db
      .query('stars')
      .withIndex('by_skill_user', (q) => q.eq('skillId', args.skillId).eq('userId', userId))
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
      await ctx.db.patch(skill._id, {
        stats: { ...skill.stats, stars: Math.max(0, skill.stats.stars - 1) },
        updatedAt: Date.now(),
      })
      return { starred: false }
    }

    await ctx.db.insert('stars', {
      skillId: args.skillId,
      userId,
      createdAt: Date.now(),
    })

    await ctx.db.patch(skill._id, {
      stats: { ...skill.stats, stars: skill.stats.stars + 1 },
      updatedAt: Date.now(),
    })

    return { starred: true }
  },
})

export const listByUser = query({
  args: { userId: v.id('users'), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const stars = await ctx.db
      .query('stars')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit)
    const skills: Doc<'skills'>[] = []
    for (const star of stars) {
      const skill = await ctx.db.get(star.skillId)
      if (skill) skills.push(skill)
    }
    return skills
  },
})
