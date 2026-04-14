## Why

The lineup generator assigns positions independently each inning with no memory of prior assignments, causing players to bounce between unrelated positions (e.g., SS → LF → 2B) within a game and across games. Coaches and players benefit from positional continuity — it reduces confusion and lets players settle into a role.

## What Changes

- `assignPositions` tracks each player's last played position within a game (skipping sits) and scores staying in the same or adjacent outfield position higher
- The infield/outfield balance bonus now scales with the magnitude of the imbalance rather than being a flat value, so balance eventually overrides stickiness but doesn't fight it artificially
- `buildLineup` computes each player's most common non-pitcher position from the previous game and seeds it as a cross-game stickiness bias
- Outfield adjacency (`LF↔CF`, `CF↔RF`) is recognized as a "close" move distinct from crossing zone boundaries; no infield adjacency concept

## Capabilities

### New Capabilities

- `lineup-position-consistency`: Scoring rules and data flow for position stickiness within and across games

### Modified Capabilities

<!-- none — no existing specs to update -->

## Impact

- `battingorder/src/lineupLogic.ts` — all changes contained here; `assignPositions` gains a `prevGameMostCommon` parameter
- No interface changes to `types.ts`, no database schema changes
- Existing `prevLineupEntries` data already contains the position arrays needed for cross-game seeding
