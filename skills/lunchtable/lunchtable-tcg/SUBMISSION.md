# ClawHub Submission Guide

This document provides a quick reference for submitting the LunchTable-TCG skill to ClawHub.

**For detailed instructions, see [PUBLISH.md](PUBLISH.md)**

## Quick Start

One-command publishing:

```bash
./publish.sh
```

That's it! The script handles validation, authentication, and submission automatically.

## Pre-Submission Checklist

- [x] SKILL.md with YAML frontmatter
- [x] package.json with OpenClaw metadata
- [x] .clawhub.json with ClawHub configuration
- [x] README.md updated with installation instructions
- [x] INSTALLATION.md for setup guide
- [x] examples/ directory with working examples
- [x] scenarios/ directory with use cases

## File Structure

```
skills/lunchtable/lunchtable-tcg/
├── .clawhub.json          # ClawHub metadata
├── SKILL.md               # Main skill documentation with YAML frontmatter
├── package.json           # npm/OpenClaw package metadata
├── README.md              # User-facing documentation
├── INSTALLATION.md        # Setup instructions
├── SUBMISSION.md          # This file
├── examples/              # Working code examples
│   ├── quickstart.sh
│   ├── ranked-game.sh
│   └── advanced-chains.sh
└── scenarios/             # Use case scenarios
    ├── beginner-game.txt
    ├── competitive-match.txt
    └── advanced-tactics.txt
```

## Automated Publishing

### Prerequisites

1. **ClawHub Account**: Sign up at https://clawhub.com/signup
2. **ClawHub CLI**: `npm install -g @clawhub/cli`
3. **Authentication**: `clawhub login`

### Using the Publish Script

```bash
cd skills/lunchtable/lunchtable-tcg
chmod +x publish.sh
./publish.sh
```

**What the script does:**

1. ✓ Validates skill structure with `.validate.sh`
2. ✓ Checks/installs ClawHub CLI if needed
3. ✓ Verifies ClawHub authentication
4. ✓ Shows pre-flight summary (name, version)
5. ✓ Submits to ClawHub registry
6. ✓ Optionally publishes to npm

**Expected output:**

```
🎴 Publishing LunchTable-TCG to ClawHub...

Step 1/6: Validating skill format...
✅ Validation passed!

Step 2/6: Checking ClawHub CLI...
✓ ClawHub CLI found

Step 3/6: Checking ClawHub authentication...
✓ Logged in as: yourusername

Step 4/6: Pre-flight check...
  Skill Name: lunchtable-tcg
  Version: 1.0.0

Continue with submission? [y/N] y

Step 5/6: Submitting to ClawHub...
✓ Successfully submitted to ClawHub

Step 6/6: Publish to npm (optional)...
📦 Also publish to npm? [y/N]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Publishing complete!

Next steps:
  • Track submission: clawhub status lunchtable-tcg
  • View on ClawHub: https://clawhub.com/skills/lunchtable/lunchtable-tcg
```

### Manual Publishing

If you prefer manual control:

```bash
# 1. Validate
bash .validate.sh

# 2. Authenticate
clawhub login

# 3. Submit
clawhub submit .

# 4. Monitor
clawhub status lunchtable-tcg
```

### Automated Publishing via GitHub Actions

On every version tag push:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions automatically:
- Validates skill structure
- Submits to ClawHub
- Publishes to npm (if configured)
- Creates GitHub release

**Setup required:**
1. Add `CLAWHUB_TOKEN` to GitHub Secrets
2. Add `NPM_TOKEN` to GitHub Secrets (optional)

Generate tokens:
```bash
clawhub token create
npm token create
```

## Verification Checklist

After submission, ClawHub verifies:

- ✓ Valid SKILL.md with proper YAML frontmatter
- ✓ Required binaries (curl) documented
- ✓ OS compatibility listed
- ✓ Environment variables documented
- ✓ Examples are functional
- ✓ License is specified (MIT)
- ✓ No security vulnerabilities

## Post-Submission Tracking

```bash
# Check submission status
clawhub status lunchtable-tcg

# View detailed logs
clawhub logs lunchtable-tcg

# Check review comments
clawhub comments lunchtable-tcg
```

### Review Timeline

1. **Immediate**: Automated validation (file structure, YAML)
2. **5-10 min**: Security scan, dependency check
3. **1-3 days**: Manual review by ClawHub team
4. **Instant**: Publication after approval

## After Approval

Users can install your skill:

```bash
# From ClawHub registry
openclaw skill install lunchtable-tcg

# From npm (if published)
openclaw skill add @lunchtable/openclaw-skill-ltcg

# From GitHub
openclaw skill add https://github.com/lunchtable/ltcg/tree/main/skills/lunchtable/lunchtable-tcg
```

Monitor usage:
```bash
clawhub stats lunchtable-tcg
clawhub ratings lunchtable-tcg
clawhub feedback lunchtable-tcg
```

## Updating Published Skills

Update and republish:

```bash
# 1. Update version in SKILL.md, package.json, .clawhub.json
# 2. Update CHANGELOG.md
# 3. Republish

./publish.sh
```

Or create a new tag:
```bash
git tag v1.1.0
git push origin v1.1.0
# GitHub Actions handles the rest
```

## Troubleshooting

**Common issues and solutions:**

```bash
# "clawhub: command not found"
npm install -g @clawhub/cli

# "Not authenticated"
clawhub login

# "Skill name already exists"
# Change name in SKILL.md to: yourusername-lunchtable-tcg

# "Validation failed"
bash .validate.sh  # See specific errors
```

**For detailed troubleshooting, see [PUBLISH.md](PUBLISH.md#troubleshooting)**

## Support

**ClawHub Issues:**
- Docs: https://clawhub.io/docs
- Support: https://clawhub.io/support
- Discord: https://discord.gg/clawhub

**Skill Issues:**
- GitHub: https://github.com/lunchtable/ltcg/issues
- Discord: https://discord.gg/lunchtable-tcg

## Useful Commands

```bash
# ClawHub
clawhub login               # Authenticate
clawhub whoami              # Check user
clawhub submit .            # Submit skill
clawhub status SKILL        # Check status
clawhub update SKILL        # Update published skill
clawhub logs SKILL          # View logs

# OpenClaw
openclaw skills list        # List installed
openclaw skill install NAME # Install from registry
openclaw skill add PATH     # Install from local/npm/git
```

---

**For complete publishing guide with screenshots and detailed steps, see [PUBLISH.md](PUBLISH.md)**
