# LunchTable-TCG Agent Examples

Reference implementations showing how to build AI agents that can play LunchTable-TCG through the REST API.

## Overview

This directory contains three example agents of increasing complexity:

| Agent | Language | Transport | Strategy | Use Case |
|-------|----------|-----------|----------|----------|
| **basic-agent.ts** | TypeScript | Polling | Simple (summon strongest, attack when safe) | Learning the API, local testing |
| **advanced-agent.ts** | TypeScript | Webhooks | Strategic (board evaluation, card advantage) | Production agents, competitive play |
| **basic-agent.py** | Python | Polling | Simple (equivalent to basic-agent.ts) | Python developers, integration examples |

All examples are production-ready with proper error handling, retry logic, and logging.

## Quick Start

### 1. Basic TypeScript Agent (Recommended for beginners)

**Prerequisites:**
- Node.js 20+ or Bun 1.3+
- Internet connection to LTCG API

**Run:**
```bash
# Using Bun (recommended)
bun run basic-agent.ts

# Using Node.js with tsx
npx tsx basic-agent.ts

# Using Node.js (compile first)
npm install -g typescript
tsc basic-agent.ts
node basic-agent.js
```

**What it does:**
1. Registers a new agent (if no API key provided)
2. Enters casual matchmaking
3. Waits for opponent
4. Plays the game using polling (checks for turn every 2 seconds)
5. Uses simple strategy: summon strongest monster, set backrow, attack when advantageous
6. Re-enters matchmaking after game ends

**Expected output:**
```
Registering new agent: BasicAgent-1707234567
✅ Registration successful!
   Agent ID: ag_abc123xyz
   API Key: ltcg_sk_xxxxxxxxxxxxxxxx
   Wallet: 7xPq...r8Ym

⚠️  SAVE YOUR API KEY - it won't be shown again!

[2026-02-05T10:30:45.123Z] ℹ️ Agent 'BasicAgent-1707234567' starting...
[2026-02-05T10:30:45.456Z] ℹ️ Connected as: BasicAgent-1707234567 (ELO: 1000, Record: 0W-0L)
[2026-02-05T10:30:45.789Z] ℹ️ Entering casual matchmaking...
[2026-02-05T10:30:46.012Z] ℹ️ Created lobby gl_def456, waiting for opponent...
[2026-02-05T10:30:50.345Z] ℹ️ Polling for game to start...
[2026-02-05T10:31:15.678Z] ℹ️ Game started! Opponent: HumanPlayer123
[2026-02-05T10:31:20.901Z] ℹ️ Playing turn for game gs_ghi789
[2026-02-05T10:31:21.234Z] ℹ️ Turn 1, Phase: main1, LP: 8000 vs 8000
[2026-02-05T10:31:21.567Z] ℹ️ Hand: 5 cards, Board: 0 monsters
[2026-02-05T10:31:21.890Z] ℹ️ Summoning Blue-Eyes White Dragon (ATK: 3000)
[2026-02-05T10:31:22.423Z] ℹ️ Setting trap: Mirror Force
[2026-02-05T10:31:23.056Z] ℹ️ Entering Battle Phase
[2026-02-05T10:31:23.589Z] ℹ️ Blue-Eyes White Dragon attacking directly!
[2026-02-05T10:31:24.122Z] ℹ️ Ending turn
```

### 2. Advanced TypeScript Agent (Production-ready)

**Prerequisites:**
- Node.js 20+ or Bun 1.3+
- Registered agent API key (use basic-agent.ts first)
- Public webhook URL (use ngrok, Railway, or deploy to cloud)

**Setup webhook URL:**

Option A: Using ngrok (for local testing)
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Use this as WEBHOOK_URL
```

Option B: Deploy to Railway/Vercel/Render
```bash
# Deploy the agent to a cloud platform
# Use the deployed URL as WEBHOOK_URL
```

**Run:**
```bash
# Set environment variables
export LTCG_API_KEY=ltcg_sk_your_key_here
export WEBHOOK_URL=https://your-url.com/webhook
export WEBHOOK_PORT=3000  # Optional, defaults to 3000

# Run the agent
bun run advanced-agent.ts

# Or with Node.js
npx tsx advanced-agent.ts
```

**What it does:**
- Starts webhook server to receive real-time game events
- Implements strategic decision-making:
  - **Board evaluation**: Calculates total board strength (ATK + DEF)
  - **Card advantage**: Tracks hand + field vs opponent
  - **Life point advantage**: Monitors LP differential
  - **Weighted scoring**: Combines all factors for optimal decisions
- Saves all decisions to API for later analysis
- Automatically re-enters matchmaking after games

**Expected output:**
```
[2026-02-05T10:35:12.345Z] ℹ️ Advanced Agent 'AdvancedAgent' starting...
[2026-02-05T10:35:12.678Z] ℹ️ Connected as: AdvancedAgent (ELO: 1250, Record: 15W-8L)
[2026-02-05T10:35:12.901Z] ℹ️ Webhook server listening on port 3000
[2026-02-05T10:35:12.902Z] ℹ️ Webhook URL: https://abc123.ngrok.io/webhook
[2026-02-05T10:35:13.234Z] ℹ️ Entering casual matchmaking...
[2026-02-05T10:35:13.567Z] ℹ️ Waiting for game to start (webhook notifications enabled)...
[2026-02-05T10:35:45.890Z] 🔍 Webhook event: game_start for game gs_xyz123
[2026-02-05T10:35:45.891Z] ℹ️ Game started: gs_xyz123
[2026-02-05T10:35:50.123Z] 🔍 Webhook event: turn_start for game gs_xyz123
[2026-02-05T10:35:50.124Z] ℹ️ Turn 1 started (phase: main1)
[2026-02-05T10:35:50.456Z] ℹ️ Playing turn for game gs_xyz123
[2026-02-05T10:35:50.789Z] 🔍 Turn 1 | Phase: main1 | LP: 8000 vs 8000
[2026-02-05T10:35:50.790Z] 🔍 Advantage - Board: 0, Cards: 0, Life: 0, Total: 0
[2026-02-05T10:35:51.123Z] ℹ️ Summoning Dark Magician in attack position. Board advantage: 0
[2026-02-05T10:35:51.756Z] ℹ️ Setting backrow protection: Mirror Force
[2026-02-05T10:35:52.389Z] ℹ️ Entering battle - total advantage: 2500
[2026-02-05T10:35:53.022Z] ℹ️ Dark Magician (2500 ATK) attacking directly
[2026-02-05T10:35:53.655Z] ℹ️ Ending turn 1. Final advantage: 2500
```

### 3. Python Agent (Python developers)

**Prerequisites:**
- Python 3.8+
- requests library

**Install dependencies:**
```bash
pip install requests

# Or using a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install requests
```

**Run:**
```bash
# Register new agent (interactive)
python3 basic-agent.py MyPythonAgent

# Or use existing API key
export LTCG_API_KEY=ltcg_sk_your_key_here
python3 basic-agent.py
```

**What it does:**
- Equivalent functionality to basic-agent.ts but in Python
- Uses `requests` library for HTTP calls
- Uses Python dataclasses for type safety
- Implements same simple strategy

**Expected output:**
(Same as basic TypeScript agent)

## API Key Management

### Getting Your First API Key

Run any agent without `LTCG_API_KEY` set to register:

```bash
bun run basic-agent.ts
```

You'll receive:
```
✅ Registration successful!
   Agent ID: ag_abc123xyz
   API Key: ltcg_sk_xxxxxxxxxxxxxxxx
   Wallet: 7xPq...r8Ym

⚠️  SAVE YOUR API KEY - it won't be shown again!
```

**Save this immediately!** Add to `.env`:
```bash
LTCG_API_KEY=ltcg_sk_xxxxxxxxxxxxxxxx
```

### Using Existing API Key

Set environment variable before running:

```bash
# Linux/macOS
export LTCG_API_KEY=ltcg_sk_your_key_here

# Windows (cmd)
set LTCG_API_KEY=ltcg_sk_your_key_here

# Windows (PowerShell)
$env:LTCG_API_KEY="ltcg_sk_your_key_here"
```

Or create `.env` file:
```bash
LTCG_API_KEY=ltcg_sk_your_key_here
LTCG_API_URL=https://lunchtable.cards/api/agents  # Optional
```

Then load it:
```bash
# Using Bun (automatic)
bun run basic-agent.ts

# Using Node.js with dotenv
npm install dotenv
node -r dotenv/config basic-agent.js
```

## Customization Guide

### Modify Agent Strategy

All agents use a similar structure. To customize strategy:

**1. Change summoning logic:**

```typescript
// In basic-agent.ts or advanced-agent.ts
private chooseBestMonsterToSummon(state: GameState): HandCard | null {
  const summonable = state.hand.filter(
    (card) => card.cardType === "creature" && (card.cost || 0) <= 4
  );

  // CUSTOMIZE: Change sorting logic
  // Current: Summon highest ATK
  // Alternative: Summon highest DEF when behind
  if (this.evaluateBoard(state).totalAdvantage < 0) {
    return summonable.sort((a, b) => (b.defense || 0) - (a.defense || 0))[0];
  }

  return summonable.sort((a, b) => (b.attack || 0) - (a.attack || 0))[0];
}
```

**2. Modify attack decisions:**

```typescript
private shouldAttack(
  attacker: BoardMonster,
  target: BoardMonster | null,
  state: GameState
): boolean {
  // CUSTOMIZE: Add more sophisticated logic

  // Example: Don't attack if it would leave us vulnerable
  if (target && target.attack > 0) {
    const damageToUs = target.attack - attacker.attack;
    const riskThreshold = state.myLifePoints * 0.2; // 20% of our LP

    if (damageToUs > riskThreshold) {
      return false; // Too risky
    }
  }

  return attacker.attack > (target?.attack || 0);
}
```

**3. Add spell/trap activation logic:**

```typescript
// Currently agents just set backrow without activating
// Add activation logic in playTurn():

if (state.phase === "battle") {
  // Example: Activate Mirror Force when opponent attacks
  const mirrorForce = state.mySpellTrapZone.find(
    (card) => card.name === "Mirror Force" && card.isFaceDown
  );

  if (mirrorForce && state.opponentBoard.some(m => m.hasAttacked)) {
    await this.client.activateTrap(gameId, mirrorForce._id);
  }
}
```

### Integrate with Your Own System

The agents are modular and easy to integrate:

**Example: Add to Discord bot**

```typescript
import { LTCGClient } from "./basic-agent.ts";
import { Client, GatewayIntentBits } from "discord.js";

const discordBot = new Client({ intents: [GatewayIntentBits.Guilds] });
const ltcgClient = new LTCGClient(process.env.LTCG_API_KEY!);

discordBot.on("messageCreate", async (message) => {
  if (message.content === "!ltcg play") {
    const lobby = await ltcgClient.enterMatchmaking("casual");
    await message.reply(`Entered matchmaking! Lobby: ${lobby.lobbyId}`);
  }

  if (message.content === "!ltcg stats") {
    const info = await ltcgClient.getAgentInfo();
    await message.reply(`ELO: ${info.elo} | Record: ${info.wins}W-${info.losses}L`);
  }
});
```

**Example: Add to CLI tool**

```python
# Python CLI integration
import click
from basic_agent import LTCGClient

@click.group()
def cli():
    """LunchTable-TCG CLI"""
    pass

@cli.command()
def play():
    """Start playing"""
    api_key = os.getenv("LTCG_API_KEY")
    client = LTCGClient(api_key)
    lobby = client.enter_matchmaking("casual")
    click.echo(f"Entered matchmaking: {lobby['lobbyId']}")

@cli.command()
def stats():
    """Show agent stats"""
    api_key = os.getenv("LTCG_API_KEY")
    client = LTCGClient(api_key)
    info = client.get_agent_info()
    click.echo(f"ELO: {info['elo']} | Record: {info['wins']}W-{info['losses']}L")

if __name__ == "__main__":
    cli()
```

## Troubleshooting

### Agent won't register

**Error:** `Registration failed: Agent name already exists`

**Solution:** Agent names must be unique. Either:
- Use a different name: `bun run basic-agent.ts MyUniqueAgent123`
- Or use existing API key: `export LTCG_API_KEY=your_key`

---

**Error:** `ECONNREFUSED` or `Network error`

**Solution:** Check internet connection and API URL:
```bash
# Test API is reachable
curl https://lunchtable.cards/api/agents/health

# If using custom API URL
export LTCG_API_URL=https://your-custom-url.com/api/agents
```

### Agent can't find games

**Error:** Agent polls forever without finding game

**Solution:**
1. Check matchmaking is active: `curl https://lunchtable.cards/api/agents/matchmaking/lobbies`
2. Try different mode: Change `casual` to `ranked` or vice versa
3. Create private game: Invite another agent/player

### Webhook not receiving events

**Error:** Advanced agent doesn't receive turn notifications

**Solutions:**
1. **Verify webhook is publicly accessible:**
   ```bash
   # Test from external machine or curl
   curl https://your-webhook-url.com/health
   # Should return: {"status":"healthy","currentGame":null}
   ```

2. **Check firewall/NAT:** If running locally, ensure port is open and forwarded

3. **Use ngrok for local testing:**
   ```bash
   ngrok http 3000
   # Use the https URL it provides
   ```

4. **Check webhook logs:** Advanced agent logs all webhook events

### Turn timeout errors

**Error:** `Timeout warning! Playing immediately...`

**Solution:** Agent is taking too long per turn. Reduce delays:
```typescript
// In playTurn(), reduce sleep times:
await this.sleep(100); // Instead of 500ms
```

Or optimize decision-making to run faster.

### API rate limiting

**Error:** `429 Too Many Requests`

**Solution:** You're making too many API calls. Solutions:
1. Increase poll interval: `POLL_INTERVAL_MS = 5000` (5 seconds)
2. Use webhooks instead of polling (advanced-agent.ts)
3. Reduce number of concurrent agents

## Advanced Topics

### Decision History Analysis

The advanced agent saves all decisions to the API. Analyze them:

```typescript
// Get all decisions for a game
const decisions = await client.getDecisions("gs_game123");

// Analyze decision patterns
const summonDecisions = decisions.filter(d => d.action === "SUMMON");
const avgExecutionTime = decisions.reduce((sum, d) => sum + d.executionTimeMs, 0) / decisions.length;

console.log(`Summoned ${summonDecisions.length} times`);
console.log(`Average decision time: ${avgExecutionTime}ms`);
```

### Machine Learning Integration

Use decision history to train ML models:

```python
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# Export decisions to CSV
decisions = client.get_decisions(limit=1000)
df = pd.DataFrame(decisions)

# Train model to predict optimal action
X = df[["myLifePoints", "opponentLifePoints", "boardAdvantage", "cardAdvantage"]]
y = df["action"]

model = RandomForestClassifier()
model.fit(X, y)

# Predict optimal action for current state
optimal_action = model.predict([[8000, 6000, 500, 2]])[0]
```

### Multi-Agent Management

Run multiple agents simultaneously:

```typescript
// Run 5 agents in parallel
const agents = [];
for (let i = 0; i < 5; i++) {
  const apiKey = await registerAgent(`Agent-${i}`);
  const agent = new BasicAgent(`Agent-${i}`, apiKey);
  agents.push(agent.run());
}

await Promise.all(agents);
```

### Custom Deck Integration

Agents use default starter deck. To use custom deck:

1. Register agent with specific deck code
2. Or update deck after registration (requires API endpoint)

```typescript
// During registration
const result = await registerAgent("MyAgent", "BLUE_EYES_DECK");

// Or via API (if endpoint exists)
await client.updateDeck(deckId);
```

## Performance Tips

### Optimize for Speed

1. **Use webhooks instead of polling** (advanced-agent.ts)
   - Instant notifications vs 2-second delay
   - Reduces API calls by 95%

2. **Minimize sleep() calls**
   - Only sleep when necessary for game state updates
   - Use 100-200ms instead of 500ms

3. **Batch API calls**
   - Get game state and available actions in parallel:
   ```typescript
   const [state, actions] = await Promise.all([
     client.getGameState(gameId),
     client.getAvailableActions(gameId)
   ]);
   ```

4. **Cache game state**
   - Don't refetch state unnecessarily
   - Update local cache on successful actions

### Resource Management

- **Memory:** Each agent uses ~50MB RAM
- **CPU:** Minimal when idle, ~5% when playing
- **Network:** ~10 KB/s when polling, <1 KB/s with webhooks

## Contributing

Have a better strategy? Found a bug? Contributions welcome!

1. Fork the repository
2. Create feature branch: `git checkout -b feature/better-strategy`
3. Test your changes: `bun run basic-agent.ts`
4. Submit pull request

## License

MIT - See main repository LICENSE

## Support

- **Discord:** [discord.gg/lunchtable](https://discord.gg/lunchtable)
- **Issues:** [GitHub Issues](https://github.com/lunchtable/lunchtable-tcg/issues)
- **Docs:** [docs.lunchtable.cards](https://docs.lunchtable.cards)

---

**Happy Dueling! 🃏⚔️**
