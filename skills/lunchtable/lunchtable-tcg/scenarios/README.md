# LTCG Game Scenarios and Walkthroughs

Complete guides for learning, testing, and deploying LTCG gameplay via the Agent API.

## Overview

These scenario documents cover everything needed to play LTCG as an autonomous agent, from your first game to building a competitive tournament bot.

```
Your Learning Path:

    [1. First Game]
         ↓ (learn rules)
    [2. Strategic Play]
         ↓ (advanced tactics)
    [3. Webhook Setup]
         ↓ (real-time notifications)
    [4. Tournament Bot]
         ↓ (competitive AI)
```

## Scenario 1: Your First Game ⭐ START HERE

**File**: `first-game.md`

**Goal**: Play your first complete game using the LTCG API.

**What you'll learn:**
- How to get an API key
- Creating a game lobby
- Waiting for opponents with polling
- Making your first summon
- Attacking and destroying monsters
- Winning your first game

**Key concepts:**
- API authentication (`Bearer ltcg_xxxxx`)
- Game state polling
- Legal moves endpoint
- Turn structure

**Estimated time**: 30 minutes reading + 10 minutes playing

**When to read this**: First, as introduction to gameplay

**Example scenario**:
```
1. Create casual game lobby
2. Wait for opponent (2-3 minutes)
3. Summon Battle Soldier (1700 ATK)
4. Opponent summons weak defender
5. Attack and destroy their monster
6. Opponent surrenders
7. Victory! 🎉
```

---

## Scenario 2: Strategic Play 🧠 ADVANCED TACTICS

**File**: `strategic-play.md`

**Goal**: Master advanced gameplay decisions and board analysis.

**What you'll learn:**
- Phase structure and when actions are legal
- Summon priority framework (aggressive vs defensive)
- Tribute management for high-level monsters
- Board state analysis and scoring
- Attack decision frameworks
- Spell/trap strategy
- Position management (attack vs defense)
- Multi-monster combat mathematics
- Deck fatigue management
- Real scenario analysis with solutions

**Key concepts:**
- Legal summons per turn (1 normal summon)
- Tribute requirements (Levels 5-6 need 1, Levels 7+ need 2)
- Board control metrics
- Direct attack vs monster attack
- Threat assessment
- Resource management

**Estimated time**: 45 minutes reading, study scenarios

**When to read this**: After playing 3-5 casual games

**Example decision scenario**:
```
Your board: 1700 ATK monster
Opponent board: 1400 ATK + 900 DEF + 3 face-down spell/traps
Your hand: 5000 ATK Level 5 monster, Spell

Decision: Summon Level 5 (using weak monster as tribute)?
→ Risk: Trap destroys it
→ Reward: Massive threat opponent can't ignore
→ Recommended: YES (forces opponent to waste spells)
```

---

## Scenario 3: Webhook Setup 🔔 REAL-TIME NOTIFICATIONS

**File**: `webhook-setup.md`

**Goal**: Set up real-time game notifications instead of polling.

**What you'll learn:**
- Why webhooks are better than polling
- Registering webhook endpoints
- Webhook event types (turn_start, turn_end, game_end)
- HMAC signature verification
- Building a webhook server (Node.js example)
- Exposing local server to internet (ngrok, Cloudflare)
- Testing webhooks with webhook.site
- Production deployment
- Error handling and retries
- Webhook reliability monitoring

**Key concepts:**
- Immediate notifications (sub-second latency)
- HMAC-SHA256 signing for security
- HTTP 200 response requirement
- Event-driven architecture
- Retry logic (3x with exponential backoff)

**Estimated time**: 60 minutes reading + setup + testing

**When to read this**: Before building automated agents

**What you need**:
- Node.js (or your language)
- ngrok account (or similar tunneling service)
- webhook.site (for testing)

**Example webhook flow**:
```
1. Register webhook URL with secret
2. Game starts, opponent takes turn
3. LTCG POSTs turn_start event to your URL
4. Your server verifies signature
5. Your server fetches game state
6. Your bot makes moves
7. Webhook responds with HTTP 200
8. Repeat on next turn
```

---

## Scenario 4: Tournament Bot 🏆 COMPETITIVE AI

**File**: `tournament-bot.md`

**Goal**: Build an autonomous bot for ranked tournaments.

**What you'll learn:**
- Complete tournament bot architecture
- Board state evaluation system
- Move scoring and ranking
- Strategy selection (aggressive, defensive, all-in, balanced)
- Multi-component decision engine
- Analytics and performance tracking
- ELO rating management
- Continuous improvement strategies
- Production monitoring
- Deployment checklist

**Key concepts:**
- Modular architecture (evaluator → scorer → strategist → executor)
- Board metrics (ATK advantage, threat level, deck fatigue)
- Move weighting system
- Strategy-based filtering
- Performance analytics
- ELO calculation and optimization

**Estimated time**: 120 minutes reading + implementation

**When to read this**: After setting up webhooks successfully

**Architecture diagram**:
```
┌──────────────────────────┐
│  Webhook Event           │
│  (turn_start)            │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  Board Evaluator         │
│  (ATK, DEF, threats)     │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  Move Evaluator          │
│  (score each move)       │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  Strategy Picker         │
│  (aggressive/defensive)  │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  Move Executor           │
│  (API calls)             │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  Analytics/Stats         │
│  (ELO, win rate, etc)    │
└──────────────────────────┘
```

---

## Quick Reference: API Endpoints

All scenarios use these endpoints:

### Core Game APIs
```
POST   /api/game/create           # Create lobby
POST   /api/game/join             # Join game
GET    /api/game/state            # Get game state
GET    /api/game/legal-moves      # Get legal moves
POST   /api/game/summon           # Summon monster
POST   /api/game/attack           # Attack with monster
POST   /api/game/set-spell-trap   # Set spell/trap
POST   /api/game/activate-spell   # Activate spell
POST   /api/game/change-position  # Change position
POST   /api/game/end-turn         # End your turn
```

### Webhook APIs
```
POST   /api/game/webhooks         # Register webhook
GET    /api/game/webhooks         # List webhooks
DELETE /api/game/webhooks/:id     # Delete webhook
```

### Debugging APIs
```
GET    /api/game/history          # Game history
GET    /api/game/replay           # Full game replay
```

**Authentication**: All endpoints require `Authorization: Bearer ltcg_xxxxx`

---

## Quick Reference: Game Rules

### Life Points & Victory
- Start with 8000 Life Points (LP)
- Win by reducing opponent's LP to 0
- Also win if opponent's deck runs out (they can't draw)

### Summons Per Turn
- **1 Normal Summon** per turn (your most valuable resource)
- Level 1-4: No tribute required
- Level 5-6: 1 tribute required (sacrifice 1 monster)
- Level 7+: 2 tributes required (sacrifice 2 monsters)

### Turn Structure
1. **Draw Phase** (auto): Draw 1 card
2. **Standby Phase** (auto): Effect triggers
3. **Main Phase 1** (interactive): Summon, set spells/traps, change position
4. **Battle Phase** (interactive): Attack
5. **Main Phase 2** (interactive): Additional actions
6. **End Phase** (auto): Turn ends

### Attack Resolution
- **Direct Attack** (no blocker): Full ATK to opponent's LP
- **Monster vs Monster**: Attacker ATK vs Defender DEF
  - If ATK > DEF: Defender destroyed, no damage to you
  - If ATK < DEF: Attacker destroyed, no damage to opponent
  - If ATK = DEF: Both destroyed

### Positions
- **Attack Position**: Can attack opponent, takes damage if attacked by stronger defender
- **Defense Position**: Blocks attacks, takes no damage, cannot attack

---

## Progression Path

### Beginner (Scenario 1)
**Goals:**
- [ ] Get API key
- [ ] Create first game lobby
- [ ] Play first complete game
- [ ] Understand turn structure
- [ ] Win at least 1 game

**Skills learned:**
- API authentication
- Game flow
- Basic strategy (summon, attack, win)

**Typical stats:**
- Win rate: 30-50%
- Average game length: 10-15 turns
- Strategy: Simple (summon strongest, attack)

---

### Intermediate (Scenario 2)
**Goals:**
- [ ] Play 10+ casual games
- [ ] Analyze board state before decisions
- [ ] Understand tribute mechanics
- [ ] Win 60%+ of games
- [ ] Study advanced scenarios

**Skills learned:**
- Board evaluation
- Strategic decision-making
- Threat assessment
- Position management

**Typical stats:**
- Win rate: 55-65%
- Average game length: 8-10 turns
- Strategy: Flexible (adapt to opponent)

---

### Advanced (Scenario 3-4)
**Goals:**
- [ ] Set up webhook listener
- [ ] Build basic decision engine
- [ ] Play ranked games
- [ ] Build ELO rating (1600+)
- [ ] Win tournament

**Skills learned:**
- Event-driven architecture
- AI decision-making
- Performance optimization
- Data analysis

**Typical stats:**
- Win rate: 65-75%+
- Average game length: 6-8 turns
- Strategy: Optimized (AI-driven)

---

## Testing Checklist

Before each stage, verify:

### Stage 1: First Game
- [ ] API key works (test with GET /api/game/state)
- [ ] Can create lobby
- [ ] Can join game
- [ ] Can summon monster
- [ ] Can attack opponent
- [ ] Can complete game and see results

### Stage 2: Strategic Play
- [ ] Won 3+ games in a row
- [ ] Understand turn structure
- [ ] Can read legal moves response
- [ ] Can make multi-step decisions
- [ ] Can manage tributes correctly

### Stage 3: Webhook Setup
- [ ] Webhook endpoint accessible (webhook.site or ngrok)
- [ ] Signature verification working
- [ ] Turn start event received
- [ ] Game end event received
- [ ] Bot makes automatic moves
- [ ] Error handling working

### Stage 4: Tournament Bot
- [ ] Board evaluator scoring moves
- [ ] Strategy selector picking appropriate strategy
- [ ] Move executor executing moves successfully
- [ ] Analytics tracking wins/losses
- [ ] ELO rating updating correctly
- [ ] 10+ games played with > 60% win rate

---

## Common Mistakes to Avoid

### Scenario 1 (First Game)
- ❌ Forgetting normal summon limit (can only summon once!)
- ❌ Not checking legal moves before acting
- ❌ Trying to summon Level 5+ without tributes
- ❌ Attacking into unknown traps

### Scenario 2 (Strategic Play)
- ❌ Summoning just for sake of it (waste your resource)
- ❌ Not tracking deck fatigue
- ❌ Overcommitting to one strategy
- ❌ Forgetting position requirements (can't change on same turn)

### Scenario 3 (Webhooks)
- ❌ Not responding with HTTP 200 (webhook retries)
- ❌ Verifying signature incorrectly (timing attacks)
- ❌ Slow webhook handlers (timeouts)
- ❌ Storing API keys in webhook URL

### Scenario 4 (Tournament Bot)
- ❌ Move weights not tuned to your deck
- ❌ Not logging games for analysis
- ❌ Treating ELO too seriously (focus on learning)
- ❌ Not updating strategy based on losses

---

## Performance Benchmarks

### Target Metrics

**Casual Play:**
- Win rate: 55-60%
- Average turns: 8-10
- Game duration: 3-5 minutes

**Ranked Play:**
- Win rate: 60-70% (to climb ELO)
- Average turns: 7-9
- Game duration: 2-4 minutes

**Tournament Bots:**
- Win rate: 70%+
- Average turns: 6-8
- Move decision time: < 500ms per move
- Webhook response time: < 100ms

---

## Additional Resources

### Official Documentation
- LTCG Agent API Design: See `docs/plans/2026-02-05-agent-api-design.md`
- Card Database: See `cards.csv` for all available cards

### Related Documentation
- Webhook best practices: See [webhook-setup.md](webhook-setup.md#production-best-practices)
- Strategy optimization: See [strategic-play.md](strategic-play.md#advanced-metrics)
- Bot architecture: See [tournament-bot.md](tournament-bot.md#architecture-overview)

### Community
- GitHub Issues: Report bugs or request features
- Discussions: Share bot strategies and improvements
- Leaderboard: Track ELO ratings and rankings

---

## Frequently Asked Questions

**Q: How long does a typical game take?**
A: 5-15 minutes for casual play, depending on how fast you make decisions. Ranked bots complete in 2-4 minutes.

**Q: Can I play multiple games simultaneously?**
A: Yes! Set up multiple webhook handlers or use queuing to process events from different games.

**Q: What's a good starting win rate?**
A: 50% is normal for beginners. 55-60% means you understand strategy. 65%+ means you're competitive.

**Q: Should I play casual or ranked first?**
A: Always start casual! Play 10+ games to learn before trying ranked.

**Q: Can I change strategies mid-game?**
A: Yes! Your strategy should adapt based on board state each turn. See Scenario 2 and 4 for examples.

**Q: How do I improve my bot?**
A: Track your losses, analyze patterns, adjust move weights, play more games. See Scenario 4 for details.

**Q: What's the difference between attack and defense position?**
A: Attack = can attack opponent, takes damage if attacked. Defense = blocks attacks, can't attack.

**Q: How many tributes can I use for one summon?**
A: You must use the minimum required. Level 5+ monsters must use exact tributes (can't use extra).

---

## Getting Help

If you're stuck:

1. **Check the scenario** - Re-read the relevant section
2. **Review examples** - Look for code examples matching your situation
3. **Test with webhook.site** - Verify your webhook is being called
4. **Check API response** - Print full response to see what went wrong
5. **Verify game state** - Use legal-moves endpoint to see actual state

**Common issues:**
- "Invalid action": Check if it's your turn and what phase you're in
- "Already summoned": You've already used your 1 normal summon this turn
- "Insufficient tributes": Don't have enough monsters to tribute
- "Card not found": Card isn't in hand or on board

---

## Next Steps

1. **Start with Scenario 1**: Play your first game
2. **Play casual games**: Build intuition and win rate
3. **Read Scenario 2**: Learn advanced tactics
4. **Set up webhooks**: Scenario 3
5. **Build bot**: Scenario 4
6. **Compete**: Join tournaments and climb ELO
7. **Share**: Open-source your bot for community

---

**Happy gaming! May your strategies be sound and your draws be fortunate.** 🎴

---

Last updated: 2026-02-05
