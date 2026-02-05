#!/bin/bash
# Automated ClawHub Publishing Script for LunchTable-TCG
# Run this script to publish the skill to ClawHub in one command

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎴 Publishing LunchTable-TCG to ClawHub...${NC}"
echo ""

# Step 1: Validate skill structure
echo -e "${BLUE}Step 1/6: Validating skill format...${NC}"
if [ -f ".validate.sh" ]; then
  bash .validate.sh
else
  echo -e "${RED}✗ .validate.sh not found${NC}"
  exit 1
fi
echo ""

# Step 2: Check for ClawHub CLI
echo -e "${BLUE}Step 2/6: Checking ClawHub CLI...${NC}"
if ! command -v clawhub &> /dev/null; then
  echo -e "${YELLOW}⚠️  ClawHub CLI not found. Installing...${NC}"
  npm install -g @clawhub/cli
  echo -e "${GREEN}✓ ClawHub CLI installed${NC}"
else
  echo -e "${GREEN}✓ ClawHub CLI found${NC}"
fi
echo ""

# Step 3: Check authentication
echo -e "${BLUE}Step 3/6: Checking ClawHub authentication...${NC}"
if ! clawhub whoami &> /dev/null; then
  echo -e "${YELLOW}⚠️  Not logged in to ClawHub${NC}"
  echo "Please login to ClawHub:"
  clawhub login

  # Verify login succeeded
  if ! clawhub whoami &> /dev/null; then
    echo -e "${RED}✗ Login failed. Please try again.${NC}"
    exit 1
  fi
fi
CLAWHUB_USER=$(clawhub whoami 2>/dev/null || echo "unknown")
echo -e "${GREEN}✓ Logged in as: $CLAWHUB_USER${NC}"
echo ""

# Step 4: Pre-flight check
echo -e "${BLUE}Step 4/6: Pre-flight check...${NC}"
SKILL_NAME=$(grep "^name:" SKILL.md | head -1 | sed 's/name: *//')
SKILL_VERSION=$(grep "^version:" SKILL.md | head -1 | sed 's/version: *//')
echo "  Skill Name: $SKILL_NAME"
echo "  Version: $SKILL_VERSION"
echo ""
read -p "$(echo -e ${YELLOW}Continue with submission? [y/N]${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Aborted by user${NC}"
  exit 0
fi
echo ""

# Step 5: Submit to ClawHub
echo -e "${BLUE}Step 5/6: Submitting to ClawHub...${NC}"
if clawhub submit .; then
  echo -e "${GREEN}✓ Successfully submitted to ClawHub${NC}"
else
  echo -e "${RED}✗ Submission failed${NC}"
  echo ""
  echo "Common issues:"
  echo "  - Skill name already exists (try a different namespace)"
  echo "  - Invalid SKILL.md format"
  echo "  - Network issues"
  echo ""
  echo "Check ClawHub logs for details:"
  echo "  clawhub logs"
  exit 1
fi
echo ""

# Step 6: Publish to npm (optional)
echo -e "${BLUE}Step 6/6: Publish to npm (optional)...${NC}"
read -p "$(echo -e ${YELLOW}📦 Also publish to npm? [y/N]${NC} )" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Check if logged in to npm
  if ! npm whoami &> /dev/null; then
    echo "Please login to npm:"
    npm login
  fi

  NPM_USER=$(npm whoami 2>/dev/null || echo "unknown")
  echo -e "${GREEN}✓ Logged in to npm as: $NPM_USER${NC}"

  # Publish
  if npm publish --access public; then
    echo -e "${GREEN}✓ Published to npm as @lunchtable/openclaw-skill-ltcg${NC}"
  else
    echo -e "${YELLOW}⚠️  npm publish failed (may already exist)${NC}"
  fi
fi
echo ""

# Success summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Publishing complete!${NC}"
echo ""
echo "Your skill has been submitted to ClawHub for review."
echo ""
echo "Next steps:"
echo "  • Track submission status: clawhub status $SKILL_NAME"
echo "  • View on ClawHub: https://clawhub.com/skills/lunchtable/lunchtable-tcg"
echo "  • Check review queue: https://clawhub.com/dashboard/submissions"
echo ""
echo "Installation (after approval):"
echo "  openclaw skill install lunchtable-tcg"
echo ""
echo "Or via npm:"
echo "  openclaw skill add @lunchtable/openclaw-skill-ltcg"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
