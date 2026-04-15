## Context

When `recomputePlayerStats` runs (triggered by Mark Complete or Reopen), it iterates every completed game's lineup entries, skipping rows where `is_scratch = true`. Scratched players end up with zero contribution to their `sit_count`, even though they effectively sat the entire game. The recompute is a full recalculation — it zeroes all players and rebuilds from completed games — so scratch sit credit must be computed per-game and accumulated in the same pass.

The average sits formula: round(total_sits_in_game / active_player_count). "Active players" are non-scratch lineup entries for that game. "Sits in game" is the number of `X` values across all active entries (respecting `innings_played` limit).

## Goals / Non-Goals

**Goals:**
- In the full stat recompute, add scratch sit credit to each scratched player's `sit_count` for every completed game they sat out.
- The credit per game equals round(total X's across active entries / number of active entries), where entries are sliced to `innings_played` (or 9 if null).
- Reverse correctly on Reopen — because recompute is a full rebuild from scratch, no special undo logic is needed; reopened games simply are no longer `is_complete` and are excluded from the recompute.

**Non-Goals:**
- Retroactively updating sit counts for already-completed games (not required by the proposal).
- Changing how `outfield_innings` or `infield_innings` are computed.
- UI changes — no new columns, labels, or indicators are needed for scratch sit credit.

## Decisions

### Decision: Compute credit inside the existing full-recompute pass

The current `recomputePlayerStats` already does a single pass over all completed games and their lineup entries. Scratch sit credit can be accumulated in the same loop with no additional DB queries.

**Alternative considered**: Separate query at mark-complete time (delta update). Rejected because it complicates Reopen (requires storing the delta to subtract it) and diverges from the existing full-rebuild pattern.

### Decision: Use round() of per-game average, not a running season average

Credit is computed per-game to keep the recompute deterministic and order-independent. Using a season-wide average would require a two-pass approach and is harder to reason about.

**Alternative considered**: Always award 1 sit per scratched player per game, ignoring the average. Rejected — this overcompensates in low-sit games and was not what was requested.

### Decision: Divide by active player count, not total roster size

Active players (non-scratch entries for that game) represent the population that actually accumulated sits. Using total roster would undercount the credit.

### Decision: No schema changes

`sit_count` already exists on `players`. The scratch credit is just an additive contribution to the same column. No new column is needed.

## Risks / Trade-offs

- **Games with no active entries (edge case)** → Division by zero. Mitigation: guard with `if (activeCount === 0) credit = 0`.
- **Scratch entries with no lineup row** → If a player was scratched before a lineup entry was created for them, they may not have a row with `is_scratch = true`. Mitigation: document this as a pre-existing data quality concern; no new risk introduced by this change.
- **Credit is rounded** → Standard rounding (`Math.round`) is used, which is symmetric around 0.5. This is the fairest simple approximation of the true average.
