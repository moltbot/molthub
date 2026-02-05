# Publishing Flow Diagram

Visual guide to publishing the LunchTable-TCG skill to ClawHub.

---

## The Simple Version

```
You → ./publish.sh → ClawHub → Users Download
```

**Time**: 2 minutes (your part) + 1-3 days (review)

---

## The Detailed Version

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLISHING WORKFLOW                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐
│   Step 1    │  Validate Structure
│  Validation │  ─────────────────────
└──────┬──────┘  • Check all required files
       │         • Validate YAML frontmatter
       │         • Validate JSON syntax
       ▼         • Check version consistency
   ✅ Passed
       │
       │
┌──────┴──────┐
│   Step 2    │  Check ClawHub CLI
│     CLI     │  ─────────────────────
└──────┬──────┘  • Check if installed
       │         • Install if missing
       │         • Verify version
       ▼
   ✅ Ready
       │
       │
┌──────┴──────┐
│   Step 3    │  Authentication
│    Auth     │  ─────────────────────
└──────┬──────┘  • Check login status
       │         • Prompt for login if needed
       │         • Verify user identity
       ▼
   ✅ Logged In
       │
       │
┌──────┴──────┐
│   Step 4    │  Pre-flight Check
│  Pre-flight │  ─────────────────────
└──────┬──────┘  • Display skill name
       │         • Display version
       │         • Ask for confirmation
       │
       ├─────────► User confirms? [y/N]
       │                 │
       │                 ├─ No ──► Abort ❌
       │                 │
       ▼                 └─ Yes
   ✅ Confirmed               │
       │                      │
       │◄─────────────────────┘
       │
┌──────┴──────┐
│   Step 5    │  Submit to ClawHub
│  Submit     │  ─────────────────────
└──────┬──────┘  • Upload skill files
       │         • Create submission
       │         • Generate submission ID
       ▼
   ✅ Submitted
       │
       │
┌──────┴──────┐
│   Step 6    │  Optional: npm Publish
│     npm     │  ─────────────────────
└──────┬──────┘  • Ask for confirmation
       │         • Publish to npm registry
       │         • Link to ClawHub entry
       ▼
   ✅ Complete
       │
       │
       ▼
┌─────────────────────────────────────┐
│                                     │
│   ✅ PUBLISHING COMPLETE!           │
│                                     │
│   Next steps:                       │
│   • Track: clawhub status SKILL     │
│   • View: https://clawhub.com/...   │
│                                     │
└─────────────────────────────────────┘
       │
       │
       ▼

═══════════════════════════════════════════════════════════════
                      CLAWHUB REVIEW PROCESS
═══════════════════════════════════════════════════════════════

┌─────────────┐
│  Immediate  │  Automated Validation
│   (< 1s)    │  ─────────────────────
└──────┬──────┘  • File structure check
       │         • YAML validation
       │         • Required fields check
       ▼
   ✅ Valid
       │
       │
┌──────┴──────┐
│  5-10 min   │  Automated Security Scan
│             │  ─────────────────────
└──────┬──────┘  • Dependency check
       │         • Security vulnerabilities
       │         • License compatibility
       │         • Example testing
       ▼
   ✅ Secure
       │
       │
┌──────┴──────┐
│  1-3 days   │  Manual Review
│             │  ─────────────────────
└──────┬──────┘  • ClawHub team review
       │         • Quality check
       │         • Documentation review
       │         • Functionality test
       │
       ├─────────► Approved?
       │                │
       │                ├─ No ──► Feedback ──► Fix Issues ──┐
       │                │                                    │
       ▼                └─ Yes                               │
   ✅ Approved                                               │
       │                                                     │
       │                                                     │
       │◄────────────────────────────────────────────────────┘
       │
┌──────┴──────┐
│  Instant    │  Publication
│             │  ─────────────────────
└──────┬──────┘  • Add to registry
       │         • Enable installation
       │         • Send notification
       ▼
   ✅ Published

═══════════════════════════════════════════════════════════════
                         USERS INSTALL
═══════════════════════════════════════════════════════════════

   Users run:

   $ openclaw skill install lunchtable-tcg

   ✅ Skill installed and ready to use!

```

---

## Alternative: GitHub Actions Flow

```
┌─────────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS PUBLISHING FLOW                 │
└─────────────────────────────────────────────────────────────┘

Developer
    │
    │  git tag v1.0.0
    │  git push origin v1.0.0
    │
    ▼
┌─────────────┐
│   GitHub    │  Workflow Triggered
│   Actions   │  ─────────────────────
└──────┬──────┘  • Checkout code
       │         • Setup Node.js
       │         • Validate structure
       ▼
   ✅ Validated
       │
       │
┌──────┴──────┐
│  Install    │  Setup Dependencies
│  ClawHub    │  ─────────────────────
└──────┬──────┘  • npm install -g @clawhub/cli
       │         • Authenticate with token
       ▼
   ✅ Ready
       │
       │
┌──────┴──────┐
│   Submit    │  Publish to ClawHub
│  to ClawHub │  ─────────────────────
└──────┬──────┘  • clawhub submit .
       │         • Capture submission ID
       ▼
   ✅ Submitted
       │
       │
┌──────┴──────┐
│  Optional   │  Publish to npm
│  npm        │  ─────────────────────
└──────┬──────┘  • npm publish --access public
       │         • Link registries
       ▼
   ✅ Published
       │
       │
┌──────┴──────┐
│   Create    │  GitHub Release
│   Release   │  ─────────────────────
└──────┬──────┘  • Create release notes
       │         • Link to ClawHub
       │         • Attach artifacts
       ▼
   ✅ Complete
       │
       │
       ▼
   Notification sent to developer

   ✅ v1.0.0 published successfully!
```

---

## Timeline Comparison

### Local Script (`./publish.sh`)

```
You:      [■■■■■■] 2 minutes
          └─ Run script, confirm prompts

ClawHub:  [░░░░░░░░░░░░░░░░░░░░] 1-3 days
          └─ Automated checks + manual review

Total:    2 minutes + 1-3 days review
```

### GitHub Actions (`git tag + push`)

```
You:      [■■] 30 seconds
          └─ Create tag, push

GitHub:   [■■■■] 5 minutes
          └─ Run workflow, submit

ClawHub:  [░░░░░░░░░░░░░░░░░░░░] 1-3 days
          └─ Automated checks + manual review

Total:    5.5 minutes + 1-3 days review
```

---

## Decision Tree

```
Do you need to publish?
    │
    ├─ First time?
    │     │
    │     └─► Read: GETTING_STARTED_PUBLISHING.md
    │          Run:  ./publish.sh
    │
    ├─ Quick update?
    │     │
    │     └─► Run:  ./publish.sh
    │
    ├─ Version release?
    │     │
    │     └─► Run:  git tag v1.x.x
    │               git push origin v1.x.x
    │               (GitHub Actions handles rest)
    │
    └─ Testing first?
          │
          └─► Run:  bash .validate.sh
                    (Then run ./publish.sh)
```

---

## Monitoring Flow

```
After submission:

┌─────────────┐
│   Monitor   │
│   Status    │
└──────┬──────┘
       │
       ├─► clawhub status lunchtable-tcg
       │       │
       │       ├─ "pending" ───► Wait
       │       ├─ "reviewing" ─► Wait
       │       ├─ "approved" ──► ✅ Done!
       │       └─ "rejected" ──► Read feedback, fix, resubmit
       │
       ├─► clawhub logs lunchtable-tcg
       │       └─ View detailed logs
       │
       └─► clawhub comments lunchtable-tcg
               └─ View reviewer comments
```

---

## Error Handling Flow

```
./publish.sh
    │
    ├─ Validation fails?
    │     │
    │     └─► Run: bash .validate.sh
    │          Fix: Issues listed
    │          Retry: ./publish.sh
    │
    ├─ CLI not found?
    │     │
    │     └─► Auto-installs: npm install -g @clawhub/cli
    │
    ├─ Not authenticated?
    │     │
    │     └─► Prompts: clawhub login
    │          Opens: Browser for auth
    │
    ├─ Submission fails?
    │     │
    │     ├─► Name conflict? → Change name in SKILL.md
    │     ├─► Network error? → Check connection, retry
    │     └─► Other error? → Check logs, see PUBLISH.md
    │
    └─ Success!
          └─► Track: clawhub status lunchtable-tcg
```

---

## Multi-Path Publishing

```
Three Ways to Publish:
═══════════════════════

1. Local Script (Recommended)
   ./publish.sh
   ├─ Fastest for initial publish
   ├─ Interactive confirmation
   └─ Full control

2. Manual Commands
   bash .validate.sh
   clawhub login
   clawhub submit .
   ├─ Step-by-step control
   ├─ Learning/debugging
   └─ Customization

3. GitHub Actions
   git tag v1.0.0
   git push origin v1.0.0
   ├─ Best for releases
   ├─ Fully automated
   └─ Team workflows
```

---

## Success Path (Happy Path)

```
Start
  │
  ▼
Install CLI (one-time)
  │
  ▼
Login (one-time)
  │
  ▼
cd skills/lunchtable/lunchtable-tcg
  │
  ▼
./publish.sh
  │
  ├─ Validation ✅
  ├─ CLI Check ✅
  ├─ Auth Check ✅
  ├─ Confirm [y] ✅
  ├─ Submit ✅
  └─ npm? [n] ✅
  │
  ▼
Wait 1-3 days
  │
  ▼
Approved! ✅
  │
  ▼
Users install:
openclaw skill install lunchtable-tcg
  │
  ▼
Success! 🎉
```

---

## Files Created → ClawHub Flow

```
Your Files                    ClawHub Registry
═══════════                   ═══════════════════

SKILL.md ─────────────────►  Skill metadata
.clawhub.json ────────────►  Registry config
package.json ─────────────►  npm linkage
README.md ────────────────►  Skill homepage
INSTALLATION.md ──────────►  Setup guide
CHANGELOG.md ─────────────►  Version history
examples/ ────────────────►  Example gallery
scenarios/ ───────────────►  Use case demos
                              │
                              ▼
                         Published Entry
                              │
                              ▼
                      Users can install!
```

---

## Quick Reference

**Publish Now:**
```bash
./publish.sh
```

**Check Status:**
```bash
clawhub status lunchtable-tcg
```

**View Logs:**
```bash
clawhub logs lunchtable-tcg
```

**Update Skill:**
```bash
# Update version in SKILL.md, package.json, .clawhub.json
./publish.sh
```

**Use GitHub Actions:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

That's the complete publishing flow! 🎴
