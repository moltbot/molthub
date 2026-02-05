# Getting Started with Publishing

**New to ClawHub? Start here.**

This is the simplest possible guide to publishing your skill.

---

## What You Need (5 Minutes Setup)

### 1. Create ClawHub Account
Go to: https://clawhub.com/signup

### 2. Install CLI
```bash
npm install -g @clawhub/cli
```

### 3. Login
```bash
clawhub login
```

**That's it.** You're ready to publish.

---

## Publishing (1 Command)

```bash
cd skills/lunchtable/lunchtable-tcg
./publish.sh
```

The script will:
1. ✅ Check everything is correct
2. ✅ Ask for confirmation
3. ✅ Submit to ClawHub
4. ✅ Give you a status link

---

## What to Expect

### During Publishing (~2 minutes)

You'll see:
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

Continue with submission? [y/N]
```

Type `y` and press Enter.

```
Step 5/6: Submitting to ClawHub...
✓ Successfully submitted to ClawHub

Step 6/6: Publish to npm (optional)...
📦 Also publish to npm? [y/N]
```

Type `n` (you can do this later).

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Publishing complete!

Your skill has been submitted to ClawHub for review.

Next steps:
  • Track submission status: clawhub status lunchtable-tcg
  • View on ClawHub: https://clawhub.com/skills/lunchtable/lunchtable-tcg
```

### After Submission

**Immediate** (~1 second)
- Your submission is queued
- Automated validation runs

**5-10 Minutes**
- Security scans
- Dependency checks
- Example tests

**1-3 Days**
- Manual review by ClawHub team
- Quality check
- Documentation review

**After Approval**
- Skill appears in registry
- Users can install it

---

## Checking Status

```bash
clawhub status lunchtable-tcg
```

Shows:
- Current review stage
- Any issues found
- Expected approval time

---

## After Approval

Your skill is live! Users can install it:

```bash
openclaw skill install lunchtable-tcg
```

Track usage:
```bash
clawhub stats lunchtable-tcg
```

---

## Common Questions

### "What if something goes wrong?"

The script checks everything before submitting. If there's an issue, it tells you exactly what to fix.

### "Can I test before publishing?"

Yes:
```bash
bash .validate.sh
```

This checks everything without submitting.

### "What if I need to update later?"

Just run the script again:
```bash
./publish.sh
```

It handles updates automatically.

### "Do I need to publish to npm?"

No, it's optional. ClawHub works without npm.

### "How much does it cost?"

ClawHub is free for open-source skills.

---

## Need More Info?

- **Quick reference**: [QUICKSTART_PUBLISH.md](QUICKSTART_PUBLISH.md)
- **Complete guide**: [PUBLISH.md](PUBLISH.md)
- **Testing**: [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
- **Summary**: [PUBLISHING_SUMMARY.md](PUBLISHING_SUMMARY.md)

---

## Ready to Publish?

```bash
./publish.sh
```

That's it! Good luck! 🎴
