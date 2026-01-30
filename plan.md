# UI Rebuild Plan (Shadcn/Base) — Ordered Sequence

## Implementation Notes (do this throughout)
- No temporary files, placeholder components, or transitional UI. Replace in place.
- Apply redirects immediately when switching routes (no staging period).
- Use `rg` for searches and read files before editing.
- Keep changes scoped to UI; backend changes only for UI cleanup/dedupe.

## 1) Foundations: Shared Resource Adapter
- Define `ResourceType = 'skill' | 'soul' | 'extension'`.
- Create shared helpers:
  - `getResourceLabel()`
  - `getResourceLink()`
  - `getResourceOwner()`
  - `getResourceBadge()`
- Add routing helper: `toCanonicalResourcePath(type, owner, slug)`.

## 2) Shadcn Theme + Tokens (keep current palette + fonts)
- Use this exact shadcn setup (maia + stone + hugeicons):
  ```
  bunx --bun shadcn@latest create --preset "https://ui.shadcn.com/init?base=base&style=maia&baseColor=stone&theme=stone&iconLibrary=hugeicons&font=inter&menuAccent=subtle&menuColor=default&radius=default&template=start" --template start
  ```
- Port existing color palette into shadcn CSS variables.
- Preserve current font stack (Bricolage Grotesque, Manrope, IBM Plex Mono).
- Replace custom CSS with shadcn utilities + component styles.

## 3) Global Layout
- Rebuild `Header` + `Footer` with shadcn:
  - `NavigationMenu`, `DropdownMenu`, `Button`, `Avatar`, `Sheet`.
- Add shared `PageShell` + `SectionHeader`.

## 4) Core Pages (Skills path first)
- `/` Home → rebuild hero + sections with shared cards.
- `/skills` → rebuild toolbar + list/grid with shared resource components.
- `/$owner/$slug` → rebuild detail view using `ResourceDetailShell`.

## 5) Souls + Extensions
- Rebuild souls on shared components.
- Extensions ready to drop in with same adapter.

## 6) Upload / Import / Settings / Dashboard
- `/upload`: shadcn form layout + dropzone card.
- `/dashboard`: shared resource dashboard cards.
- `/settings`: shadcn form fields + token UI.

## 7) Moderation Overhaul → `/moderation`
- Replace `/management` with `/moderation`.
- Tabs: Queue, Reports, Duplicates, Recent, Users.
- Cards modeled after Modrinth (queue + reports).
- Optional right-side detail drawer for actions.
- No `/management` redirect; remove the route entirely.

## 8) Type Rewrite Roadmap (future-ready)
### Phase A — Add canonical routes
```
/skills/:owner/:slug
/souls/:owner/:slug
/extensions/:owner/:slug
```

### Phase B — Redirect legacy (yolo)
- Immediately redirect `/$owner/$slug` → canonical.
- Update all internal links to use canonical helper.

### Phase C — Deprecate legacy
- Remove the legacy route after redirect is stable (no soft-keep).
