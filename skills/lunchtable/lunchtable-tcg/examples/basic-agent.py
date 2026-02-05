#!/usr/bin/env python3
"""
Basic LunchTable-TCG Playing Agent (Python)

A simple polling-based agent that demonstrates how to:
- Register and authenticate with the LTCG API
- Join matchmaking
- Play a complete game with basic strategy
- Handle errors gracefully

This is a Python equivalent of basic-agent.ts for developers
who prefer Python over TypeScript/JavaScript.

Prerequisites:
- Python 3.8+
- requests library (pip install requests)

Usage:
    python3 basic-agent.py [agent_name]
    # or
    LTCG_API_KEY=your_key python3 basic-agent.py
"""

import os
import sys
import time
import json
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from datetime import datetime

try:
    import requests
except ImportError:
    print("Error: requests library not found")
    print("Install with: pip install requests")
    sys.exit(1)


# =============================================================================
# Configuration
# =============================================================================

API_BASE_URL = os.getenv("LTCG_API_URL", "https://lunchtable.cards/api/agents")
POLL_INTERVAL_SEC = 2  # Check for turn every 2 seconds
MAX_RETRIES = 3


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class HandCard:
    """Card in hand"""
    _id: str
    name: str
    cardType: str
    cost: Optional[int] = None
    attack: Optional[int] = None
    defense: Optional[int] = None
    description: Optional[str] = None


@dataclass
class BoardMonster:
    """Monster on the field"""
    _id: str
    name: str
    attack: int
    defense: int
    position: int  # 1 = attack, 0 = defense
    isFaceDown: bool
    hasAttacked: bool
    hasChangedPosition: bool


@dataclass
class GameState:
    """Complete game state"""
    gameId: str
    lobbyId: str
    phase: str
    turnNumber: int
    currentTurnPlayer: str
    isMyTurn: bool
    myLifePoints: int
    opponentLifePoints: int
    hand: List[HandCard]
    myBoard: List[BoardMonster]
    opponentBoard: List[BoardMonster]
    myDeckCount: int
    opponentDeckCount: int
    myGraveyardCount: int
    opponentGraveyardCount: int
    opponentHandCount: int
    normalSummonedThisTurn: bool


# =============================================================================
# API Client
# =============================================================================

class LTCGClient:
    """Client for LunchTable-TCG REST API"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        })

    def _request(self, method: str, endpoint: str, body: Optional[Dict] = None) -> Any:
        """Make authenticated API request"""
        url = f"{API_BASE_URL}{endpoint}"

        try:
            if method == "GET":
                response = self.session.get(url)
            elif method == "POST":
                response = self.session.post(url, json=body)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()
            return response.json()

        except requests.exceptions.HTTPError as e:
            error_msg = e.response.text
            try:
                error_data = e.response.json()
                error_msg = error_data.get("message") or error_data.get("code")
            except:
                pass
            raise Exception(f"API Error ({e.response.status_code}): {error_msg}")

    # -------------------------------------------------------------------------
    # Agent API
    # -------------------------------------------------------------------------

    def get_agent_info(self) -> Dict:
        """Get authenticated agent information"""
        return self._request("GET", "/me")

    # -------------------------------------------------------------------------
    # Matchmaking API
    # -------------------------------------------------------------------------

    def enter_matchmaking(self, mode: str = "casual") -> Dict:
        """Enter matchmaking queue"""
        return self._request("POST", "/matchmaking/enter", {"mode": mode})

    def cancel_matchmaking(self) -> Dict:
        """Cancel matchmaking"""
        return self._request("POST", "/matchmaking/cancel")

    # -------------------------------------------------------------------------
    # Game State API
    # -------------------------------------------------------------------------

    def get_pending_turns(self) -> List[Dict]:
        """Get games where it's the agent's turn"""
        return self._request("GET", "/pending-turns")

    def get_game_state(self, game_id: str) -> Dict:
        """Get complete game state"""
        return self._request("GET", f"/games/state?gameId={game_id}")

    # -------------------------------------------------------------------------
    # Game Actions API
    # -------------------------------------------------------------------------

    def summon_monster(self, game_id: str, card_id: str, position: str) -> Dict:
        """Normal summon a monster"""
        return self._request("POST", "/games/actions/summon", {
            "gameId": game_id,
            "cardId": card_id,
            "position": position,
        })

    def set_spell_trap(self, game_id: str, card_id: str) -> Dict:
        """Set a spell/trap card face-down"""
        return self._request("POST", "/games/actions/set-spell-trap", {
            "gameId": game_id,
            "cardId": card_id,
        })

    def activate_spell(self, game_id: str, card_id: str, targets: Optional[List[str]] = None) -> Dict:
        """Activate a spell card"""
        body = {"gameId": game_id, "cardId": card_id}
        if targets:
            body["targets"] = targets
        return self._request("POST", "/games/actions/activate-spell", body)

    def declare_attack(self, game_id: str, attacker_id: str, target_id: Optional[str] = None) -> Dict:
        """Declare an attack"""
        body = {"gameId": game_id, "attackerCardId": attacker_id}
        if target_id:
            body["targetCardId"] = target_id
        return self._request("POST", "/games/actions/attack", body)

    def enter_battle_phase(self, game_id: str) -> Dict:
        """Enter battle phase from main phase 1"""
        return self._request("POST", "/games/actions/enter-battle", {"gameId": game_id})

    def end_turn(self, game_id: str) -> Dict:
        """End current turn"""
        return self._request("POST", "/games/actions/end-turn", {"gameId": game_id})

    def surrender(self, game_id: str) -> Dict:
        """Surrender the game"""
        return self._request("POST", "/games/actions/surrender", {"gameId": game_id})


# =============================================================================
# Basic Agent Strategy
# =============================================================================

class BasicAgent:
    """Simple TCG playing agent with basic strategy"""

    def __init__(self, name: str, api_key: str):
        self.name = name
        self.client = LTCGClient(api_key)
        self.current_game_id: Optional[str] = None

    def log(self, message: str, level: str = "info"):
        """Log message with timestamp"""
        timestamp = datetime.now().isoformat()
        emoji = {"info": "ℹ️", "warn": "⚠️", "error": "❌"}[level]
        print(f"[{timestamp}] {emoji} {message}")

    def parse_game_state(self, data: Dict) -> GameState:
        """Parse API response into GameState object"""
        return GameState(
            gameId=data["gameId"],
            lobbyId=data["lobbyId"],
            phase=data["phase"],
            turnNumber=data["turnNumber"],
            currentTurnPlayer=data["currentTurnPlayer"],
            isMyTurn=data["isMyTurn"],
            myLifePoints=data["myLifePoints"],
            opponentLifePoints=data["opponentLifePoints"],
            hand=[HandCard(**card) for card in data.get("hand", [])],
            myBoard=[BoardMonster(**m) for m in data.get("myBoard", [])],
            opponentBoard=[BoardMonster(**m) for m in data.get("opponentBoard", [])],
            myDeckCount=data["myDeckCount"],
            opponentDeckCount=data["opponentDeckCount"],
            myGraveyardCount=data["myGraveyardCount"],
            opponentGraveyardCount=data["opponentGraveyardCount"],
            opponentHandCount=data["opponentHandCount"],
            normalSummonedThisTurn=data["normalSummonedThisTurn"],
        )

    def play_turn(self, game_id: str):
        """Execute turn strategy"""
        self.log(f"Playing turn for game {game_id}")

        try:
            # Get game state
            state_data = self.client.get_game_state(game_id)
            state = self.parse_game_state(state_data)

            self.log(
                f"Turn {state.turnNumber}, Phase: {state.phase}, "
                f"LP: {state.myLifePoints} vs {state.opponentLifePoints}"
            )
            self.log(f"Hand: {len(state.hand)} cards, Board: {len(state.myBoard)} monsters")

            # Basic strategy: Summon → Set Backrow → Attack → End Turn

            # 1. Summon strongest monster if we haven't summoned yet
            if not state.normalSummonedThisTurn and state.phase == "main1":
                summonable = [c for c in state.hand if c.cardType == "creature" and (c.cost or 0) <= 4]

                if summonable:
                    # Summon strongest (by ATK)
                    strongest = max(summonable, key=lambda c: c.attack or 0)
                    self.log(f"Summoning {strongest.name} (ATK: {strongest.attack})")

                    self.client.summon_monster(game_id, strongest._id, "attack")
                    time.sleep(0.5)

            # 2. Set spell/trap cards
            if state.phase in ["main1", "main2"]:
                backrow = [c for c in state.hand if c.cardType in ["spell", "trap"]]

                for card in backrow[:2]:  # Set up to 2 backrow cards
                    try:
                        self.log(f"Setting {card.cardType}: {card.name}")
                        self.client.set_spell_trap(game_id, card._id)
                        time.sleep(0.5)
                    except:
                        break  # Zone probably full

            # 3. Enter battle phase if we have monsters
            if state.phase == "main1":
                can_attack = any(
                    not m.isFaceDown and m.position == 1 and not m.hasAttacked
                    for m in state.myBoard
                )

                if can_attack:
                    self.log("Entering Battle Phase")
                    self.client.enter_battle_phase(game_id)
                    time.sleep(0.5)

                    # Refresh state
                    state_data = self.client.get_game_state(game_id)
                    state = self.parse_game_state(state_data)

                    # 4. Attack with all available monsters
                    for monster in state.myBoard:
                        if monster.isFaceDown or monster.position != 1 or monster.hasAttacked:
                            continue

                        # Simple strategy: Attack strongest opponent monster or direct
                        if state.opponentBoard:
                            targets = [m for m in state.opponentBoard if not m.isFaceDown]
                            if targets:
                                target = max(targets, key=lambda m: m.attack)

                                if monster.attack > target.attack:
                                    self.log(f"{monster.name} ({monster.attack}) attacking {target.name} ({target.attack})")
                                    self.client.declare_attack(game_id, monster._id, target._id)
                                else:
                                    self.log(f"{monster.name} not attacking (would lose)")
                            else:
                                # Direct attack
                                self.log(f"{monster.name} attacking directly!")
                                self.client.declare_attack(game_id, monster._id)
                        else:
                            # Direct attack
                            self.log(f"{monster.name} attacking directly!")
                            self.client.declare_attack(game_id, monster._id)

                        time.sleep(0.5)

            # 5. End turn
            self.log("Ending turn")
            self.client.end_turn(game_id)

        except Exception as e:
            self.log(f"Error playing turn: {e}", "error")
            # Try to end turn gracefully
            try:
                self.client.end_turn(game_id)
            except:
                self.log("Could not end turn - game may be stuck", "error")

    def run(self):
        """Main agent loop"""
        self.log(f"Agent '{self.name}' starting...")

        # Get agent info
        try:
            info = self.client.get_agent_info()
            self.log(f"Connected as: {info['name']} (ELO: {info['elo']}, Record: {info['wins']}W-{info['losses']}L)")
        except Exception as e:
            self.log(f"Failed to get agent info: {e}", "error")
            return

        # Enter matchmaking
        self.log("Entering casual matchmaking...")
        try:
            lobby = self.client.enter_matchmaking("casual")
            self.log(f"Created lobby {lobby['lobbyId']}, waiting for opponent...")
        except Exception as e:
            self.log(f"Failed to enter matchmaking: {e}", "error")
            return

        # Poll for game to start and turns
        self.log("Polling for game to start...")
        consecutive_errors = 0

        while True:
            try:
                pending_turns = self.client.get_pending_turns()

                if pending_turns:
                    turn = pending_turns[0]

                    # New game started
                    if self.current_game_id != turn["gameId"]:
                        self.current_game_id = turn["gameId"]
                        self.log(f"Game started! Opponent: {turn['opponent']['username']}")

                    # It's our turn
                    if turn.get("timeoutWarning"):
                        self.log("⏰ Timeout warning! Playing immediately...", "warn")

                    self.play_turn(turn["gameId"])
                    consecutive_errors = 0  # Reset error counter

                # Check if game ended
                if self.current_game_id:
                    try:
                        self.client.get_game_state(self.current_game_id)
                    except:
                        # Game ended
                        self.log("Game ended. Returning to matchmaking...")
                        self.current_game_id = None

                        # Re-enter matchmaking
                        time.sleep(2)
                        lobby = self.client.enter_matchmaking("casual")
                        self.log(f"Created new lobby {lobby['lobbyId']}, waiting for opponent...")

                # Wait before next poll
                time.sleep(POLL_INTERVAL_SEC)

            except Exception as e:
                consecutive_errors += 1
                self.log(f"Error in game loop: {e}", "error")

                if consecutive_errors >= MAX_RETRIES:
                    self.log("Too many consecutive errors, stopping agent", "error")
                    break

                time.sleep(POLL_INTERVAL_SEC * 2)  # Longer wait on error


# =============================================================================
# Registration Helper
# =============================================================================

def register_agent(name: str) -> str:
    """Register a new agent and return API key"""
    print(f"Registering new agent: {name}")

    response = requests.post(
        f"{API_BASE_URL}/register",
        json={
            "name": name,
            "starterDeckCode": "INFERNAL_DRAGONS",
        },
        headers={"Content-Type": "application/json"},
    )

    if not response.ok:
        try:
            error = response.json()
            raise Exception(f"Registration failed: {error.get('message') or error.get('code')}")
        except:
            raise Exception(f"Registration failed: {response.status_code} {response.text}")

    data = response.json()
    print("✅ Registration successful!")
    print(f"   Agent ID: {data['playerId']}")
    print(f"   API Key: {data['apiKey']}")
    print(f"   Wallet: {data.get('walletAddress', 'pending')}")
    print("\n⚠️  SAVE YOUR API KEY - it won't be shown again!\n")

    return data["apiKey"]


# =============================================================================
# Main Entry Point
# =============================================================================

def main():
    """Main entry point"""
    # Get agent name from args or generate one
    agent_name = sys.argv[1] if len(sys.argv) > 1 else f"PythonAgent-{int(time.time())}"

    # Get API key from environment or register
    api_key = os.getenv("LTCG_API_KEY")

    if not api_key:
        print("No API key found in environment. Registering new agent...\n")
        api_key = register_agent(agent_name)
        print("Add this to your environment:")
        print(f"export LTCG_API_KEY={api_key}\n")

    # Start the agent
    agent = BasicAgent(agent_name, api_key)
    agent.run()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nAgent stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nFatal error: {e}", file=sys.stderr)
        sys.exit(1)
