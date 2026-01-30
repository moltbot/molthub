# Repository Guidelines

## Project Structure & Module Organization
- `src/` — TanStack Start app code (routes, components, styles).
- `convex/` — Convex backend (schema, queries/mutations/actions, HTTP routes).
- `convex/_generated/` — generated Convex API/types; committed for builds.
- `docs/` — product/spec docs (see `docs/spec.md`).
- `public/` — static assets.

## Build, Test, and Development Commands
- `bun run dev` — local app server at `http://localhost:3000`.
- `bun run build` — production build (Vite + Nitro).
- `bun run preview` — preview built app.
- `bunx convex dev` — Convex dev deployment + function watcher.
- `bunx convex codegen` — regenerate `convex/_generated`.
- `bun run lint` — Biome + oxlint (type-aware).
- `bun run test` — Vitest (unit tests).
- `bun run coverage` — coverage run; keep global >= 80%.

## Coding Style & Naming Conventions
- TypeScript strict; ESM.
- Indentation: 2 spaces, single quotes (Biome).
- Lint/format: Biome + oxlint (type-aware).
- Convex function names: verb-first (`getBySlug`, `publishVersion`).
- Prefer shared resource components/utilities for skills/souls/extensions to avoid duplicated logic.

## Testing Guidelines
- Framework: Vitest 4 + jsdom.
- Tests live in `src/**` and `convex/lib/**`.
- Coverage threshold: 80% global (lines/functions/branches/statements).
- Example: `convex/lib/skills.test.ts`.

## Commit & Pull Request Guidelines
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`…).
- Keep changes scoped; avoid repo-wide search/replace.
- PRs: include summary + test commands run. Add screenshots for UI changes.

## Configuration & Security
- Local env: `.env.local` (never commit secrets).
- Convex env holds JWT keys; Vercel only needs `VITE_CONVEX_URL` + `VITE_CONVEX_SITE_URL`.
- OAuth: GitHub OAuth App credentials required for login.

## Convex Ops (Gotchas)
- New Convex functions must be pushed before `convex run`: use `bunx convex dev --once` (dev) or `bunx convex deploy` (prod).
- For non-interactive prod deploys, use `bunx convex deploy -y` to skip confirmation.
- If `bunx convex run --env-file .env.local ...` returns `401 MissingAccessToken` despite `bunx convex login`, workaround: omit `--env-file` and use `--deployment-name <name>` / `--prod`.

## Rewrite Notes (Resources, Moderation, Auth)
- Resources are unified in the `resources` table with `type` (`skill`, `soul`, `extension`); type tables keep version-specific fields.
- Shared UI pieces live in `src/components/ResourceCard.tsx`, `ResourceListRow.tsx`, and `ResourceDetailShell.tsx`.
- Moderation uses a reported-only queue + lookup tools; duplicate system removed. Similar-skill lookup uses `skills.findSimilarSkills` (vector search action).
- GitHub backups delete skill folders on hide/delete via `githubBackupsNode.deleteSkillBackupInternal`.
- Local auth bypass: set `AUTH_BYPASS=true` in Convex env + `VITE_AUTH_BYPASS=true` in `.env.local`.
- Local seed script: `bun run seed:local` (calls `devSeed:seedNixSkillsPublic`).
- Card stats labels: stars, downloads, installs (skills only), versions.
