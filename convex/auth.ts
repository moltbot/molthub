import GitHub from '@auth/core/providers/github'
import { convexAuth } from '@convex-dev/auth/server'
import { Id } from './_generated/dataModel'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID ?? '',
      clientSecret: process.env.AUTH_GITHUB_SECRET ?? '',
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.login,
          email: profile.email ?? undefined,
          image: profile.avatar_url,
        }
      },
    }),
  ],
  callbacks: {
    /**
     * Handle re-authentication of soft-deleted users.
     *
     * Performance note: This callback runs on every OAuth sign-in, but the
     * audit log query ONLY executes when a soft-deleted user attempts to
     * sign in (user.deletedAt is set). For normal active users, this is
     * just a single `if` check on an already-loaded field - no extra queries.
     */
    async createOrUpdateUser(ctx, args) {
      // New user - let Convex Auth handle creation with default behavior
      if (!args.existingUserId) {
        return null
      }

      const userId = args.existingUserId as Id<'users'>
      const user = await ctx.db.get(userId)

      // Active user - normal sign-in, no additional processing needed
      if (!user?.deletedAt) {
        return args.existingUserId
      }

      // Soft-deleted user attempting to sign in - check if banned or self-deleted
      // Uses the by_target index for efficient lookup (not a full table scan)
      const banRecord = await ctx.db
        .query('auditLogs')
        .withIndex('by_target', (q) =>
          q.eq('targetType', 'user').eq('targetId', userId)
        )
        .filter((q) => q.eq(q.field('action'), 'user.ban'))
        .first()

      if (banRecord) {
        // User was banned by a moderator - do NOT restore
        throw new Error('This account has been suspended')
      }

      // User self-deleted their account - restore it
      await ctx.db.patch(userId, {
        deletedAt: undefined,
        updatedAt: Date.now(),
      })

      return args.existingUserId
    },
  },
})
