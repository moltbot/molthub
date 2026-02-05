/**
 * Basic LunchTable-TCG Playing Agent
 *
 * A simple polling-based agent that demonstrates how to:
 * - Register and authenticate with the LTCG API
 * - Join matchmaking
 * - Play a complete game with basic strategy
 * - Handle errors gracefully
 *
 * This is an educational reference implementation showing core API usage.
 *
 * Prerequisites:
 * - Node.js 20+ or Bun 1.3+
 * - Internet connection to reach LTCG API
 *
 * Usage:
 *   bun run basic-agent.ts
 *   # or
 *   npx tsx basic-agent.ts
 */

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL = process.env.LTCG_API_URL || "https://lunchtable.cards/api/agents";
const POLL_INTERVAL_MS = 2000; // Check for turn every 2 seconds
const MAX_RETRIES = 3;

// =============================================================================
// Types
// =============================================================================

interface AgentConfig {
  name: string;
  apiKey?: string; // If already registered, provide existing API key
}

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

interface AvailableAction {
  action: string;
  description: string;
  availableCards?: string[];
  availableMonsters?: number;
  attackableMonsters?: number;
  chainLink?: number;
}

interface PendingTurn {
  gameId: string;
  lobbyId: string;
  currentPhase: string;
  turnNumber: number;
  opponent: { username: string };
  timeRemaining: number | null;
  timeoutWarning: boolean;
  matchTimeRemaining: number | null;
}

// =============================================================================
// API Client
// =============================================================================

class LTCGClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make authenticated API request
   */
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

  /**
   * GET request helper
   */
  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  /**
   * POST request helper
   */
  private async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // -------------------------------------------------------------------------
  // Agent API
  // -------------------------------------------------------------------------

  async getAgentInfo() {
    return this.get<{ agentId: string; name: string; elo: number; wins: number; losses: number }>("/me");
  }

  // -------------------------------------------------------------------------
  // Matchmaking API
  // -------------------------------------------------------------------------

  async enterMatchmaking(mode: "casual" | "ranked" = "casual") {
    return this.post<{ lobbyId: string; status: string; mode: string }>("/matchmaking/enter", { mode });
  }

  async listLobbies(mode: "casual" | "ranked" | "all" = "all") {
    return this.get<{ lobbies: Array<{ lobbyId: string; mode: string; hostUsername: string }> }>(
      `/matchmaking/lobbies?mode=${mode}`
    );
  }

  async joinLobby(lobbyId: string) {
    return this.post<{ gameId: string; lobbyId: string; opponentUsername: string; mode: string }>(
      "/matchmaking/join",
      { lobbyId }
    );
  }

  async cancelMatchmaking() {
    return this.post<{ success: boolean }>("/matchmaking/cancel");
  }

  // -------------------------------------------------------------------------
  // Game State API
  // -------------------------------------------------------------------------

  async getPendingTurns() {
    return this.get<PendingTurn[]>("/pending-turns");
  }

  async getGameState(gameId: string) {
    return this.get<GameState>(`/games/state?gameId=${gameId}`);
  }

  async getAvailableActions(gameId: string) {
    return this.get<{ actions: AvailableAction[]; phase: string; turnNumber: number }>(
      `/games/available-actions?gameId=${gameId}`
    );
  }

  // -------------------------------------------------------------------------
  // Game Actions API
  // -------------------------------------------------------------------------

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

  async surrender(gameId: string) {
    return this.post<{ success: boolean; gameEnded: boolean }>(
      "/games/actions/surrender",
      { gameId }
    );
  }
}

// =============================================================================
// Agent Strategy
// =============================================================================

class BasicAgent {
  private client: LTCGClient;
  private name: string;
  private currentGameId: string | null = null;

  constructor(name: string, apiKey: string) {
    this.name = name;
    this.client = new LTCGClient(apiKey);
  }

  /**
   * Log message with timestamp
   */
  private log(message: string, level: "info" | "warn" | "error" = "info") {
    const timestamp = new Date().toISOString();
    const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "ℹ️";
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  /**
   * Make a strategic decision for the current turn
   */
  private async playTurn(gameId: string): Promise<void> {
    this.log(`Playing turn for game ${gameId}`);

    try {
      // Get current game state and available actions
      const [state, { actions }] = await Promise.all([
        this.client.getGameState(gameId),
        this.client.getAvailableActions(gameId),
      ]);

      this.log(`Turn ${state.turnNumber}, Phase: ${state.phase}, LP: ${state.myLifePoints} vs ${state.opponentLifePoints}`);
      this.log(`Hand: ${state.hand.length} cards, Board: ${state.myBoard.length} monsters`);

      // Basic strategy: Summon → Set Backrow → Attack → End Turn

      // 1. Try to summon strongest monster if we haven't summoned yet
      if (!state.normalSummonedThisTurn && state.phase === "main1") {
        const summonableMonsters = state.hand.filter(
          (card) => card.cardType === "creature" && (card.cost || 0) <= 4
        );

        if (summonableMonsters.length > 0) {
          // Summon strongest monster in attack position
          const strongest = summonableMonsters.sort((a, b) => (b.attack || 0) - (a.attack || 0))[0];
          this.log(`Summoning ${strongest.name} (ATK: ${strongest.attack})`);

          await this.client.summonMonster(gameId, strongest._id, "attack");
          await this.sleep(500); // Brief pause for game state update
        }
      }

      // 2. Set spell/trap cards if we have room
      if (state.phase === "main1" || state.phase === "main2") {
        const spellsTraps = state.hand.filter(
          (card) => card.cardType === "spell" || card.cardType === "trap"
        );

        for (const card of spellsTraps.slice(0, 2)) {
          // Set up to 2 backrow cards
          try {
            this.log(`Setting ${card.cardType}: ${card.name}`);
            await this.client.setSpellTrap(gameId, card._id);
            await this.sleep(500);
          } catch (error) {
            // Zone might be full, continue
            break;
          }
        }
      }

      // 3. Enter battle phase if we have monsters that can attack
      if (state.phase === "main1") {
        const canAttack = state.myBoard.some(
          (m) => !m.isFaceDown && m.position === 1 && !m.hasAttacked
        );

        if (canAttack) {
          this.log("Entering Battle Phase");
          await this.client.enterBattlePhase(gameId);
          await this.sleep(500);

          // Refresh state after phase change
          const updatedState = await this.client.getGameState(gameId);

          // 4. Attack with all available monsters
          for (const monster of updatedState.myBoard) {
            if (monster.isFaceDown || monster.position !== 1 || monster.hasAttacked) {
              continue;
            }

            // Simple strategy: Attack strongest opponent monster, or direct if field is empty
            if (updatedState.opponentBoard.length > 0) {
              const target = updatedState.opponentBoard
                .filter((m) => !m.isFaceDown)
                .sort((a, b) => b.attack - a.attack)[0];

              if (target && monster.attack > target.attack) {
                this.log(`${monster.name} (${monster.attack}) attacking ${target.name} (${target.attack})`);
                await this.client.declareAttack(gameId, monster._id, target._id);
              } else {
                this.log(`${monster.name} not attacking (would lose)`);
              }
            } else {
              // Direct attack
              this.log(`${monster.name} attacking directly!`);
              await this.client.declareAttack(gameId, monster._id);
            }

            await this.sleep(500);
          }
        }
      }

      // 5. End turn
      this.log("Ending turn");
      await this.client.endTurn(gameId);

    } catch (error) {
      this.log(`Error playing turn: ${error instanceof Error ? error.message : String(error)}`, "error");
      // Try to end turn even if we hit an error
      try {
        await this.client.endTurn(gameId);
      } catch {
        // If we can't end turn, the game state is broken
        this.log("Could not end turn - game may be stuck", "error");
      }
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Main game loop - polls for pending turns
   */
  async run() {
    this.log(`Agent '${this.name}' starting...`);

    // Get agent info
    try {
      const agentInfo = await this.client.getAgentInfo();
      this.log(`Connected as: ${agentInfo.name} (ELO: ${agentInfo.elo}, Record: ${agentInfo.wins}W-${agentInfo.losses}L)`);
    } catch (error) {
      this.log(`Failed to get agent info: ${error instanceof Error ? error.message : String(error)}`, "error");
      return;
    }

    // Enter matchmaking
    this.log("Entering casual matchmaking...");
    try {
      const lobby = await this.client.enterMatchmaking("casual");
      this.log(`Created lobby ${lobby.lobbyId}, waiting for opponent...`);
    } catch (error) {
      this.log(`Failed to enter matchmaking: ${error instanceof Error ? error.message : String(error)}`, "error");
      return;
    }

    // Poll for game to start and turns
    this.log("Polling for game to start...");
    let consecutiveErrors = 0;

    while (true) {
      try {
        const pendingTurns = await this.client.getPendingTurns();

        if (pendingTurns.length > 0) {
          const turn = pendingTurns[0];

          // New game started
          if (this.currentGameId !== turn.gameId) {
            this.currentGameId = turn.gameId;
            this.log(`Game started! Opponent: ${turn.opponent.username}`);
          }

          // It's our turn
          if (turn.timeoutWarning) {
            this.log("⏰ Timeout warning! Playing immediately...", "warn");
          }

          await this.playTurn(turn.gameId);
          consecutiveErrors = 0; // Reset error counter on success
        }

        // Check if game ended
        if (this.currentGameId) {
          try {
            const state = await this.client.getGameState(this.currentGameId);
            if (!state) {
              // Game ended
              this.log("Game ended. Returning to matchmaking...");
              this.currentGameId = null;

              // Re-enter matchmaking
              await this.sleep(2000);
              const lobby = await this.client.enterMatchmaking("casual");
              this.log(`Created new lobby ${lobby.lobbyId}, waiting for opponent...`);
            }
          } catch {
            // Game probably ended
            this.log("Game ended (state unavailable). Returning to matchmaking...");
            this.currentGameId = null;

            await this.sleep(2000);
            const lobby = await this.client.enterMatchmaking("casual");
            this.log(`Created new lobby ${lobby.lobbyId}, waiting for opponent...`);
          }
        }

        // Wait before next poll
        await this.sleep(POLL_INTERVAL_MS);

      } catch (error) {
        consecutiveErrors++;
        this.log(`Error in game loop: ${error instanceof Error ? error.message : String(error)}`, "error");

        if (consecutiveErrors >= MAX_RETRIES) {
          this.log("Too many consecutive errors, stopping agent", "error");
          break;
        }

        await this.sleep(POLL_INTERVAL_MS * 2); // Longer wait on error
      }
    }
  }
}

// =============================================================================
// Registration Helper
// =============================================================================

async function registerAgent(name: string): Promise<string> {
  console.log(`Registering new agent: ${name}`);

  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      starterDeckCode: "INFERNAL_DRAGONS", // Default starter deck
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Registration failed: ${error.message || error.code}`);
  }

  const data = await response.json();
  console.log(`✅ Registration successful!`);
  console.log(`   Agent ID: ${data.playerId}`);
  console.log(`   API Key: ${data.apiKey}`);
  console.log(`   Wallet: ${data.walletAddress || "pending"}`);
  console.log(`\n⚠️  SAVE YOUR API KEY - it won't be shown again!\n`);

  return data.apiKey;
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const config: AgentConfig = {
    name: args[0] || `BasicAgent-${Date.now()}`,
    apiKey: process.env.LTCG_API_KEY,
  };

  // Register if no API key provided
  if (!config.apiKey) {
    console.log("No API key found in environment. Registering new agent...\n");
    config.apiKey = await registerAgent(config.name);

    console.log("Add this to your .env file:");
    console.log(`LTCG_API_KEY=${config.apiKey}\n`);
  }

  // Start the agent
  const agent = new BasicAgent(config.name, config.apiKey);
  await agent.run();
}

// Run if executed directly
if (import.meta.main || require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { LTCGClient, BasicAgent, registerAgent };
