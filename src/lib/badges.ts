import type { Doc, Id } from '../../convex/_generated/dataModel'

type BadgeKind = Doc<'resourceBadges'>['kind']

export type ResourceBadgeMap = Partial<Record<BadgeKind, { byUserId: Id<'users'>; at: number }>>

type ResourceLike = { badges?: ResourceBadgeMap | null }

type BadgeLabel = 'Deprecated' | 'Official' | 'Highlighted'

export function isResourceHighlighted(resource: ResourceLike) {
  return Boolean(resource.badges?.highlighted)
}

export function isResourceOfficial(resource: ResourceLike) {
  return Boolean(resource.badges?.official)
}

export function isResourceDeprecated(resource: ResourceLike) {
  return Boolean(resource.badges?.deprecated)
}

export function getResourceBadges(resource: ResourceLike): BadgeLabel[] {
  const badges: BadgeLabel[] = []
  if (isResourceDeprecated(resource)) badges.push('Deprecated')
  if (isResourceOfficial(resource)) badges.push('Official')
  if (isResourceHighlighted(resource)) badges.push('Highlighted')
  return badges
}

export const isSkillHighlighted = isResourceHighlighted
export const isSkillOfficial = isResourceOfficial
export const isSkillDeprecated = isResourceDeprecated
export const getSkillBadges = getResourceBadges
export type SkillBadgeMap = ResourceBadgeMap
