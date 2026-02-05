# OpenClaw Skill - Installation Guide

Complete setup instructions for installing and configuring the LTCG OpenClaw Skill.

## Prerequisites

Before installing, ensure you have:

- **OpenClaw Runtime** 2.0 or later installed
- **Node.js** 18+ or **Bun** 1.0+ (for manual installation)
- **LTCG API Key** - Obtain from https://lunchtable.cards
- **Valid Network Connection** to access the LTCG API

### Getting an LTCG API Key

1. Visit https://lunchtable.cards
2. Sign in to your account (create one if needed)
3. Navigate to **Settings → API Keys**
4. Click **Generate New Key**
5. Copy the key immediately (format: `ltcg_xxxxx...`)
6. Store it securely - you'll need it for configuration

## Installation Methods

### Method 1: Using npm (Recommended)

**Quick installation via npm registry:**

```bash
npm install -g @ltcg/openclaw-skill
```

This automatically:
- Downloads the latest version
- Registers the skill with OpenClaw
- Sets up required directories
- Generates default configuration template

**Verify installation:**
```bash
npm list -g @ltcg/openclaw-skill
```

### Method 2: Using OpenClaw CLI

**If you have the OpenClaw CLI installed:**

```bash
# Install the skill
openclaw skill add @ltcg/openclaw-skill

# List installed skills
openclaw skill list

# Verify it's loaded
openclaw skill info ltcg
```

**Uninstall if needed:**
```bash
openclaw skill remove @ltcg/openclaw-skill
```

### Method 3: Manual Installation

For development or custom configurations:

**Step 1: Clone or download the repository**
```bash
cd /path/to/openclaw/skills
git clone https://github.com/LTCG/openclaw-skill.git
cd openclaw-skill
```

**Step 2: Install dependencies**
```bash
# Using npm
npm install

# Using bun
bun install
```

**Step 3: Build the skill**
```bash
# Using npm
npm run build

# Using bun
bun run build
```

**Step 4: Register with OpenClaw**
```bash
openclaw skill register --path ./dist --name @ltcg/openclaw-skill
```

**Step 5: Restart OpenClaw**
```bash
openclaw restart
```

## Configuration

### 1. Set Environment Variables

The skill requires one mandatory and several optional environment variables.

**Option A: Using .env file (Recommended)**

Create a `.env` file in the skill directory:

```bash
# Required
LTCG_API_KEY=ltcg_your_actual_key_here_copy_from_settings

# Optional - customize these for your setup
LTCG_API_URL=https://lunchtable.cards
LTCG_API_TIMEOUT=30000
OPENCLAW_SKILL_LOG_LEVEL=info
OPENCLAW_SKILL_RATE_LIMIT=100
```

**Option B: Using OpenClaw configuration**

Edit your OpenClaw config file:

**macOS:** `~/Library/Application Support/OpenClaw/openclaw-config.json`
**Windows:** `%APPDATA%\OpenClaw\openclaw-config.json`
**Linux:** `~/.config/OpenClaw/openclaw-config.json`

Add or update:
```json
{
  "skills": {
    "ltcg": {
      "apiKey": "ltcg_your_actual_key_here",
      "apiUrl": "https://lunchtable.cards",
      "apiTimeout": 30000,
      "logLevel": "info",
      "rateLimit": 100
    }
  }
}
```

**Option C: Using environment variables**

Export directly in your shell:

```bash
# macOS/Linux
export LTCG_API_KEY=ltcg_your_actual_key_here
export LTCG_API_URL=https://lunchtable.cards

# Windows (Command Prompt)
set LTCG_API_KEY=ltcg_your_actual_key_here
set LTCG_API_URL=https://lunchtable.cards

# Windows (PowerShell)
$env:LTCG_API_KEY = "ltcg_your_actual_key_here"
$env:LTCG_API_URL = "https://lunchtable.cards"
```

### 2. Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LTCG_API_KEY` | Yes | None | Your LTCG API key (format: `ltcg_*`) |
| `LTCG_API_URL` | No | https://lunchtable.cards | LTCG API endpoint |
| `LTCG_API_TIMEOUT` | No | 30000 | Request timeout in milliseconds |
| `OPENCLAW_SKILL_LOG_LEVEL` | No | info | Logging level: `debug`, `info`, `warn`, `error` |
| `OPENCLAW_SKILL_RATE_LIMIT` | No | 100 | Max requests per minute |

## Verification Steps

After installation and configuration, verify everything is working:

### Step 1: Check Installation

```bash
# Verify skill is installed
openclaw skill list | grep ltcg

# Should output: @ltcg/openclaw-skill ✓ loaded
```

### Step 2: Check Configuration

```bash
# Verify environment variables are set
echo $LTCG_API_KEY

# Should output: ltcg_xxxxx... (your key)
```

### Step 3: Test API Connection

```bash
# Using OpenClaw CLI
openclaw skill test @ltcg/openclaw-skill

# Expected output:
# Testing LTCG skill...
# ✓ API connection successful
# ✓ Authentication verified
```

### Step 4: Test Basic Operation

In OpenClaw or via CLI, run:

```bash
openclaw call ltcg:createGame --mode casual --public true
```

Expected output:
```json
{
  "success": true,
  "data": {
    "gameId": "game_abc123xyz...",
    "status": "waiting_for_players",
    "createdAt": "2026-02-05T12:00:00Z"
  }
}
```

## Troubleshooting

### Installation Issues

**Problem: "Command not found: openclaw"**
- Solution: Ensure OpenClaw is installed globally
- Try: `npm install -g openclaw`

**Problem: "EACCES: permission denied"**
- Solution: Use `sudo npm install -g` (not recommended for production)
- Better: Fix npm permissions - see https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

**Problem: "Module not found"**
- Solution: Ensure all dependencies installed
- Try: `npm install` or `bun install`

### Configuration Issues

**Problem: "Missing or invalid API key"**
- Verify key format starts with `ltcg_`
- Check for trailing whitespace in .env file
- Verify the key hasn't been revoked in settings
- Try: `echo $LTCG_API_KEY` to inspect the actual value

**Problem: "Authentication failed"**
- Confirm API key is for the correct environment
- Check that the key is active (not expired)
- Verify you have permission to use the API

**Problem: "Connection timeout"**
- Check internet connection
- Verify `LTCG_API_URL` is accessible
- Try: `ping lunchtable.cards`
- Check firewall/proxy settings

### Runtime Issues

**Problem: "Skill failed to load"**
- Check OpenClaw logs: `openclaw logs skill ltcg`
- Verify configuration is valid JSON
- Try restarting: `openclaw restart`
- Check disk space

**Problem: "Rate limit exceeded"**
- Current limit: 100 requests per minute
- Wait before retrying
- Consider increasing `OPENCLAW_SKILL_RATE_LIMIT` if needed
- Contact support if limits are insufficient

**Problem: "Invalid game state"**
- Ensure you're using a valid `gameId`
- Verify the game status allows your action
- Check that it's your turn (for turn-based actions)
- Review available moves with `ltcgGetLegalMoves`

### Debugging

**Enable Debug Logging:**

```bash
export OPENCLAW_SKILL_LOG_LEVEL=debug
openclaw restart
```

**Check Logs:**

```bash
# macOS/Linux
tail -f ~/.openclaw/logs/skill-ltcg.log

# Windows
Get-Content %APPDATA%\OpenClaw\logs\skill-ltcg.log -Wait
```

**Validate Configuration:**

```bash
openclaw skill debug @ltcg/openclaw-skill
```

This will output:
- Configuration status
- Environment variables (masked for security)
- API connectivity test
- Loaded skill features

## Uninstallation

### Using npm:
```bash
npm uninstall -g @ltcg/openclaw-skill
```

### Using OpenClaw CLI:
```bash
openclaw skill remove @ltcg/openclaw-skill
```

### Manual:
```bash
# Remove installation directory
rm -rf /path/to/openclaw/skills/openclaw-skill

# Unregister from OpenClaw
openclaw skill unregister ltcg

# Restart OpenClaw
openclaw restart
```

## Upgrading

### Using npm:
```bash
npm update -g @ltcg/openclaw-skill
```

### Manual upgrade:
```bash
cd /path/to/openclaw/skills/openclaw-skill
git pull origin main
npm install
npm run build
openclaw restart
```

## Next Steps

- Follow the [QUICKSTART.md](./QUICKSTART.md) for your first game
- Check [README.md](./README.md) for available skills reference
- Review example workflows in the `examples/` directory

## Support

- **Issues**: Report on GitHub with `[installation]` tag
- **Logs**: Include relevant logs when reporting issues
- **API Key Issues**: Contact support at api-support@lunchtable.cards
- **Community**: Join Discord for peer support

---

**Installation Guide Version**: 1.0.0
**Last Updated**: 2026-02-05
**Tested On**: Node 20+, Bun 1.3+, OpenClaw 2.0+
