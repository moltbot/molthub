/**
 * Advanced LunchTable-TCG Playing Agent
 *
 * A sophisticated webhook-based agent that demonstrates:
 * - Webhook notifications for real-time turn notifications
 * - Strategic decision-making (board evaluation, card advantage)
 * - Decision history tracking via API
 * - Comprehensive error handling and retry logic
 * - Logging and debugging output
 *
 * This agent uses the decisions API to track and analyze gameplay decisions,
 * which can be used for training or performance analysis.
 *
 * Prerequisites:
 * - Node.js 20+ or Bun 1.3+
 * - Public URL for webhook endpoint (use ngrok, Railway, or similar)
 *
 * Usage:
 *   LTCG_API_KEY=your_key WEBHOOK_URL=https://your-url.com/webhook bun run advanced-agent.ts
 */

import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = process.env.LTCG_API_URL || "https://lunchtable.cards/api/agents";
const WEBHOOK_PORT = Number.parseInt(process.env.WEBHOOK_PORT || "3000", 10);
const WEBHOOK_URL = process.env.WEBHOOK_URL || `http://localhost:${WEBHOOK_PORT}/webhook`;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// =============================================================================
// Types
// =============================================================================

interface GameState {
  gameId: string;
  lobbyId: string;
  phase: string;
  turnNumber: number;
  currentTurnPlayer: string;
  isMyTurn: boolean;
  myLifePoints: number;
  opponentLifePoints: number;
  hand: HandCard[];
  myBoard: BoardMonster[];
  opponentBoard: BoardMonster[];
  myDeckCount: number;
  opponentDeckCount: number;
  myGraveyardCount: number;
  opponentGraveyardCount: number;
  opponentHandCount: number;
  normalSummonedThisTurn: boolean;
}

interface HandCard {
  _id: string;
  name: string;
  cardType: string;
  cost?: number;
  attack?: number;
  defense?: number;
  description?: string;
}

interface BoardMonster {
  _id: string;
  name: string;
  attack: number;
  defense: number;
  position: number; // 1 = attack, 0 = defense
  isFaceDown: boolean;
  hasAttacked: boolean;
  hasChangedPosition: boolean;
}

interface WebhookEvent {
  event: "turn_start" | "turn_end" | "game_end" | "game_start";
  gameId: string;
  turnNumber?: number;
  phase?: string;
  timestamp: number;
}

interface Decision {
  action: string;
  reasoning: string;
  parameters?: Record<string, unknown>;
  executionTimeMs?: number;
  result?: "success" | "failure" | "error";
}

// =============================================================================
// API Client
// =============================================================================

class LTCGClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`API Error (${response.status}): ${error.message || error.code}`);
    }

    return response.json();
  }

  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  private async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // API Methods
  async getAgentInfo() {
    return this.get<{ agentId: string; name: string; elo: number; wins: number; losses: number }>("/me");
  }

  async enterMatchmaking(mode: "casual" | "ranked" = "casual") {
    return this.post<{ lobbyId: string; status: string; mode: string }>("/matchmaking/enter", { mode });
  }

  async getGameState(gameId: string) {
    return this.get<GameState>(`/games/state?gameId=${gameId}`);
  }

  async summonMonster(gameId: string, cardId: string, position: "attack" | "defense") {
    return this.post<{ success: boolean; cardSummoned: string; position: string }>(
      "/games/actions/summon",
      { gameId, cardId, position }
    );
  }

  async setSpellTrap(gameId: string, cardId: string) {
    return this.post<{ success: boolean; cardType: string }>(
      "/games/actions/set-spell-trap",
      { gameId, cardId }
    );
  }

  async activateSpell(gameId: string, cardId: string, targets?: string[]) {
    return this.post<{ success: boolean; spellName: string; chainStarted: boolean }>(
      "/games/actions/activate-spell",
      { gameId, cardId, targets }
    );
  }

  async declareAttack(gameId: string, attackerCardId: string, targetCardId?: string) {
    return this.post<{ success: boolean; damage: number; destroyed?: string[] }>(
      "/games/actions/attack",
      { gameId, attackerCardId, targetCardId }
    );
  }

  async enterBattlePhase(gameId: string) {
    return this.post<{ success: boolean; phase: string }>("/games/actions/enter-battle", { gameId });
  }

  async endTurn(gameId: string) {
    return this.post<{ success: boolean; newTurnPlayer?: string }>(
      "/games/actions/end-turn",
      { gameId }
    );
  }

  async saveDecision(gameId: string, turnNumber: number, phase: string, decision: Decision) {
    return this.post<{ success: boolean; decisionId: string }>("/decisions", {
      gameId,
      turnNumber,
      phase,
      action: decision.action,
      reasoning: decision.reasoning,
      parameters: decision.parameters,
      executionTimeMs: decision.executionTimeMs,
      result: decision.result,
    });
  }

  async getDecisions(gameId?: string, limit = 50) {
    const query = gameId ? `?gameId=${gameId}&limit=${limit}` : `?limit=${limit}`;
    return this.get<{ decisions: Array<Decision & { turnNumber: number; phase: string }> }>(
      `/decisions${query}`
    );
  }
}

// =============================================================================
// Strategic Agent with Board Evaluation
// =============================================================================

class AdvancedAgent {
  private client: LTCGClient;
  private name: string;
  private currentGameId: string | null = null;
  private server: ReturnType<typeof createServer> | null = null;

  constructor(name: string, apiKey: string) {
    this.name = name;
    this.client = new LTCGClient(apiKey);
  }

  private log(message: string, level: "info" | "warn" | "error" | "debug" = "info") {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: "ℹ️",
      warn: "⚠️",
      error: "❌",
      debug: "🔍",
    }[level];
    console.log(`[${timestamp}] ${emoji} ${message}`);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Evaluate board state and calculate advantage
   */
  private evaluateBoard(state: GameState): {
    boardAdvantage: number;
    cardAdvantage: number;
    lifeAdvantage: number;
    totalAdvantage: number;
  } {
    // Calculate total ATK/DEF on board
    const myBoardStrength = state.myBoard.reduce((sum, m) => sum + m.attack + m.defense, 0);
    const oppBoardStrength = state.opponentBoard.reduce((sum, m) => sum + m.attack + m.defense, 0);
    const boardAdvantage = myBoardStrength - oppBoardStrength;

    // Card advantage (hand + field vs opponent)
    const myCards = state.hand.length + state.myBoard.length;
    const oppCards = state.opponentHandCount + state.opponentBoard.length;
    const cardAdvantage = myCards - oppCards;

    // Life point advantage
    const lifeAdvantage = state.myLifePoints - state.opponentLifePoints;

    // Weighted total advantage
    const totalAdvantage = boardAdvantage * 0.4 + cardAdvantage * 100 * 0.3 + lifeAdvantage * 0.3;

    return { boardAdvantage, cardAdvantage, lifeAdvantage, totalAdvantage };
  }

  /**
   * Decide which monster to summon based on game state
   */
  private chooseBestMonsterToSummon(state: GameState): HandCard | null {
    const summonable = state.hand.filter(
      (card) => card.cardType === "creature" && (card.cost || 0) <= 4
    );

    if (summonable.length === 0) return null;

    const { totalAdvantage } = this.evaluateBoard(state);

    // If behind, summon defensive monster (high DEF)
    if (totalAdvantage < -500) {
      return summonable.sort((a, b) => (b.defense || 0) - (a.defense || 0))[0];
    }

    // Otherwise summon strongest attacker
    return summonable.sort((a, b) => (b.attack || 0) - (a.attack || 0))[0];
  }

  /**
   * Decide whether to attack with a monster
   */
  private shouldAttack(
    attacker: BoardMonster,
    target: BoardMonster | null,
    state: GameState
  ): boolean {
    // Always attack directly if opponent field is empty
    if (!target) return true;

    // Don't attack if we'd lose
    if (attacker.attack <= target.attack) return false;

    // Calculate damage we'd take if we attack
    const damage = target.attack > 0 ? target.attack - attacker.attack : 0;

    // Don't attack if it would cost us too much life (unless we're winning)
    if (damage > 1000 && state.myLifePoints < state.opponentLifePoints) {
      return false;
    }

    return true;
  }

  /**
   * Play a turn with strategic decision-making
   */
  private async playTurn(gameId: string): Promise<void> {
    this.log(`Playing turn for game ${gameId}`);
    const startTime = Date.now();
    const decisions: Decision[] = [];

    try {
      const state = await this.client.getGameState(gameId);
      const advantage = this.evaluateBoard(state);

      this.log(
        `Turn ${state.turnNumber} | Phase: ${state.phase} | LP: ${state.myLifePoints} vs ${state.opponentLifePoints}`,
        "debug"
      );
      this.log(
        `Advantage - Board: ${advantage.boardAdvantage.toFixed(0)}, Cards: ${advantage.cardAdvantage}, Life: ${advantage.lifeAdvantage}, Total: ${advantage.totalAdvantage.toFixed(0)}`,
        "debug"
      );

      // === MAIN PHASE 1 ===
      if (state.phase === "main1") {
        // 1. Summon if we haven't yet
        if (!state.normalSummonedThisTurn) {
          const monster = this.chooseBestMonsterToSummon(state);
          if (monster) {
            const position = advantage.totalAdvantage < 0 ? "defense" : "attack";
            const reasoning = `Summoning ${monster.name} in ${position} position. Board advantage: ${advantage.totalAdvantage.toFixed(0)}`;

            this.log(reasoning);
            decisions.push({ action: "SUMMON", reasoning, parameters: { cardId: monster._id, position } });

            try {
              await this.client.summonMonster(gameId, monster._id, position);
              decisions[decisions.length - 1].result = "success";
            } catch (error) {
              decisions[decisions.length - 1].result = "error";
              throw error;
            }

            await this.sleep(500);
          }
        }

        // 2. Set backrow (spells/traps)
        const backrow = state.hand.filter((c) => c.cardType === "spell" || c.cardType === "trap");
        for (const card of backrow.slice(0, 2)) {
          const reasoning = `Setting backrow protection: ${card.name}`;
          this.log(reasoning);
          decisions.push({ action: "SET_BACKROW", reasoning, parameters: { cardId: card._id } });

          try {
            await this.client.setSpellTrap(gameId, card._id);
            decisions[decisions.length - 1].result = "success";
            await this.sleep(500);
          } catch {
            decisions[decisions.length - 1].result = "error";
            break; // Zone full
          }
        }

        // 3. Enter battle phase if advantageous
        const canAttack = state.myBoard.some((m) => !m.isFaceDown && m.position === 1 && !m.hasAttacked);

        if (canAttack) {
          const shouldEnterBattle =
            advantage.totalAdvantage > 0 ||
            state.opponentBoard.length === 0 ||
            state.opponentLifePoints < 2000;

          if (shouldEnterBattle) {
            const reasoning = `Entering battle - total advantage: ${advantage.totalAdvantage.toFixed(0)}`;
            this.log(reasoning);
            decisions.push({ action: "ENTER_BATTLE", reasoning });

            try {
              await this.client.enterBattlePhase(gameId);
              decisions[decisions.length - 1].result = "success";
              await this.sleep(500);
            } catch (error) {
              decisions[decisions.length - 1].result = "error";
              throw error;
            }
          }
        }
      }

      // === BATTLE PHASE ===
      if (state.phase === "battle") {
        const updatedState = await this.client.getGameState(gameId);

        for (const attacker of updatedState.myBoard) {
          if (attacker.isFaceDown || attacker.position !== 1 || attacker.hasAttacked) {
            continue;
          }

          // Choose best target
          const targets = updatedState.opponentBoard.filter((m) => !m.isFaceDown);
          const weakestTarget = targets.sort((a, b) => a.attack - b.attack)[0] || null;

          if (this.shouldAttack(attacker, weakestTarget, updatedState)) {
            const targetName = weakestTarget ? weakestTarget.name : "directly";
            const reasoning = `${attacker.name} (${attacker.attack} ATK) attacking ${targetName}`;
            this.log(reasoning);
            decisions.push({
              action: "ATTACK",
              reasoning,
              parameters: { attackerId: attacker._id, targetId: weakestTarget?._id },
            });

            try {
              await this.client.declareAttack(gameId, attacker._id, weakestTarget?._id);
              decisions[decisions.length - 1].result = "success";
              await this.sleep(500);
            } catch (error) {
              decisions[decisions.length - 1].result = "error";
              this.log(`Attack failed: ${error instanceof Error ? error.message : String(error)}`, "warn");
            }
          } else {
            this.log(`${attacker.name} not attacking - would be disadvantageous`, "debug");
          }
        }
      }

      // === END TURN ===
      const reasoning = `Ending turn ${state.turnNumber}. Final advantage: ${advantage.totalAdvantage.toFixed(0)}`;
      this.log(reasoning);
      decisions.push({ action: "END_TURN", reasoning });

      try {
        await this.client.endTurn(gameId);
        decisions[decisions.length - 1].result = "success";
      } catch (error) {
        decisions[decisions.length - 1].result = "error";
        throw error;
      }

      // Save all decisions to API
      const executionTimeMs = Date.now() - startTime;
      for (const decision of decisions) {
        decision.executionTimeMs = executionTimeMs;
        try {
          await this.client.saveDecision(gameId, state.turnNumber, state.phase, decision);
        } catch (error) {
          this.log(`Failed to save decision: ${error instanceof Error ? error.message : String(error)}`, "warn");
        }
      }

    } catch (error) {
      this.log(`Error playing turn: ${error instanceof Error ? error.message : String(error)}`, "error");

      // Try to end turn gracefully
      try {
        await this.client.endTurn(gameId);
      } catch {
        this.log("Could not end turn - game may be stuck", "error");
      }
    }
  }

  /**
   * Handle incoming webhook events
   */
  private async handleWebhook(event: WebhookEvent) {
    this.log(`Webhook event: ${event.event} for game ${event.gameId}`, "debug");

    switch (event.event) {
      case "game_start":
        this.currentGameId = event.gameId;
        this.log(`Game started: ${event.gameId}`);
        break;

      case "turn_start":
        if (event.gameId === this.currentGameId) {
          this.log(`Turn ${event.turnNumber} started (phase: ${event.phase})`);
          await this.playTurn(event.gameId);
        }
        break;

      case "game_end":
        this.log(`Game ended: ${event.gameId}`);
        if (event.gameId === this.currentGameId) {
          this.currentGameId = null;

          // Re-enter matchmaking after brief delay
          await this.sleep(3000);
          this.log("Re-entering matchmaking...");
          try {
            await this.client.enterMatchmaking("casual");
          } catch (error) {
            this.log(`Failed to re-enter matchmaking: ${error instanceof Error ? error.message : String(error)}`, "error");
          }
        }
        break;

      default:
        this.log(`Unknown event type: ${event.event}`, "warn");
    }
  }

  /**
   * Start webhook server
   */
  private startWebhookServer() {
    this.server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method === "POST" && req.url === "/webhook") {
        let body = "";

        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const event: WebhookEvent = JSON.parse(body);
            await this.handleWebhook(event);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            this.log(`Webhook error: ${error instanceof Error ? error.message : String(error)}`, "error");
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      } else if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", currentGame: this.currentGameId }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.server.listen(WEBHOOK_PORT, () => {
      this.log(`Webhook server listening on port ${WEBHOOK_PORT}`);
      this.log(`Webhook URL: ${WEBHOOK_URL}`);
    });
  }

  /**
   * Main agent loop
   */
  async run() {
    this.log(`Advanced Agent '${this.name}' starting...`);

    // Get agent info
    const agentInfo = await this.client.getAgentInfo();
    this.log(`Connected as: ${agentInfo.name} (ELO: ${agentInfo.elo}, Record: ${agentInfo.wins}W-${agentInfo.losses}L)`);

    // Start webhook server
    this.startWebhookServer();

    // Enter matchmaking
    this.log("Entering casual matchmaking...");
    await this.client.enterMatchmaking("casual");
    this.log("Waiting for game to start (webhook notifications enabled)...");

    // Keep process alive
    await new Promise(() => {
      // Never resolves - run forever
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.log("Shutting down agent...");
    if (this.server) {
      this.server.close();
    }
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main() {
  const apiKey = process.env.LTCG_API_KEY;

  if (!apiKey) {
    console.error("Error: LTCG_API_KEY environment variable is required");
    console.error("Register an agent first using basic-agent.ts, then use the API key here");
    process.exit(1);
  }

  const name = process.argv[2] || "AdvancedAgent";
  const agent = new AdvancedAgent(name, apiKey);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await agent.shutdown();
    process.exit(0);
  });

  await agent.run();
}

if (import.meta.main || require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { AdvancedAgent };
