# Advanced Strategic Play in LTCG

This guide covers advanced gameplay concepts, board state analysis, and strategic decision-making for competitive play.

## Understanding Game Phases

Every turn follows this exact sequence:

1. **Draw Phase** (auto): Draw 1 card from deck
2. **Standby Phase** (auto): Special effects trigger
3. **Main Phase 1** (interactive): Summon, set spells/traps, change positions
4. **Battle Phase** (interactive): Declare attacks
5. **Main Phase 2** (interactive): Additional actions
6. **End Phase** (auto): Turn ends

Each phase has strict rules about what you can do. Make sure you understand which actions are legal in which phase before making decisions.

## Summon Strategy

### The Normal Summon Resource

You get **ONE Normal Summon per turn**. This is your most valuable resource. Spend it wisely.

```json
{
  "gameState": {
    "turnNumber": 3,
    "normalSummonedThisTurn": false,
    "handSize": 7
  }
}
```

### Summon Priority Framework

Analyze your situation before summoning:

**If you have board control** (more/stronger monsters than opponent):
```
Priority: Summon a Level 5+ monster with tribute
→ Reinforces your advantage
→ Opponent must find removal
→ Example: Summon "Glacial Shark" (5000 ATK) with tribute
```

**If you're behind** (opponent has stronger board):
```
Priority: Summon a defensive wall
→ Set in defense position
→ Blocks opponent's attacks
→ Saves Life Points for survival
→ Example: Summon "Deep Shark" (1500 DEF) in defense
```

**If the board is balanced**:
```
Priority: Summon your highest-attack monster
→ Shift the balance toward you
→ Forces opponent to respond
→ Example: Summon "Murky Shark" (2800 ATK, 7-level) with tribute if you have tribute options
```

### Tribute Management

High-level monsters (5+) require tributes. Here's the math:

```
Level 1-4:  0 tributes required (Summon directly)
Level 5-6:  1 tribute required
Level 7+:   2 tributes required
```

When deciding whether to summon a tribute monster, ask:

1. **Do I have enough tributes?** Check if you have summoned monsters to sacrifice
2. **Is it worth it?** Is the high-level monster's ATK worth losing board presence?
3. **Can opponent respond?** Will they have removal before I attack?

**Example decision:**

```
Your hand: Level 5 monster (2100 ATK), Level 3 monster (1200 ATK)
Your board: Level 3 monster (1200 ATK) summoned

Option A: Summon Level 5 (costs 1 tribute)
→ Sacrifice the Level 3 on board
→ Result: 1 monster on board (2100 ATK)
→ Net gain: +900 ATK
→ Risk: Lost board presence

Option B: Don't summon, summon the Level 3 instead
→ Result: 2 monsters on board (1200 + 1200 = 2400 ATK)
→ Risk: Opponent can remove multiple with spells
→ Reward: More monsters = harder to clear
```

**Best choice:** Depends on opponent's threat. If they have removal spells active, keep multiple monsters (Option B). If they're wide open, consolidate into the stronger monster (Option A).

## Board State Analysis

Get the legal moves endpoint and analyze the full picture:

```bash
curl -X GET "https://lunchtable.cards/api/game/legal-moves?gameId=game_xyz789" \
  -H "Authorization: Bearer $LTCG_API_KEY"
```

Decompose the response:

### Your Position
```json
{
  "myLifePoints": 5000,
  "myBoardMonsters": [
    {"name": "Battle Soldier", "attack": 1700, "position": "attack"},
    {"name": "Kindled Basilisk", "attack": 1500, "position": "attack"}
  ],
  "mySpellsTraps": 1,
  "myHandSize": 4,
  "myDeckRemaining": 12
}
```

Calculate:
- **Board ATK**: 1700 + 1500 = 3200 (total offensive power)
- **Threat Level**: Medium (2 monsters, decent ATK)
- **Deck Fatigue**: Dangerous (12 cards left = 12 turns until deck-out)

### Opponent's Position
```json
{
  "opponentLifePoints": 6000,
  "opponentBoardMonsters": [
    {"name": "Coral Siren", "attack": 1400, "position": "attack"},
    {"name": "Oceanic Mermaid", "attack": 1600, "position": "defense"}
  ],
  "opponentSpellsTraps": 2,
  "opponentDeckRemaining": 15
}
```

Calculate:
- **Opponent Board ATK**: 1400 (only 1 attacker, other is defense)
- **Opponent Threat**: Medium (1 attacker, weaker than yours)
- **Opponent Defense**: Strong (1600 DEF + 2 spell/traps = hard to push through)

### Strategic Assessment

Comparing the two:
```
You: 3200 ATK vs Opponent: 1400 ATK
→ You have ATK superiority: 2800 advantage

You: 5000 LP vs Opponent: 6000 LP
→ You're slightly behind: -1000 HP disadvantage

You have fewer spell/traps (1 vs 2)
→ Opponent has more defensive potential
```

**Decision**: You should attack aggressively to capitalize on your ATK advantage before they set up more defenses.

## Attack Decision Framework

### Attacking Empty Board

If opponent has no monsters, direct attack goes to Life Points:

```json
{
  "canAttack": [
    {
      "attackerCardId": "card_001",
      "attackerName": "Battle Soldier",
      "targets": [
        { "targetType": "direct", "damage": 1700 }
      ]
    }
  ]
}
```

Always attack directly when possible—pure LP damage with no downside.

### Attacking Defense Monsters

Calculate battle resolution:

```
Your Monster Attack: 1700
Opponent's Defender: 900 DEF

Damage = 1700 - 900 = 800
→ Defender takes 800 damage and is destroyed
→ You take 0 damage
→ You win the trade
```

Attack when:
- Your ATK > Opponent DEF (destroys their monster, no damage to you)
- You're trading an equal-ATK monster for their weaker defender

Don't attack when:
- Your ATK < Opponent DEF (you take damage, they keep monster)
- It's a trap (opponent's trap could flip and destroy your monster)

### Reading Your Opponent's Traps

You don't know opponent's trap effects until they trigger, but use logic:

```
Opponent set a trap last turn
You have:
- 3 monsters on board
- 4000 LP
- No spell/trap protection

Risk Assessment:
- If it's a mass removal trap: You lose 3 monsters (bad)
- If it's a targeted removal: You lose 1 monster (acceptable)

Strategy:
- Attack with your weakest monster first (lowest ATK)
- If trap triggers and destroys it, you've minimized loss
- If no trap, continue attacking
```

## Spell/Trap Strategy

### When to Set vs Activate

**Set (face-down)**: Save for later, mystery effect surprises opponent

```json
{
  "action": "set_spell_trap",
  "cardId": "card_005",
  "phase": "main1"
}
```

Best for:
- Trap cards (almost always set)
- Instant-speed spells that counter opponent moves
- Protection spells you want to hide

**Activate (face-up)**: Use immediately

```json
{
  "action": "activate_spell",
  "cardId": "card_005",
  "phase": "main1"
}
```

Best for:
- Spell cards with permanent effects (set them)
- Situational spells that win you the game now
- Healing spells in critical moments

### Common Spell/Trap Archetypes

**Removal** (destroys opponent monster):
- When: Before you attack to clear blockers
- Example: Use after opponent summons their threat monster

**Protection** (stops opponent actions):
- When: Defensive situations, when you're behind on board
- Example: Set protection trap before opponent's turn

**Draw** (gain cards):
- When: You're running low on cards (hand size < 3)
- Example: Use when you need options for next turn

**Board Wipe** (destroys all or multiple):
- When: Opponent has 3+ monsters and you're losing
- Example: Nuclear option when behind

## Resource Management Through the Game

### Turn-by-Turn Lifecycle

**Early Game (Turns 1-3)**:
- Goal: Establish board control
- Strategy: Summon strong monsters, conserve resources
- Decision: Aggressive summons to threaten

```
Turn 1: Summon strongest Level 4 in attack
Turn 2: Attack directly, summon another monster
Turn 3: Expand board presence with 2nd/3rd monster
```

**Midgame (Turns 4-7)**:
- Goal: Protect advantage or catch up if behind
- Strategy: Tribute summons, active spell/trap use
- Decision: Tributary monsters, defensive positioning

```
Turn 4: Summon Level 5+ with tribute, continue attacks
Turn 5: Adapt to opponent's threats, set protection
Turn 6: Clear opponent monsters, push for victory
Turn 7: Prepare for endgame push
```

**Endgame (Turns 8+)**:
- Goal: Close out before deck-out (watch remaining cards!)
- Strategy: Calculate exact damage, go for victory
- Decision: Calculated aggression, avoid excessive risk

```
Turn 8: Finish weakened opponent with last attacks
Turn 9+: Both players low on cards - deck-out becomes threat
```

### Deck Fatigue Management

```bash
# Track remaining cards
gameState.hostDeckCount: 5 cards left
gameState.turnNumber: 10

# Calculate danger zone
Turns until deck-out = 5
Current turn number = 10
```

When deck fatigue looms (< 3 cards left):

1. **Accelerate aggression** - Push for victory this turn
2. **Minimize healing** - Don't waste cards on minor recovery
3. **Go all-in** - Attack with everything; deck-out is close

## Position Strategy

### Attack vs Defense Positioning

**Attack Position** (monster rotated):
- Attacks opponent directly: full ATK to LP or to opposing monster
- Takes damage: if you attack a higher-DEF defender, you take backlash
- When to use: When you're winning; when you need to pressure

```json
{
  "position": "attack",
  "effect": "Can attack opponent directly for full ATK value"
}
```

**Defense Position** (monster vertical):
- Cannot attack: can only block opponent attacks
- No backlash: if attacked, you take 0 damage (monster blocks)
- When to use: When you're behind; when building defensive wall

```json
{
  "position": "defense",
  "effect": "Blocks opponent attacks; cannot attack yourself"
}
```

### Position-Changing Strategy

After a monster is on board for 1 turn, you can change its position in Main Phase 2:

```bash
curl -X POST https://lunchtable.cards/api/game/change-position \
  -H "Authorization: Bearer $LTCG_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "game_xyz789",
    "cardId": "card_001"
  }'
```

**When to flip attack → defense**:
- Opponent has a stronger attacker
- You want to preserve a monster with high DEF
- You need to block incoming damage

**When to flip defense → attack**:
- You're ready to go aggressive
- You cleared opponent's board
- You need to pivot from defense to offense

### The Classic Flip Trap Combo

This is a rare case, but important to know:

```
Turn 1: You set monster in defense position
Turn 2: Opponent attacks your defense monster
→ If it survives, it "flips" to attack position automatically
→ Your monster can now attack opponent directly
```

Watch out for this—opponent may attack your defense monster thinking it's weak, but it flips stronger.

## Multi-Monster Combat Math

When you have multiple monsters vs opponent's board:

```
Your monsters: [1700 ATK, 1500 ATK, 1000 ATK]
Opponent monsters: [1400 ATK, 900 DEF]

Turn order (you choose):
Option A (weak first):
  Attack 1: 1000 ATK vs 900 DEF → destroy, 100 damage
  Attack 2: 1500 ATK vs 1400 ATK → equal trade
  Attack 3: 1700 ATK → direct to LP

Option B (strong first):
  Attack 1: 1700 ATK vs 1400 ATK → win, 300 damage
  Attack 2: 1500 ATK vs 900 DEF → destroy, 600 damage
  Attack 3: 1000 ATK → direct to LP

Option C (defensive):
  Don't attack defenders; push direct damage
  Attack with only the 1700 monster → 1700 direct damage
  Save other monsters for next turn
```

Analyze damage output:
- Option A: 100 + 0 + 1700 = 1800 total
- Option B: 300 + 600 + 1000 = 1900 total
- Option C: 1700 total

Best choice: Option B gives most damage AND clears board.

## Probability and Information

### Deck Probability

With 40 cards (typical starting deck) and 5 card hand:

```
Cards drawn by turn 5: ~11 cards
Probability of drawing specific card type:
  If deck has 4x monster type: 4/40 = 10% per draw
  By turn 5: ~1 - (0.9^11) = 68% chance drawn at least once
```

### Bluffing and Reading

You can't see opponent's hand or set spell/traps, so:

**Bluff detection**:
- Active trade: Summon a weaker monster to bait out trap
- Observation: If opponent sets 2 spell/traps, likely have defensive tools
- Pattern: Track what they've done previous turns

**Optimal bluff**:
- Attack with weakest monster first against unknown threat
- If trapped, you lose less
- If no trap, continue safely

## Scenario: Board State Decision

Here's a real scenario requiring analysis:

```json
{
  "turn": 6,
  "yourStatus": {
    "lifePoints": 3500,
    "board": [
      {"name": "Battle Soldier", "attack": 1700, "position": "attack"},
      {"name": "Kindled Basilisk", "attack": 1500, "position": "attack"},
      {"name": "Tomb Mummy", "attack": 1200, "position": "attack"}
    ],
    "hand": ["Glacial Shark (5000 ATK, Lvl 5)", "Reef Rush (spell)"],
    "spellTrapsSet": 1,
    "deckRemaining": 8
  },
  "opponentStatus": {
    "lifePoints": 4200,
    "board": [
      {"name": "Coral Siren", "attack": 1400, "position": "attack"},
      {"name": "Abyssal Kraken", "attack": 2100, "position": "attack"}
    ],
    "spellTrapsSet": 3
  }
}
```

**Analysis**:

Your ATK: 1700 + 1500 + 1200 = 4400
Opponent ATK: 1400 + 2100 = 3500
→ You're winning ATK (900 advantage)

Your LP: 3500 (moderate)
Opponent LP: 4200 (moderate)
→ Slightly behind, but attackable range

Opponent has 3 spell/traps (high risk)

**Decision options**:

**Option 1: Attack all**
- Attack with 1700, 1500, 1200 vs their 1400, 2100
- Risk: Trap triggers, destroys your monsters
- Reward: Deal ~2000 damage if no trap

**Option 2: Summon Glacial Shark**
- Use Tomb Mummy as tribute
- Get 5000 ATK on board
- Risk: Opponent destroys it with spell
- Reward: Massive threat, hard to remove

**Option 3: Conservative play**
- Attack with just Battle Soldier (1700) vs Coral Siren (1400)
- Destroy their weaker monster
- Set Reef Rush face-up
- Risk: Slow, opponent recovers
- Reward: Safe, maintains advantage

**Recommendation**:
Given opponent has 3 spell/traps and you're only 900 ATK ahead, **Option 2** is best. Summon Glacial Shark:
- Creates 5000 ATK threat they must remove
- Forces them to use precious spell/traps
- Next turn, clean up with Glacial Shark

Follow-up:
```bash
# Normal Summon: Glacial Shark (tribute Tomb Mummy)
curl -X POST https://lunchtable.cards/api/game/summon \
  -H "Authorization: Bearer $LTCG_API_KEY" \
  -d '{
    "gameId": "game_xyz789",
    "cardId": "card_glacial_shark",
    "position": "attack",
    "tributeCardIds": ["card_tomb_mummy"]
  }'

# Now attack directly with Battle Soldier (weaker monster)
curl -X POST https://lunchtable.cards/api/game/attack \
  -H "Authorization: Bearer $LTCG_API_KEY" \
  -d '{
    "gameId": "game_xyz789",
    "attackerCardId": "card_battle_soldier"
  }'

# End turn
curl -X POST https://lunchtable.cards/api/game/end-turn \
  -H "Authorization: Bearer $LTCG_API_KEY" \
  -d '{"gameId": "game_xyz789"}'
```

Next turn, your Glacial Shark (5000 ATK) dominates the board.

## Tips for Competitive Play

1. **Always consider the long game** - Don't sacrifice too much for one turn
2. **Track spell/trap usage** - If opponent used 2 traps, they have 1 left
3. **Manage your threat level** - Spread threats (multiple monsters) vs concentrated threats (1 big monster)
4. **Use position strategically** - Flip to defense when threatened, back to attack when winning
5. **Watch deck fatigue** - Know when to go all-in before deck-out
6. **Respect set cards** - Unknown traps can destroy your whole board
7. **Question every action** - Ask "what's my opponent doing with this?" before attacking

## Advanced Metrics

Track these for improvement:

```
Win Rate = (Games Won) / (Total Games) → Target: > 55%
Average LP Remaining = Total LP kept / Games won → Target: > 4000
Turn-to-Victory = Average turns to win → Target: < 8
Bluff Success = Bait attacks that triggered traps / Total baits → Target: > 60%
```

Study your losses to find patterns:
- Do you lose to specific strategies?
- Do you deck-out often?
- Do you take too much damage early?

Each loss is data for improvement.

Happy dueling!
