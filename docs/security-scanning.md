---
summary: 'Scan skills for security threats before installing or publishing.'
read_when:
  - Installing third-party skills
  - Publishing skills (CI gate)
  - Reviewing skill security
---

# Security Scanning with AgentGuard

Agent skills run with access to your filesystem, credentials, and network. A malicious skill can steal SSH keys, exfiltrate API tokens, or inject shell commands — all from a single `SKILL.md` bundle.

**AgentGuard** is an open-source security scanner that catches these patterns before they run.

## Install

```bash
# Install from GitHub (npm package coming soon)
npm install -g github:rondorkerin/agentguard
```

## Scan before installing

```bash
# Scan a skill directory before installing
agentguard scan ./downloaded-skill/

# Fail CI on HIGH or above (HIGH and CRITICAL)
agentguard scan ./skill/ --fail-on HIGH

# JSON output for automation
agentguard scan ./skill/ --json
```

## What it detects

| Category | Examples |
|----------|---------|
| **Credential exfiltration** | Reading `~/.ssh/`, `~/.aws/credentials`, env vars with tokens |
| **Code injection** | `eval()`, `exec()`, `Function()` constructor |
| **Privilege escalation** | `sudo`, filesystem writes outside workspace |
| **Obfuscation** | Base64-encoded payloads, hex encoding, dynamic imports |
| **Compound threats** | Credential read + outbound HTTP in the same file |

## Trust score

- **90–100**: Safe — no significant findings
- **70–89**: Caution — review flagged items
- **40–69**: Warning — significant concerns
- **0–39**: Dangerous — likely malicious

## CI/CD integration

Add AgentGuard as a gate in your publish pipeline:

```yaml
# GitHub Actions example
- name: Security scan
  run: |
    npm install -g github:rondorkerin/agentguard
    agentguard scan ./skill/ --fail-on HIGH --json > security-report.json
```

## Why this matters

During early testing, AgentGuard **detected a credential stealer** in a published skill that was reading `~/.ssh/` and `~/.aws/credentials` then exfiltrating them via HTTPS. The skill had a trust score of 0/100.

As the skill ecosystem grows, automated security scanning becomes essential. We recommend scanning all third-party skills before installation.

## Links

- **Repository**: [github.com/rondorkerin/agentguard](https://github.com/rondorkerin/agentguard)
- **Install**: `npm install -g github:rondorkerin/agentguard`
- **Issues**: [github.com/rondorkerin/agentguard/issues](https://github.com/rondorkerin/agentguard/issues)
