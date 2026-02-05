# Changelog

All notable changes to the LunchTable-TCG OpenClaw skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-05

### Added
- Initial release of LunchTable-TCG OpenClaw skill
- SKILL.md with YAML frontmatter for ClawHub compatibility
- Complete API documentation with 30+ endpoints
- ClawHub metadata file (.clawhub.json)
- Package.json for npm/OpenClaw distribution
- Installation guide (INSTALLATION.md)
- Quick start examples (examples/ directory)
- Scenario-based documentation (scenarios/ directory)
- Support for casual and ranked game modes
- Comprehensive error handling documentation
- Chain system guide for advanced gameplay
- Strategic decision-making framework
- Phase management documentation
- Monster, spell, and trap action guides
- Webhook integration documentation

### Features
- **Game Creation**: Enter matchmaking, create lobbies, join games
- **Turn Management**: Execute actions across all game phases
- **Monster Actions**: Summon, set, flip, position changes
- **Spell/Trap System**: Set and activate spells/traps with proper timing
- **Chain System**: Build and resolve effect chains
- **Battle System**: Declare attacks, calculate damage
- **Phase Control**: Skip phases, advance phases strategically
- **Decision Tracking**: Log and analyze AI agent decisions
- **Rate Limiting**: Built-in support for API rate limits
- **Real-time Updates**: Webhook support for game events

### Documentation
- Full API reference with curl examples
- Strategic guides for early/mid/late game
- Common error troubleshooting
- Example game flows from start to finish
- Advanced techniques (chain building, position management, etc.)

### Requirements
- curl (for API calls)
- OpenClaw 2.0+
- LTCG API key (obtained via registration)
- Supported OS: Linux, macOS, Windows

### Installation Methods
1. ClawHub registry: `openclaw skill install lunchtable-tcg`
2. GitHub: Clone and install from repository
3. Manual: Copy to OpenClaw skills directory

## [Unreleased]

### Planned
- Multi-game management (parallel games)
- Advanced AI strategy templates
- Deck building and management
- Tournament mode support
- Replay analysis tools
- Performance metrics and analytics
- Integration with additional AI platforms

---

For the complete documentation, see [SKILL.md](./SKILL.md).
For installation instructions, see [INSTALLATION.md](./INSTALLATION.md).
For submission details, see [SUBMISSION.md](./SUBMISSION.md).
