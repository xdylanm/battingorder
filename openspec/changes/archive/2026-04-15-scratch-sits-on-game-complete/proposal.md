## Why

Scratched players currently receive zero sit credit when they miss a game, even though they are effectively sitting the entire game. This creates an unfair imbalance in season sit counts, causing scratched players to accumulate fewer sits on record and receive more sits in future games — the opposite of what fairness requires.

## What Changes

- When a game is marked complete, each scratched player's `sit_count` is incremented by the average number of sits per active player in that game (rounded to the nearest integer).
- When a completed game is reopened, the scratch sit credit is reversed — the same average-sits value is subtracted from each scratched player's `sit_count`.
- The average sits value is computed at the moment of finalization from the active roster's actual sit assignments in that game.
- Only games marked complete going forward are affected; previously completed games are not retroactively updated.

## Capabilities

### New Capabilities

_None_

### Modified Capabilities

- `game-finalization`: The stat recompute triggered by "Mark Complete" and "Reopen" must now also apply scratch sit credit to scratched players, incrementing (or decrementing on reopen) their `sit_count` by the rounded average sits per active player.

## Impact

- `lineupLogic.ts` — stat recompute function gains scratch-sit-credit logic
- `GameManager.tsx` / `LineupEditor.tsx` — wherever the mark-complete / reopen action triggers the stat recompute, the scratched player list and average sits must be available
- `players` table `sit_count` column — values change for scratched players on complete/reopen
- No schema changes required; no new tables or columns needed
