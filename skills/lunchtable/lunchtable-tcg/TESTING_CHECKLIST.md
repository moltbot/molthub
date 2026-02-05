# Publishing Testing Checklist

Before running `./publish.sh` for real, verify everything works.

## Pre-Flight Checks

### 1. File Permissions
```bash
# Check publish.sh is executable
ls -lah publish.sh
# Should show: -rwxr-xr-x

# If not executable:
chmod +x publish.sh
```

### 2. Validation Script
```bash
# Test validation
bash .validate.sh

# Expected: ✅ Validation passed!
```

### 3. File Structure
```bash
# Check all required files exist
ls -1 \
  SKILL.md \
  .clawhub.json \
  package.json \
  README.md \
  INSTALLATION.md \
  CHANGELOG.md \
  SUBMISSION.md \
  PUBLISH.md \
  QUICKSTART_PUBLISH.md \
  publish.sh

# Check directories
ls -d examples/ scenarios/
```

### 4. YAML Frontmatter
```bash
# Check SKILL.md has YAML
head -20 SKILL.md

# Should start with:
# ---
# name: lunchtable-tcg
# version: 1.0.0
# ...
```

### 5. Version Consistency
```bash
# Check versions match
grep "version:" SKILL.md | head -1
grep "\"version\":" package.json
grep "\"version\":" .clawhub.json

# All should show: 1.0.0
```

---

## Publishing Dry Run

### 1. Test Script Syntax
```bash
# Check for bash errors
bash -n publish.sh

# No output = syntax OK
```

### 2. Test Validation Step
```bash
# Run just validation
bash .validate.sh
```

### 3. Check ClawHub CLI
```bash
# Check if installed
command -v clawhub

# Check version
clawhub --version || echo "Not installed"
```

### 4. Test Authentication
```bash
# Check if logged in
clawhub whoami || echo "Not logged in"
```

---

## Mock Publish Test

### Safe Test (No Actual Submission)

```bash
# 1. Create a test branch
git checkout -b test-publish

# 2. Make a test modification (to detect changes)
echo "# Test" >> TEST.md

# 3. Run validation
bash .validate.sh

# 4. Check script can run (Ctrl+C before submission)
./publish.sh
# Press Ctrl+C when asked "Continue with submission? [y/N]"

# 5. Clean up
rm TEST.md
git checkout main
git branch -D test-publish
```

---

## First Real Publish

### Step-by-Step

1. **Final Validation**
   ```bash
   bash .validate.sh
   ```
   Expected: ✅ All checks pass

2. **Check Git Status**
   ```bash
   git status
   ```
   Expected: Clean working tree or only known changes

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add ClawHub publishing automation"
   git push origin main
   ```

4. **Run Publish Script**
   ```bash
   ./publish.sh
   ```

5. **During Script Execution**

   **Step 1/6**: Validation
   - Expected: ✅ Validation passed

   **Step 2/6**: ClawHub CLI
   - If not installed: Installs automatically
   - Expected: ✓ ClawHub CLI found

   **Step 3/6**: Authentication
   - If not logged in: Opens browser for login
   - Expected: ✓ Logged in as: yourusername

   **Step 4/6**: Pre-flight
   ```
   Skill Name: lunchtable-tcg
   Version: 1.0.0
   Continue with submission? [y/N]
   ```
   - **ACTION**: Type `y` and press Enter

   **Step 5/6**: Submission
   - Expected: ✓ Successfully submitted to ClawHub

   **Step 6/6**: npm (optional)
   ```
   📦 Also publish to npm? [y/N]
   ```
   - **ACTION**: Type `n` (skip for now) or `y` (if ready)

6. **Verify Submission**
   ```bash
   clawhub status lunchtable-tcg
   ```
   Expected: Shows submission status (pending review)

---

## After Submission

### 1. Monitor Status
```bash
# Check status
clawhub status lunchtable-tcg

# View logs
clawhub logs lunchtable-tcg

# Check for comments
clawhub comments lunchtable-tcg
```

### 2. Expected Timeline

| Time | Stage | Status |
|------|-------|--------|
| Immediate | Validation | Automated checks run |
| 5-10 min | Security scan | Automated scan |
| 1-3 days | Manual review | ClawHub team reviews |
| After approval | Published | Users can install |

### 3. If Approved

Users can install:
```bash
openclaw skill install lunchtable-tcg
```

Check stats:
```bash
clawhub stats lunchtable-tcg
clawhub ratings lunchtable-tcg
```

### 4. If Rejected

Check feedback:
```bash
clawhub comments lunchtable-tcg
```

Fix issues and resubmit:
```bash
./publish.sh
```

---

## Troubleshooting Test Failures

### "publish.sh: permission denied"
```bash
chmod +x publish.sh
```

### "clawhub: command not found"
```bash
npm install -g @clawhub/cli
```

### "Not authenticated"
```bash
clawhub login
```

### "Validation failed"
```bash
# Run validation to see specific errors
bash .validate.sh

# Fix errors listed
# Then retry:
./publish.sh
```

### "Skill name already exists"
```bash
# Option 1: Change name in SKILL.md
vim SKILL.md
# Change: name: yourusername-lunchtable-tcg

# Option 2: Use namespace
# In SKILL.md:
# namespace: yourusername
# name: lunchtable-tcg
```

### "npm publish failed"
```bash
# Login to npm first
npm login

# Or skip npm publishing
# (just answer 'n' when prompted)
```

---

## GitHub Actions Test

### 1. Setup Secrets

1. Generate ClawHub token:
   ```bash
   clawhub token create
   ```

2. Add to GitHub:
   - Go to repo Settings → Secrets
   - Add `CLAWHUB_TOKEN` = your token

3. (Optional) Add npm token:
   ```bash
   npm token create
   ```
   - Add `NPM_TOKEN` = your token

### 2. Test Workflow

```bash
# Create and push a test tag
git tag v1.0.0-test
git push origin v1.0.0-test

# Watch GitHub Actions
# Go to: https://github.com/yourusername/ltcg/actions

# Delete test tag after
git tag -d v1.0.0-test
git push origin :refs/tags/v1.0.0-test
```

### 3. Production Tag

Once testing passes:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Checklist Summary

Before first publish:

- [ ] `publish.sh` is executable
- [ ] `.validate.sh` passes
- [ ] All required files exist
- [ ] Version numbers match (SKILL.md, package.json, .clawhub.json)
- [ ] YAML frontmatter is valid
- [ ] ClawHub CLI installed
- [ ] Logged in to ClawHub
- [ ] Git is committed and pushed
- [ ] Reviewed QUICKSTART_PUBLISH.md

Ready to publish:
```bash
./publish.sh
```

---

**Good luck!** 🎴

If anything fails, check:
1. Error message output
2. [PUBLISH.md](PUBLISH.md) troubleshooting section
3. ClawHub documentation
4. GitHub Issues
