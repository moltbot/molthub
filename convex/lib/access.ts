import { getAuthUserId } from '@convex-dev/auth/server'
import { internal } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'
import type { ActionCtx, MutationCtx, QueryCtx } from '../_generated/server'

export type Role = 'admin' | 'moderator' | 'user'

const AUTH_BYPASS = process.env.AUTH_BYPASS === 'true'
const BYPASS_HANDLE = 'local'

async function getBypassUser(ctx: MutationCtx | QueryCtx) {
  const user = await ctx.db
    .query('users')
    .withIndex('handle', (q) => q.eq('handle', BYPASS_HANDLE))
    .unique()
  if (!user || user.deletedAt) throw new Error('User not found')
  return user
}

export async function requireUser(ctx: MutationCtx | QueryCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    if (!AUTH_BYPASS) throw new Error('Unauthorized')
    const user = await getBypassUser(ctx)
    return { userId: user._id, user }
  }
  const user = await ctx.db.get(userId)
  if (!user || user.deletedAt) throw new Error('User not found')
  return { userId, user }
}

export async function requireUserFromAction(ctx: ActionCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    if (!AUTH_BYPASS) throw new Error('Unauthorized')
    const user = await ctx.runQuery(internal.users.getByHandleInternal, {
      handle: BYPASS_HANDLE,
    })
    if (!user || user.deletedAt) throw new Error('User not found')
    return { userId: user._id, user: user as Doc<'users'> }
  }
  const user = await ctx.runQuery(internal.users.getByIdInternal, { userId })
  if (!user || user.deletedAt) throw new Error('User not found')
  return { userId, user: user as Doc<'users'> }
}

export function assertRole(user: Doc<'users'>, allowed: Role[]) {
  if (!user.role || !allowed.includes(user.role as Role)) {
    throw new Error('Forbidden')
  }
}

export function assertAdmin(user: Doc<'users'>) {
  assertRole(user, ['admin'])
}

export function assertModerator(user: Doc<'users'>) {
  assertRole(user, ['admin', 'moderator'])
}
