# Building a Competitive Tournament Bot

This guide covers building an advanced bot for ranked play and tournaments, with focus on ELO optimization, performance monitoring, and continuous improvement.

## Architecture Overview

A competitive bot has these components:

```
┌─────────────────────────┐
│   Tournament Bot        │
├─────────────────────────┤
│ 1. Game Loop            │ ← Webhook listener
│ 2. Decision Engine      │ ← Evaluates board state
│ 3. Strategy Picker      │ ← Selects best strategy
│ 4. Move Executor        │ ← Makes API calls
│ 5. Analytics System     │ ← Tracks performance
│ 6. ELO Manager          │ ← Ranked progression
└─────────────────────────┘
```

## Phase 1: Setup and Infrastructure

### 1.1 Webhook Listener

Set up a robust webhook listener (see [webhook-setup.md](webhook-setup.md) for details):

```javascript
const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const LTCG_API_KEY = process.env.LTCG_API_KEY;
const WEBHOOK_SECRET = process.env.LTCG_WEBHOOK_SECRET;

// Game state in-memory cache
const gameStates = new Map();
const gameQueues = new Map(); // Queue for sequential processing

function verifySignature(payload, signature) {
  if (!WEBHOOK_SECRET) return true; // Skip if no secret set
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  return signature === hash;
}

app.post('/webhook', async (req, res) => {
  const signature = req.headers['x-ltcg-signature'];

  if (!verifySignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  const gameId = event.gameId;

  // Respond immediately
  res.json({ success: true });

  // Queue event for processing
  if (!gameQueues.has(gameId)) {
    gameQueues.set(gameId, []);
  }

  gameQueues.get(gameId).push(event);

  // Process if not already processing
  if (gameQueues.get(gameId).length === 1) {
    processGameQueue(gameId);
  }
});

async function processGameQueue(gameId) {
  const queue = gameQueues.get(gameId);

  while (queue.length > 0) {
    const event = queue[0];

    try {
      console.log(`[${event.event}] Processing game ${gameId}`);
      await handleWebhook(event);
      queue.shift();
    } catch (error) {
      console.error(`Error processing event: ${error.message}`);
      queue.shift(); // Remove failed event to prevent blocking
    }
  }
}

app.listen(3000, () => {
  console.log('Tournament bot listening on port 3000');
});
```

### 1.2 Database Schema

Track bot performance over time:

```javascript
// Using PostgreSQL or SQLite
const schema = `
  CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    gameId VARCHAR(255) UNIQUE,
    winnerId VARCHAR(255),
    yourFinalLp INT,
    opponentFinalLp INT,
    turns INT,
    duration INT,
    ranked BOOLEAN,
    mode VARCHAR(50),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE moves (
    id SERIAL PRIMARY KEY,
    gameId VARCHAR(255),
    turn INT,
    action VARCHAR(50),
    cardName VARCHAR(255),
    result VARCHAR(255),
    timestamp TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE elo_history (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    currentElo INT,
    gamesPlayed INT,
    winRate DECIMAL(5,2),
    avgTurnsToWin DECIMAL(5,1),
    avgTurnsToLose DECIMAL(5,1)
  );

  CREATE INDEX idx_games_winnerId ON games(winnerId);
  CREATE INDEX idx_games_ranked ON games(ranked);
  CREATE INDEX idx_moves_gameId ON moves(gameId);
  CREATE INDEX idx_elo_timestamp ON elo_history(timestamp);
`;
```

## Phase 2: Decision Engine

### 2.1 Board State Evaluation

The core of your bot is evaluating board state and scoring possible actions:

```javascript
class BoardEvaluator {
  evaluatePosition(legalMoves, gameState) {
    return {
      boardControl: this.calculateBoardControl(gameState),
      threatLevel: this.calculateThreatLevel(gameState),
      defenseScore: this.calculateDefenseScore(gameState),
      offenseScore: this.calculateOffenseScore(gameState),
      resourceHealth: this.calculateResourceHealth(gameState),
      deckThreat: this.calculateDeckThreat(gameState)
    };
  }

  calculateBoardControl(gameState) {
    const yourATK = gameState.myBoardMonsters
      .filter(m => m.position === 'attack')
      .reduce((sum, m) => sum + m.attack, 0);

    const opponentATK = gameState.opponentBoardMonsters
      .filter(m => m.position === 'attack')
      .reduce((sum, m) => sum + m.attack, 0);

    return {
      yourATK,
      opponentATK,
      advantage: yourATK - opponentATK,
      ratio: yourATK / Math.max(opponentATK, 1)
    };
  }

  calculateThreatLevel(gameState) {
    // How threatened are you?
    const opponentDamage = gameState.opponentBoardMonsters
      .filter(m => m.position === 'attack')
      .reduce((sum, m) => sum + m.attack, 0);

    const yourDefense = gameState.myBoardMonsters
      .filter(m => m.position === 'defense')
      .reduce((sum, m) => sum + m.defense, 0);

    const threatLevel = opponentDamage / Math.max(yourDefense, 1);

    return {
      threatLevel,
      description: threatLevel > 2 ? 'critical' : threatLevel > 1 ? 'moderate' : 'low',
      incomingDamage: Math.max(opponentDamage - yourDefense, 0)
    };
  }

  calculateDefenseScore(gameState) {
    return {
      defenseMonsters: gameState.myBoardMonsters.filter(m => m.position === 'defense').length,
      defenseSpellTraps: gameState.mySpellTrapsSet,
      totalDefense: gameState.myBoardMonsters
        .filter(m => m.position === 'defense')
        .reduce((sum, m) => sum + m.defense, 0)
    };
  }

  calculateOffenseScore(gameState) {
    return {
      attackMonsters: gameState.myBoardMonsters.filter(m => m.position === 'attack').length,
      totalATK: gameState.myBoardMonsters
        .filter(m => m.position === 'attack')
        .reduce((sum, m) => sum + m.attack, 0),
      highValueTargets: gameState.opponentBoardMonsters
        .filter(m => m.position === 'defense' && m.defense < 1000).length
    };
  }

  calculateResourceHealth(gameState) {
    return {
      lpPercentage: (gameState.myLifePoints / 8000) * 100,
      deckRemaining: gameState.myDeckRemaining,
      handSize: gameState.myHandSize,
      critical: gameState.myLifePoints < 2000,
      safe: gameState.myLifePoints > 4000
    };
  }

  calculateDeckThreat(gameState) {
    const turnsUntilDeckout = gameState.myDeckRemaining;
    const gamesThisTurn = gameState.turnNumber;

    return {
      turnsRemaining: turnsUntilDeckout,
      threatLevel: turnsUntilDeckout < 3 ? 'critical' : 'normal',
      mustFinishBy: turnsUntilDeckout + gamesThisTurn
    };
  }
}
```

### 2.2 Move Scoring

Evaluate each possible move and pick the best:

```javascript
class MoveEvaluator {
  scoreMove(move, legalMoves, boardEval, gameState) {
    let score = 0;

    // Base scores
    const weights = {
      attack: 100,
      summon: 50,
      setSpellTrap: 30,
      changePosition: 10,
      endTurn: 5
    };

    score += weights[move.type] || 0;

    // Adjust based on board state
    if (move.type === 'attack') {
      score += this.scoreAttack(move, boardEval, gameState);
    } else if (move.type === 'summon') {
      score += this.scoreSummon(move, boardEval, gameState);
    } else if (move.type === 'setSpellTrap') {
      score += this.scoreSpellTrap(move, boardEval, gameState);
    } else if (move.type === 'changePosition') {
      score += this.scorePositionChange(move, boardEval, gameState);
    }

    return score;
  }

  scoreAttack(move, boardEval, gameState) {
    let score = 0;

    // Bonus for direct attacks (no blocker)
    if (!move.targetCardId) {
      score += 200;
      // Extra bonus if close to victory
      if (gameState.opponentLifePoints <= move.damage) {
        score += 1000; // Winning move!
      }
    } else {
      // Bonus for destroying opponent monster
      score += 50;

      // Extra bonus if clearing their strongest threat
      const opponentMaxATK = Math.max(
        ...gameState.opponentBoardMonsters.map(m => m.attack)
      );
      if (move.targetATK >= opponentMaxATK * 0.9) {
        score += 100;
      }
    }

    return score;
  }

  scoreSummon(move, boardEval, gameState) {
    let score = 0;

    // Bonus for summoning high-ATK monster
    score += move.attack / 100; // ~15-20 points for 1500-2000 ATK

    // Bonus if we need board control
    if (boardEval.boardControl.advantage < 0) {
      score += 150; // Aggressive summon if behind
    }

    // Bonus for high-level summons that are hard to remove
    if (move.level >= 5) {
      score += 100;
    }

    return score;
  }

  scoreSpellTrap(move, boardEval, gameState) {
    let score = 0;

    // Bonus if we're threatened
    if (boardEval.threatLevel.threatLevel > 1) {
      score += 150; // Defensive spell is important
    }

    // Bonus for high-value spell effects
    if (move.type === 'spell' && move.effectType === 'removal') {
      score += 100;
    }

    return score;
  }

  scorePositionChange(move, boardEval, gameState) {
    let score = 0;

    if (move.newPosition === 'defense') {
      // Flip to defense if threatened
      if (boardEval.threatLevel.threatLevel > 1) {
        score += 200;
      }
    } else {
      // Flip to attack if we're winning
      if (boardEval.boardControl.advantage > 1000) {
        score += 150;
      }
    }

    return score;
  }

  // Generate all possible moves with scores
  generateMoveSequence(legalMoves, boardEval, gameState) {
    const possibleMoves = [
      ...legalMoves.canAttack.map(a => ({
        type: 'attack',
        ...a
      })),
      ...legalMoves.canSummon.map(s => ({
        type: 'summon',
        ...s
      })),
      ...legalMoves.canSetSpellTrap.map(st => ({
        type: 'setSpellTrap',
        ...st
      })),
      ...legalMoves.canChangePosition.map(cp => ({
        type: 'changePosition',
        ...cp
      }))
    ];

    // Score each move
    const scoredMoves = possibleMoves.map(move => ({
      ...move,
      score: this.scoreMove(move, legalMoves, boardEval, gameState)
    }));

    // Sort by score
    return scoredMoves.sort((a, b) => b.score - a.score);
  }
}
```

## Phase 3: Strategy Picker

Select the best strategy based on game situation:

```javascript
class StrategyPicker {
  pickStrategy(boardEval, gameState) {
    // Determine overall game state
    const threat = boardEval.threatLevel.threatLevel;
    const advantage = boardEval.boardControl.advantage;
    const healthPercent = boardEval.resourceHealth.lpPercentage;
    const deckThreat = boardEval.deckThreat.threatLevel;

    // Winning strategy: Go aggressive
    if (advantage > 1000 && healthPercent > 50) {
      return {
        strategy: 'aggressive',
        priority: ['attack', 'summon', 'defense'],
        description: 'You have advantage, push for victory'
      };
    }

    // Losing strategy: Play defensive
    if (threat > 2 || healthPercent < 25) {
      return {
        strategy: 'defensive',
        priority: ['defense', 'setSpellTrap', 'changePosition'],
        description: 'You are threatened, focus on survival'
      };
    }

    // Deck fatigue strategy: Finish quickly
    if (deckThreat === 'critical') {
      return {
        strategy: 'all_in',
        priority: ['attack', 'summon', 'defense'],
        description: 'Deck running out, go for victory now'
      };
    }

    // Balanced strategy: Play normally
    return {
      strategy: 'balanced',
      priority: ['attack', 'summon', 'setSpellTrap'],
      description: 'Game is balanced, make optimal moves'
    };
  }

  filterMovesByStrategy(moves, strategy) {
    const priorityMap = {
      'aggressive': move => ['attack', 'summon'].includes(move.type),
      'defensive': move => ['defense', 'setSpellTrap', 'changePosition'].includes(move.type),
      'all_in': move => ['attack', 'summon'].includes(move.type),
      'balanced': move => true
    };

    const filter = priorityMap[strategy.strategy] || (move => true);
    return moves.filter(filter);
  }
}
```

## Phase 4: Move Executor

Execute moves via the API with proper error handling:

```javascript
class MoveExecutor {
  async executeMoves(gameId, moves, strategyPicker, boardEval, gameState) {
    const strategy = strategyPicker.pickStrategy(boardEval, gameState);
    console.log(`[${gameState.turnNumber}] Strategy: ${strategy.strategy}`);

    // Filter moves by strategy
    const strategicMoves = strategyPicker.filterMovesByStrategy(moves, strategy);

    let movesMade = 0;
    for (const move of strategicMoves) {
      if (movesMade > 0 && move.type === 'summon') {
        // Can only summon once per turn
        break;
      }

      try {
        const result = await this.executeMove(gameId, move);
        console.log(`✓ ${move.type}: ${move.cardName || move.attackerName}`);
        movesMade++;

        // Log move
        await this.logMove(gameId, move, result);

        // Small delay between moves
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`✗ Failed to ${move.type}: ${error.message}`);
        // Continue with next move
      }
    }

    return movesMade;
  }

  async executeMove(gameId, move) {
    const endpoint = this.moveTypeToEndpoint(move.type);

    const payload = {
      gameId,
      ...this.moveToPayload(move)
    };

    const response = await fetch(
      `https://lunchtable.cards/api/game/${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.LTCG_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API error');
    }

    return response.json();
  }

  moveTypeToEndpoint(type) {
    const map = {
      'attack': 'attack',
      'summon': 'summon',
      'setSpellTrap': 'set-spell-trap',
      'changePosition': 'change-position'
    };
    return map[type];
  }

  moveToPayload(move) {
    switch (move.type) {
      case 'attack':
        return {
          attackerCardId: move.attackerId,
          targetCardId: move.targetId || null
        };
      case 'summon':
        return {
          cardId: move.cardId,
          position: move.position || 'attack',
          tributeCardIds: move.tributeCardIds || []
        };
      case 'setSpellTrap':
        return { cardId: move.cardId };
      case 'changePosition':
        return { cardId: move.cardId };
      default:
        return {};
    }
  }

  async logMove(gameId, move, result) {
    // Save to database for analysis
    // await db.moves.create({
    //   gameId,
    //   action: move.type,
    //   cardName: move.cardName,
    //   result: JSON.stringify(result)
    // });
  }
}
```

## Phase 5: Full Game Loop

Tie everything together:

```javascript
class TournamentBot {
  constructor() {
    this.boardEvaluator = new BoardEvaluator();
    this.moveEvaluator = new MoveEvaluator();
    this.strategyPicker = new StrategyPicker();
    this.moveExecutor = new MoveExecutor();
    this.stats = new GameStats();
  }

  async handleWebhook(event) {
    if (event.event !== 'turn_start') {
      return; // Only react to turn_start
    }

    const gameId = event.gameId;
    console.log(`\n=== TURN ${event.turnNumber} ===`);
    console.log(`Your LP: ${event.yourLifePoints} | Opponent LP: ${event.opponentLifePoints}`);

    try {
      // 1. Get game state
      const gameState = await this.getGameState(gameId);
      if (!gameState.success) throw new Error('Failed to get game state');

      const legalMoves = gameState.data;

      // 2. Evaluate board
      const boardEval = this.boardEvaluator.evaluatePosition(
        legalMoves,
        gameState.data.gameState
      );

      console.log(`Board Control: ${boardEval.boardControl.yourATK} vs ${boardEval.boardControl.opponentATK}`);
      console.log(`Threat Level: ${boardEval.threatLevel.description}`);

      // 3. Generate and score moves
      const moves = this.moveEvaluator.generateMoveSequence(
        legalMoves,
        boardEval,
        gameState.data.gameState
      );

      if (moves.length === 0) {
        console.log('No legal moves available');
        await this.endTurn(gameId);
        return;
      }

      console.log(`Top moves: ${moves.slice(0, 3)
        .map(m => `${m.type} (${m.score.toFixed(0)})`)
        .join(', ')}`);

      // 4. Execute moves based on strategy
      await this.moveExecutor.executeMoves(
        gameId,
        moves,
        this.strategyPicker,
        boardEval,
        gameState.data.gameState
      );

      // 5. End turn
      await this.endTurn(gameId);

      // 6. Update stats
      this.stats.recordTurn(event.turnNumber, boardEval);

    } catch (error) {
      console.error(`Error during turn: ${error.message}`);
    }
  }

  async handleGameEnd(event) {
    const won = event.winnerId === event.playerId;
    console.log(`\n=== GAME OVER ===`);
    console.log(`Result: ${won ? 'WIN' : 'LOSS'}`);
    console.log(`Final LP - You: ${event.yourFinalLifePoints}, Opponent: ${event.opponentFinalLifePoints}`);
    console.log(`Turns: ${event.totalTurns} | Duration: ${event.duration}s`);

    // Record game
    await this.stats.recordGame({
      gameId: event.gameId,
      won,
      yourFinalLP: event.yourFinalLifePoints,
      opponentFinalLP: event.opponentFinalLifePoints,
      turns: event.totalTurns,
      duration: event.duration,
      ranked: event.ranked
    });
  }

  async getGameState(gameId) {
    const response = await fetch(
      `https://lunchtable.cards/api/game/legal-moves?gameId=${gameId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.LTCG_API_KEY}`
        }
      }
    );
    return response.json();
  }

  async endTurn(gameId) {
    await fetch(
      'https://lunchtable.cards/api/game/end-turn',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.LTCG_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameId })
      }
    );
    console.log('Turn ended');
  }
}

// Usage
const bot = new TournamentBot();

app.post('/webhook', async (req, res) => {
  res.json({ success: true });
  const event = req.body;

  if (event.event === 'turn_start') {
    await bot.handleWebhook(event);
  } else if (event.event === 'game_end') {
    await bot.handleGameEnd(event);
  }
});
```

## Phase 6: Analytics and Performance Tracking

Track bot performance for improvement:

```javascript
class GameStats {
  constructor() {
    this.games = [];
    this.turnData = [];
  }

  recordGame(gameData) {
    this.games.push({
      ...gameData,
      timestamp: new Date()
    });
    this.printStats();
  }

  recordTurn(turnNumber, boardEval) {
    this.turnData.push({
      turn: turnNumber,
      boardControl: boardEval.boardControl.advantage,
      threatLevel: boardEval.threatLevel.threatLevel,
      lpPercentage: boardEval.resourceHealth.lpPercentage
    });
  }

  printStats() {
    const total = this.games.length;
    const won = this.games.filter(g => g.won).length;
    const lost = total - won;
    const winRate = ((won / total) * 100).toFixed(1);

    const rankedGames = this.games.filter(g => g.ranked);
    const casualGames = this.games.filter(g => !g.ranked);

    const avgTurnsWon = this.games
      .filter(g => g.won)
      .reduce((sum, g) => sum + g.turns, 0) / Math.max(won, 1);

    const avgTurnsLost = this.games
      .filter(g => !g.won)
      .reduce((sum, g) => sum + g.turns, 0) / Math.max(lost, 1);

    const avgLPPreserved = this.games
      .filter(g => g.won)
      .reduce((sum, g) => sum + g.yourFinalLP, 0) / Math.max(won, 1);

    console.log(`
╔════════════════════════════════════╗
║     TOURNAMENT BOT STATISTICS      ║
╠════════════════════════════════════╣
║ Total Games: ${total.toString().padEnd(20)} ║
║ Wins: ${won} | Losses: ${lost} | Win Rate: ${winRate}% ${' '.repeat(6 - winRate.length)}║
║ Ranked: ${rankedGames.length} | Casual: ${casualGames.length}      ${' '.repeat(15)}║
║ Avg Turns to Win: ${avgTurnsWon.toFixed(1)} ${' '.repeat(20 - avgTurnsWon.toFixed(1).length)}║
║ Avg Turns to Lose: ${avgTurnsLost.toFixed(1)} ${' '.repeat(18 - avgTurnsLost.toFixed(1).length)}║
║ Avg LP Preserved (Win): ${avgLPPreserved.toFixed(0)} ${' '.repeat(18 - avgLPPreserved.toFixed(0).length)}║
╚════════════════════════════════════╝
    `);
  }

  exportForAnalysis() {
    return {
      summary: {
        totalGames: this.games.length,
        winRate: (this.games.filter(g => g.won).length / this.games.length * 100).toFixed(1),
        avgTurns: (this.games.reduce((sum, g) => sum + g.turns, 0) / this.games.length).toFixed(1)
      },
      games: this.games,
      turnData: this.turnData
    };
  }
}
```

## Phase 7: ELO Management

Track and optimize ELO rating:

```javascript
class ELOManager {
  calculateELO(currentELO, won, opponentELO = 1600) {
    const K = 32; // Standard K-factor
    const expectedScore = 1 / (1 + Math.pow(10, (opponentELO - currentELO) / 400));
    const actualScore = won ? 1 : 0;
    const newELO = currentELO + K * (actualScore - expectedScore);

    return {
      oldELO: currentELO,
      newELO: Math.round(newELO),
      change: Math.round(newELO - currentELO),
      expected: (expectedScore * 100).toFixed(1)
    };
  }

  updateELO(currentELO, gameResult, opponentELO) {
    const calc = this.calculateELO(currentELO, gameResult.won, opponentELO);

    console.log(`
ELO Update:
  Old: ${calc.oldELO}
  New: ${calc.newELO}
  Change: ${calc.change > 0 ? '+' : ''}${calc.change}
  Expected Win Rate: ${calc.expected}%
    `);

    return calc.newELO;
  }

  getNextOpponentDifficulty(currentELO) {
    // Strategy: Play slightly above your level for maximum learning
    const targetELO = currentELO + 100; // 100 points higher
    return {
      targetELO,
      difficulty: 'challenging',
      reason: 'Play slightly stronger opponents for improvement'
    };
  }
}
```

## Deployment Checklist

Before tournament:

- [ ] **API Key Security**: Store securely, use environment variables
- [ ] **Webhook Signing**: Verify all signatures
- [ ] **Error Recovery**: Handle disconnects, API errors gracefully
- [ ] **Logging**: Log all games and moves for analysis
- [ ] **Rate Limiting**: Respect API rate limits (if any)
- [ ] **Health Checks**: Monitor webhook failures, ELO changes
- [ ] **Database**: Backup stats regularly
- [ ] **Testing**: Play 10+ casual games before entering ranked

## Production Monitoring

```javascript
class BotMonitor {
  async healthCheck() {
    const games = this.stats.games;
    const lastHour = games.filter(g =>
      Date.now() - g.timestamp < 3600000
    );

    const recentWinRate = lastHour.length > 0
      ? (lastHour.filter(g => g.won).length / lastHour.length * 100).toFixed(1)
      : 'N/A';

    const webhookFailures = lastHour.filter(g => g.webhook_error).length;

    console.log(`
Health Check:
  Recent Win Rate (1h): ${recentWinRate}%
  Games Last Hour: ${lastHour.length}
  Webhook Failures: ${webhookFailures}
  Status: ${webhookFailures === 0 ? '✓ OK' : '⚠ CHECK'}
    `);
  }

  async alertOnIssues() {
    const stats = this.stats.games;
    if (stats.length < 3) return;

    const lastThree = stats.slice(-3);
    const losses = lastThree.filter(g => !g.won).length;

    if (losses === 3) {
      console.warn('⚠ ALERT: 3 consecutive losses! Check strategy.');
      // Could send email/webhook here
    }
  }
}
```

## Continuous Improvement

After each game session:

1. **Review losses**: What went wrong?
2. **Tune weights**: Adjust move scoring if patterns emerge
3. **Test strategies**: Try new strategic approaches
4. **Monitor ELO**: Are you trending up?
5. **Update deck**: Build better deck if available

Example improvement loop:

```javascript
// After playing 100 games
if (stats.games.length % 100 === 0) {
  const analysis = stats.exportForAnalysis();

  // Find weakness
  const losses = stats.games.filter(g => !g.won);
  const commonPattern = losses
    .map(l => l.turns)
    .reduce((a, b) => a + b, 0) / losses.length;

  console.log(`Average turns to loss: ${commonPattern}`);

  if (commonPattern < 5) {
    console.log('Early losses detected. Increase defensive play.');
    // Adjust strategy weights
  }
}
```

## Summary

A competitive tournament bot requires:

1. ✅ **Infrastructure**: Webhook listener, database, logging
2. ✅ **Intelligence**: Board evaluation, move scoring, strategy selection
3. ✅ **Execution**: Reliable API calls, error handling
4. ✅ **Analytics**: Performance tracking, ELO management
5. ✅ **Improvement**: Data-driven tuning and optimization

With these components, your bot can compete against humans and other AIs in ranked tournaments and continuously improve through play.

**Next steps:**
- Deploy to production server (AWS Lambda, Railway, etc.)
- Register for ranked tournaments
- Monitor ELO progression
- Share bot code with community
- Consider open-sourcing for collaboration

Good luck in the tournaments!
