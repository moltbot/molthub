import type { Doc } from '../_generated/dataModel'
import type { ResourceBadgeMap } from './badges'

export type PublicUser = Pick<
  Doc<'users'>,
  '_id' | '_creationTime' | 'handle' | 'name' | 'displayName' | 'image' | 'bio'
>

export type PublicSkill = Pick<
  Doc<'skills'>,
  | '_id'
  | '_creationTime'
  | 'slug'
  | 'displayName'
  | 'summary'
  | 'ownerUserId'
  | 'forkOf'
  | 'latestVersionId'
  | 'tags'
  | 'stats'
  | 'createdAt'
  | 'updatedAt'
> & {
  badges?: ResourceBadgeMap
}

export type PublicSoul = Pick<
  Doc<'souls'>,
  | '_id'
  | '_creationTime'
  | 'slug'
  | 'displayName'
  | 'summary'
  | 'ownerUserId'
  | 'latestVersionId'
  | 'tags'
  | 'stats'
  | 'createdAt'
  | 'updatedAt'
> & {
  badges?: ResourceBadgeMap
}

export function toPublicUser(user: Doc<'users'> | null | undefined): PublicUser | null {
  if (!user || user.deletedAt) return null
  return {
    _id: user._id,
    _creationTime: user._creationTime,
    handle: user.handle,
    name: user.name,
    displayName: user.displayName,
    image: user.image,
    bio: user.bio,
  }
}

export function toPublicSkill(
  skill: (Doc<'skills'> & { badges?: ResourceBadgeMap }) | null | undefined,
): PublicSkill | null {
  if (!skill || skill.softDeletedAt) return null
  if (skill.moderationStatus && skill.moderationStatus !== 'active') return null
  if (skill.moderationFlags?.includes('blocked.malware')) return null
  return {
    _id: skill._id,
    _creationTime: skill._creationTime,
    slug: skill.slug,
    displayName: skill.displayName,
    summary: skill.summary,
    ownerUserId: skill.ownerUserId,
    forkOf: skill.forkOf,
    latestVersionId: skill.latestVersionId,
    tags: skill.tags,
    badges: skill.badges,
    stats: skill.stats,
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  }
}

export function toPublicSoul(
  soul:
    | (Doc<'souls'> & { stats?: Doc<'souls'>['stats']; badges?: ResourceBadgeMap })
    | null
    | undefined,
): PublicSoul | null {
  if (!soul || soul.softDeletedAt) return null
  if (soul.moderationStatus && soul.moderationStatus !== 'active') return null
  if (soul.moderationFlags?.includes('blocked.malware')) return null
  return {
    _id: soul._id,
    _creationTime: soul._creationTime,
    slug: soul.slug,
    displayName: soul.displayName,
    summary: soul.summary,
    ownerUserId: soul.ownerUserId,
    latestVersionId: soul.latestVersionId,
    tags: soul.tags,
    stats: soul.stats,
    badges: soul.badges,
    createdAt: soul.createdAt,
    updatedAt: soul.updatedAt,
  }
}
