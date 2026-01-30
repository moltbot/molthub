'use node'

import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'
import { internalAction } from './_generated/server'
import {
  backupSkillToGitHub,
  deleteSkillFromGitHub,
  fetchGitHubSkillMeta,
  getGitHubBackupContext,
  isGitHubBackupConfigured,
} from './lib/githubBackup'

const DEFAULT_BATCH_SIZE = 50
const MAX_BATCH_SIZE = 200
const DEFAULT_MAX_BATCHES = 5
const MAX_MAX_BATCHES = 200

type BackupPageItem =
  | {
      kind: 'ok'
      slug: string
      version: string
      displayName: string
      ownerHandle: string
      files: Doc<'skillVersions'>['files']
      publishedAt: number
    }
  | { kind: 'missingLatestVersion' }
  | { kind: 'missingVersionDoc' }
  | { kind: 'missingOwner' }

export type GitHubBackupSyncStats = {
  skillsScanned: number
  skillsSkipped: number
  skillsBackedUp: number
  skillsMissingVersion: number
  skillsMissingOwner: number
  errors: number
}

export type SyncGitHubBackupsInternalArgs = {
  dryRun?: boolean
  batchSize?: number
  maxBatches?: number
}

export type SyncGitHubBackupsInternalResult = {
  stats: GitHubBackupSyncStats
  cursor: string | null
  isDone: boolean
}

export const backupSkillForPublishInternal = internalAction({
  args: {
    slug: v.string(),
    version: v.string(),
    displayName: v.string(),
    ownerHandle: v.string(),
    files: v.array(
      v.object({
        path: v.string(),
        size: v.number(),
        storageId: v.id('_storage'),
        sha256: v.string(),
        contentType: v.optional(v.string()),
      }),
    ),
    publishedAt: v.number(),
  },
  handler: async (ctx, args) => {
    if (!isGitHubBackupConfigured()) {
      return { skipped: true as const }
    }
    await backupSkillToGitHub(ctx, args)
    return { skipped: false as const }
  },
})

export const deleteSkillBackupInternal = internalAction({
  args: {
    slug: v.string(),
    ownerHandles: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    if (!isGitHubBackupConfigured()) {
      return { skipped: true as const, deleted: false as const }
    }
    const result = await deleteSkillFromGitHub({
      slug: args.slug,
      ownerHandles: args.ownerHandles,
    })
    return { skipped: false as const, deleted: result.deleted }
  },
})

export async function syncGitHubBackupsInternalHandler(
  ctx: ActionCtx,
  args: SyncGitHubBackupsInternalArgs,
): Promise<SyncGitHubBackupsInternalResult> {
  const dryRun = Boolean(args.dryRun)
  const stats: GitHubBackupSyncStats = {
    skillsScanned: 0,
    skillsSkipped: 0,
    skillsBackedUp: 0,
    skillsMissingVersion: 0,
    skillsMissingOwner: 0,
    errors: 0,
  }

  if (!isGitHubBackupConfigured()) {
    return { stats, cursor: null, isDone: true }
  }

  const batchSize = clampInt(args.batchSize ?? DEFAULT_BATCH_SIZE, 1, MAX_BATCH_SIZE)
  const maxBatches = clampInt(args.maxBatches ?? DEFAULT_MAX_BATCHES, 1, MAX_MAX_BATCHES)
  const context = await getGitHubBackupContext()

  const state = dryRun
    ? { cursor: null as string | null }
    : ((await ctx.runQuery(internal.githubBackups.getGitHubBackupSyncStateInternal, {})) as {
        cursor: string | null
      })

  let cursor: string | null = state.cursor
  let isDone = false

  for (let batch = 0; batch < maxBatches; batch++) {
    const page = (await ctx.runQuery(internal.githubBackups.getGitHubBackupPageInternal, {
      cursor: cursor ?? undefined,
      batchSize,
    })) as { items: BackupPageItem[]; cursor: string | null; isDone: boolean }

    cursor = page.cursor
    isDone = page.isDone

    for (const item of page.items) {
      if (item.kind !== 'ok') {
        if (item.kind === 'missingLatestVersion' || item.kind === 'missingVersionDoc') {
          stats.skillsMissingVersion += 1
        } else if (item.kind === 'missingOwner') {
          stats.skillsMissingOwner += 1
        }
        continue
      }

      stats.skillsScanned += 1
      try {
        const meta = await fetchGitHubSkillMeta(context, item.ownerHandle, item.slug)
        if (meta?.latest?.version === item.version) {
          stats.skillsSkipped += 1
          continue
        }

        if (!dryRun) {
          await backupSkillToGitHub(
            ctx,
            {
              slug: item.slug,
              version: item.version,
              displayName: item.displayName,
              ownerHandle: item.ownerHandle,
              files: item.files,
              publishedAt: item.publishedAt,
            },
            context,
          )
          stats.skillsBackedUp += 1
        }
      } catch (error) {
        console.error('GitHub backup sync failed', error)
        stats.errors += 1
      }
    }

    if (!dryRun) {
      await ctx.runMutation(internal.githubBackups.setGitHubBackupSyncStateInternal, {
        cursor: isDone ? undefined : (cursor ?? undefined),
      })
    }

    if (isDone) break
  }

  return { stats, cursor, isDone }
}

export const syncGitHubBackupsInternal = internalAction({
  args: {
    dryRun: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
    maxBatches: v.optional(v.number()),
  },
  handler: syncGitHubBackupsInternalHandler,
})

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)))
}
