# Publishing Guide for ClawHub

Complete guide to publishing the LunchTable-TCG skill to ClawHub.

## Quick Start

If you just want to publish right now:

```bash
cd skills/lunchtable/lunchtable-tcg
chmod +x publish.sh
./publish.sh
```

That's it! The script handles everything automatically.

---

## What You Need

### Prerequisites

1. **ClawHub Account**
   - Sign up at https://clawhub.com/signup
   - Verify your email

2. **npm Account (optional)**
   - Sign up at https://npmjs.com/signup
   - Only needed if you want to publish to npm registry

3. **Tools Installed**
   - Node.js 16+ (check: `node --version`)
   - npm or bun (check: `npm --version`)
   - Git (check: `git --version`)

### First-Time Setup

1. **Install ClawHub CLI**
   ```bash
   npm install -g @clawhub/cli
   ```

2. **Login to ClawHub**
   ```bash
   clawhub login
   ```
   This opens a browser window for authentication.

3. **Verify Login**
   ```bash
   clawhub whoami
   ```
   Should show your username.

---

## Publishing Methods

### Method 1: Automated Script (Recommended)

The easiest way - just run one command:

```bash
./publish.sh
```

**What it does:**
1. ✓ Validates skill structure
2. ✓ Checks/installs ClawHub CLI
3. ✓ Verifies authentication
4. ✓ Shows pre-flight summary
5. ✓ Submits to ClawHub
6. ✓ Optionally publishes to npm

**Expected output:**
```
🎴 Publishing LunchTable-TCG to ClawHub...

Step 1/6: Validating skill format...
  ✓ SKILL.md exists
  ✓ .clawhub.json exists
  ✓ package.json exists
  ...
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
Uploading skill...
✓ Successfully submitted to ClawHub

Step 6/6: Publish to npm (optional)...
📦 Also publish to npm? [y/N]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Publishing complete!

Your skill has been submitted to ClawHub for review.
```

---

### Method 2: Manual Step-by-Step

If you prefer to do it manually:

#### 1. Validate Structure

```bash
bash .validate.sh
```

Fix any errors before proceeding.

#### 2. Commit to Git

```bash
git add .
git commit -m "feat: prepare skill for ClawHub publication"
git push origin main
```

#### 3. Submit to ClawHub

```bash
clawhub submit .
```

#### 4. Monitor Submission

```bash
clawhub status lunchtable-tcg
```

---

### Method 3: GitHub Integration

Use GitHub Actions for automatic publishing on tags:

1. **Create workflow file** (already done at `.github/workflows/publish.yml`)

2. **Add ClawHub token to GitHub**
   - Generate token: `clawhub token create`
   - Go to GitHub repo → Settings → Secrets
   - Add secret: `CLAWHUB_TOKEN` = your token

3. **Publish by creating a tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

GitHub Actions will automatically submit to ClawHub.

---

## Review Process

### What Happens After Submission

1. **Immediate Validation**
   - ClawHub checks file structure
   - Validates YAML frontmatter
   - Checks for required fields

2. **Automated Checks** (5-10 minutes)
   - Scans for security issues
   - Validates dependencies
   - Tests example scenarios
   - Checks license compatibility

3. **Manual Review** (1-3 days)
   - ClawHub team reviews skill quality
   - Tests functionality
   - Checks documentation completeness

4. **Publication** (instant after approval)
   - Skill appears in ClawHub registry
   - Users can install via `openclaw skill install`

### Tracking Your Submission

```bash
# Check submission status
clawhub status lunchtable-tcg

# View detailed logs
clawhub logs lunchtable-tcg

# Check review comments
clawhub comments lunchtable-tcg
```

### Common Rejection Reasons

- ❌ Missing or incomplete SKILL.md frontmatter
- ❌ Broken examples or scenarios
- ❌ Missing INSTALLATION.md
- ❌ Unclear documentation
- ❌ License issues (must be open source)
- ❌ Security concerns (API keys in code, etc.)

**If rejected:** ClawHub will provide specific feedback. Fix the issues and resubmit:

```bash
./publish.sh
```

---

## Updating Published Skills

### Releasing Updates

1. **Update version numbers**
   ```bash
   # In SKILL.md frontmatter
   version: 1.1.0

   # In package.json
   "version": "1.1.0"

   # In .clawhub.json
   "version": "1.1.0"
   ```

2. **Document changes**
   - Add entry to CHANGELOG.md
   - Update README.md if needed

3. **Publish update**
   ```bash
   # Using script
   ./publish.sh

   # Or manually
   clawhub update lunchtable-tcg
   ```

4. **Tag release (optional)**
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```

### Versioning Guidelines

Follow semantic versioning (semver):

- **Patch** (1.0.x): Bug fixes, documentation updates
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

Examples:
```
1.0.0 → 1.0.1  Fixed card effect bug
1.0.1 → 1.1.0  Added new deck archetypes
1.1.0 → 2.0.0  Changed API structure (breaking)
```

---

## Troubleshooting

### "clawhub: command not found"

```bash
npm install -g @clawhub/cli
```

### "Not authenticated"

```bash
clawhub login
```

### "Skill name already exists"

Choose a different namespace:
```yaml
# In SKILL.md
name: yourusername-lunchtable-tcg
```

Or scope it:
```yaml
namespace: lunchtable
name: tcg
```

### "Validation failed"

Run validation manually to see specific errors:
```bash
bash .validate.sh
```

### "npm publish failed: 403"

You don't have permission for the `@lunchtable` scope. Either:

1. Request access to @lunchtable org
2. Publish under your username: `@yourusername/openclaw-skill-ltcg`
3. Publish unscoped: `openclaw-skill-ltcg` (update package.json name)

### "Submission timeout"

Large files may timeout. Check:
```bash
# List large files
du -sh *

# Exclude from submission
echo "node_modules/" >> .clawignore
echo "*.mp4" >> .clawignore
```

---

## After Publication

### User Installation

Once approved, users install via:

```bash
# From ClawHub registry
openclaw skill install lunchtable-tcg

# From npm (if published)
openclaw skill add @lunchtable/openclaw-skill-ltcg

# From GitHub
openclaw skill add https://github.com/lunchtable/ltcg/tree/main/skills/lunchtable/lunchtable-tcg
```

### Monitoring Usage

```bash
# View download stats
clawhub stats lunchtable-tcg

# View user ratings
clawhub ratings lunchtable-tcg

# View user feedback
clawhub feedback lunchtable-tcg
```

### Promoting Your Skill

- Share on ClawHub community Discord
- Tweet with #OpenClaw hashtag
- Add badge to README:
  ```markdown
  [![ClawHub](https://clawhub.com/badge/lunchtable-tcg)](https://clawhub.com/skills/lunchtable/lunchtable-tcg)
  ```

---

## Support

### Getting Help

**ClawHub Issues:**
- Documentation: https://clawhub.io/docs
- Support: https://clawhub.io/support
- Discord: https://discord.gg/clawhub

**Skill Issues:**
- GitHub Issues: https://github.com/lunchtable/ltcg/issues
- Discord: https://discord.gg/lunchtable-tcg

### Useful Commands

```bash
# ClawHub CLI
clawhub help                    # Show all commands
clawhub login                   # Authenticate
clawhub whoami                  # Check logged in user
clawhub submit .                # Submit skill
clawhub update SKILL            # Update published skill
clawhub status SKILL            # Check submission status
clawhub logs SKILL              # View logs
clawhub unpublish SKILL         # Remove from registry

# OpenClaw
openclaw skills list            # List installed skills
openclaw skill install NAME     # Install from registry
openclaw skill add PATH         # Install from local/npm/git
openclaw skill remove NAME      # Uninstall skill
```

---

## Checklist

Before running `./publish.sh`, confirm:

- [ ] SKILL.md has complete YAML frontmatter
- [ ] package.json has correct version and metadata
- [ ] .clawhub.json has correct configuration
- [ ] README.md is up to date
- [ ] INSTALLATION.md has clear setup steps
- [ ] CHANGELOG.md documents all changes
- [ ] examples/ has working examples
- [ ] scenarios/ has realistic use cases
- [ ] .validate.sh passes with no errors
- [ ] You're logged in: `clawhub whoami`
- [ ] Version numbers match across files
- [ ] Git is committed: `git status`

If all checked, you're ready:

```bash
./publish.sh
```

Good luck! 🎴
