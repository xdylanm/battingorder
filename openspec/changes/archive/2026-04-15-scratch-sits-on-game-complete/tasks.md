## 1. Update Stat Recompute Logic

- [x] 1.1 In `recomputePlayerStats` (LineupEditor.tsx), after the existing per-game loop that accumulates sits/infield/outfield for active players, compute the scratch sit credit for each game: round(total X positions across active entries / number of active entries), defaulting to 0 if there are no active entries.
- [x] 1.2 For each lineup entry in the game where `is_scratch = true`, add the computed scratch sit credit to that player's `sits` total in the `totals` accumulator. Create a totals entry for the player if one does not yet exist.

## 2. Verify Reopen Correctness

- [x] 2.1 Confirm that Reopen requires no additional logic — because `recomputePlayerStats` is a full rebuild that excludes reopened games (now `is_complete = false`), the scratch credit is automatically removed. Trace the existing `handleReopen` path to verify.
