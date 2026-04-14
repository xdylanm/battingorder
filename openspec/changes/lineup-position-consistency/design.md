## Context

The lineup generator (`lineupLogic.ts`) uses a greedy scoring function to assign positions inning-by-inning. Previously the score for a (player, position) pair considered only explicit preferences/avoids and a flat infield/outfield balance nudge. There was no memory of what position a player held in a prior inning, leading to high positional churn within a game and no continuity across games.

All logic is self-contained in `lineupLogic.ts`. The data needed for cross-game seeding already exists in `LineupEntry.positions` (passed in as `prevLineupEntries`).

## Goals / Non-Goals

**Goals:**
- Players stay in the same position for consecutive innings when possible
- Adjacent outfield moves (LF↔CF, CF↔RF) are treated as "close" and preferred over larger jumps
- Infield/outfield balance is maintained but only overrides stickiness when the imbalance is significant
- Cross-game seeding biases the first inning toward a player's most common position from the previous game
- Pitching role is excluded from cross-game seeding (pitchers rotate into field positions freely)

**Non-Goals:**
- Infield adjacency (3B↔SS↔2B↔1B) — all infield positions treated equally
- Hard constraints — all stickiness is a scoring bonus, not a locked assignment
- Persistence of stickiness across more than one previous game

## Decisions

### 1. Stickiness as scoring bonus, not hard constraint
Stickiness is implemented as additional points in the existing `score()` function rather than pre-assigning positions. This keeps the greedy solver intact and allows preferences, avoids, and balance to still win when they should.

**Alternatives considered:** Pre-assign "preferred" position per player before the greedy loop. Rejected — it conflicts with the constrained-first sort and loses the ability for other factors to override.

### 2. Within-game: track `lastPlayedPos`, skip sits
`lastPlayedPos[id]` is updated after each inning to the assigned position, but only when the player is active (not `X`, not `''`). This means a sit doesn't reset a player's home position — they return to it naturally.

Bonus values: `+8` same position, `+4` OF-neighbor.

### 3. Cross-game: most-common non-pitcher position from `prevLineupEntries`
The previous game's `LineupEntry.positions` array is already available. The most frequent non-`P`/non-`X`/non-`''` position is taken as the seed. This is more stable than "last inning played" and represents the player's functional role in that game.

Bonus values: `+4` same position, `+2` OF-neighbor.

### 4. Scaled balance bonus
The old balance bonus was flat `+4`. Replaced with `2 × |imbalance|` where imbalance is `infieldCount - outfieldCount`. At 1 inning out of balance: `+2` (stickiness wins). At 4 innings out of balance: `+8` (balance overrides stickiness).

### 5. OF adjacency only (no IF adjacency)
The LF↔CF↔RF adjacency captures the real movement cost in the outfield (LF→RF is a big move; LF→CF is minor). Infield positions don't have a meaningful spatial adjacency in this game context, and the added complexity isn't warranted.

## Risks / Trade-offs

- **Greedy order sensitivity**: The constrained-first sort means unconstrained players are assigned last. A sticky player with many options may lose their preferred spot to another player who was sorted earlier. The `+8` bonus is large enough to dominate in most cases, but edge cases exist when multiple players want the same sticky position. Mitigation: the greedy order is unchanged from before; this is no worse than the prior behavior.
- **Flat cross-game bonus is weak**: `+4` cross-game stickiness is intentionally soft — it's a bias, not a guarantee. If the team composition changes significantly game-to-game, it has little effect. Acceptable given the design goal of "somewhat sticky."
- **P excluded from cross-game seed**: A player who pitched last game gets no position seed. They'll be assigned based on preferences/avoids only. This is intentional — pitchers rotate into field positions freely.

## Open Questions

None — implementation is complete.
