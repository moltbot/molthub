# `clawdhub`

ClawdHub CLI — install, update, search, and publish agent skills as folders.

## Install

```bash
npm i -g clawdhub
```

## Auth (publish)

```bash
clawdhub auth login
# or (token paste / headless)
clawdhub login --token clh_...
```

## Examples

```bash
clawdhub search "postgres backups"
clawdhub install my-skill-pack
clawdhub update --all
clawdhub update --all --no-input --force
clawdhub publish ./my-skill-pack --slug my-skill-pack --name "My Skill Pack" --version 1.2.0 --changelog "Fixes + docs"
```

## Defaults

- Site: `https://clawdhub.com` (override via `--site` or `CLAWDHUB_SITE`)
- Registry: `https://wry-manatee-359.convex.site` (override via `--registry` or `CLAWDHUB_REGISTRY`)
- Workdir: current directory (override via `--workdir`)
- Install dir: `./skills` under workdir (override via `--dir`)
