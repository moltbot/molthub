import type { Doc } from '../../convex/_generated/dataModel'
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

export type PublicResource = Pick<
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
