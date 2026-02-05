# Quick Publish to ClawHub

**TL;DR: One command to publish everything.**

## Step 1: Prerequisites (One-Time Setup)

```bash
# Install ClawHub CLI
npm install -g @clawhub/cli

# Login
clawhub login
```

## Step 2: Publish

```bash
cd skills/lunchtable/lunchtable-tcg
./publish.sh
```

## Step 3: Done!

After submission, track status:

```bash
clawhub status lunchtable-tcg
```

---

## What the Script Does

1. ✅ Validates skill structure
2. ✅ Checks authentication
3. ✅ Shows preview (name, version)
4. ✅ Submits to ClawHub
5. ✅ Optionally publishes to npm

---

## Expected Timeline

- **Immediate**: Validation complete
- **5-10 minutes**: Automated checks
- **1-3 days**: Manual review
- **After approval**: Users can install

---

## Installation (After Approval)

Users run:

```bash
openclaw skill install lunchtable-tcg
```

---

## Troubleshooting

**Script fails?**

```bash
# Check if CLI is installed
clawhub --version

# Check if logged in
clawhub whoami

# Run validation manually
bash .validate.sh
```

**Need help?**

See full guide: [PUBLISH.md](PUBLISH.md)

---

That's it! Publishing is now a one-liner.
