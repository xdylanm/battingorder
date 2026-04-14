## Context

The existing lineup generator (`lineupLogic.ts`) uses a scored greedy algorithm to assign positions inning-by-inning. The current `lineup-position-consistency` change added stickiness bonuses (+5 same position, +4 OF-neighbor, +4 cross-game) and a scaled infield/outfield balance bonus, but the greedy structure still produces inconsistent zone distribution because the scoring system can't look ahead across innings. A player might score highest for `SS` in inning 1, then highest for `LF` in inning 2, and never get the two-consecutive-inning stretch the algorithm tries to produce.

The new approach replaces scoring with explicit structural rules: anchor the pitcher/catcher rows first, then place all other players in predictable two-inning blocks, then flip zones for innings 3–5.

## Goals / Non-Goals

**Goals:**
- Every non-pitcher/catcher player plays the same position for at least two consecutive innings
- Players alternate infield/outfield zones across the game wherever roster size permits
- The infield/outfield imbalance (4 IF vs 3 OF positions) is distributed fairly across the season using `outfield_innings` and `infield_innings`
- The 2nd pitcher and 2nd catcher always follow the anchor pattern (OF → sit → P and sit → OF → C respectively)
- Sits are distributed by season `sit_count`, no back-to-back sits

**Non-Goals:**
- Optimizing batting order (unchanged)
- Extra-innings beyond inning 5 (grid slots 5–8 remain empty as before)
- Handling the 1-pitcher case (always 2 pitchers per game)
- Position assignments for innings 6–9

## Decisions

### D1: Replace stickiness scoring with structural zone-rotation

**Decision:** Discard the scoring-bonus approach for cross-inning continuity. Instead, explicitly assign 2-inning position blocks in innings 1–2, then assign a zone-flipped 2-inning block in innings 3–5.

**Rationale:** Scoring can always be overridden by a competing bonus. The structural approach guarantees consecutive-inning position pairs without relying on the greedy algorithm accidentally landing on the right choice.

**Alternative considered:** Increase stickiness bonus weight. Rejected — the greedy order-of-assignment means later players always compete for what's left, making strong stickiness rewards actively hurt those players.

---

### D2: Season balance via `outfield_innings` / `infield_innings` counters

**Decision:** Add two integer counters to `Player` (DB columns already added). Sort players by these counters when the OF slot count in innings 3–5 is insufficient to give every infield-early player an outfield rotation.

**Rationale:** Mirrors the existing `sit_count` pattern. Fast at query time (columns loaded with the player record). The sort is a deterministic tiebreaker — no randomness, same inputs always yield same grid.

**Alternative considered:** Compute season balance from all historical `LineupEntry.positions` at build time. Rejected — requires a full-history query instead of a single scalar per player.

---

### D3: Baton-pass pattern for innings 1–2

**Decision:** Players sitting inning 1 ("Group A") get their preferred position reserved for innings 2 and 3. The players sitting inning 2 ("Group B") are assigned a position from Group A's reserved pool in inning 1. Remaining players hold their inning-1 position through inning 2.

**Rationale:** Ensures the "sit-then-play" transition always produces a consecutive two-inning run. Without this, the player returning from a sit in inning 2 is assigned a random leftover position with no continuity.

---

### D4: Retire cross-game stickiness bonus

**Decision:** Remove `prevGameMostCommon` computation and the +4/+2 cross-game scoring bonus.

**Rationale:** The zone-rotation algorithm structures cross-game balance explicitly through `outfield_innings`. The stickiness bonus was a heuristic approximation for what the new algorithm does structurally. Keeping it would partially fight the zone-flip logic.

---

### D5: 2nd pitcher / 2nd catcher anchor pattern

**Decision:** When N ≥ 10, lock the following before any other assignments:
- 2nd pitcher: `[OF, X, P, P, P]` — plays an outfield position in inn 0, sits inn 1, pitches inn 2–4
- 2nd catcher: `[X, OF, C, C, C]` — sits inn 0, plays the same outfield position in inn 1, catches inn 2–4

Both anchors are assigned the **same** outfield position. Since they play it in different innings (inn 0 and inn 1 respectively), there is no scheduling conflict. The shared position is chosen as any OF slot (LF, CF, RF) that neither player has in their avoid list. If all three are excluded by one or both players' avoid lists, default to RF.

**Rationale:** The pre-game sit rule + the baton-pass structure means these two players are always involved in the Group A / Group B exchange. Anchoring them explicitly avoids edge cases where sit distribution might skip one of them. Using the same position reinforces the baton-pass symmetry: whichever position they hold in innings 0–1 is handed off cleanly when the full rotation begins.

---

### D6: Algorithm structure — single-pass phases, not recursive stages

**Decision:** Replace the 4-stage `buildGrid` with 5 sequential phases, each modifying the grid in place:

```
Phase 1: Lock P/C + anchor 2nd pitcher/catcher
Phase 2: Distribute remaining sits (sit_count priority)
Phase 3: Build baton-pass pool (Group A → Group B, Group A reserve inn 1–2)
Phase 4: Assign innings 1–2 for all remaining players (same pos both innings)
Phase 5: Zone-flip innings 3–5 (OF-early→IF, IF-early→OF, season balance)
```

**Rationale:** Each phase fully resolves its concern before the next runs — no phase needs to "look back" at a prior phase's partial state.

## Risks / Trade-offs

- **Small rosters (N=9):** `sitsPerInning = 0`. Group A and Group B are both empty. The baton-pass is skipped. Innings 1–2 are just assigned directly with the same-position-both-innings rule. Zone-flip in innings 3–5 still applies. Low risk.

- **Anchor OF position selection:** Both anchors share the same outfield slot (played in different innings). The position is chosen by excluding both players' avoid lists from {LF, CF, RF}. If the remaining set is empty, RF is used as the fallback. Preference is not used to pick among the remaining options — the aim is a mutually acceptable slot, not an individually preferred one.

- **Cannot always balance zones:** With 4 IF and 3 OF, one player per inning will always play a second infield position rather than flipping to OF. This is structural, not a bug. The `outfield_innings` counter distributes this burden across the season fairly.

- **First pitcher/catcher flexibility:** These players follow normal sit-distribution rules after their pitched innings. They may or may not zone-flip depending on when they sit. This is intentional and correct.

## Migration Plan

1. Update `Player` interface in `types.ts` to add `outfield_innings` and `infield_innings`
2. Replace `buildGrid` in `lineupLogic.ts` with the new 5-phase algorithm
3. Update `buildLineup` to remove `prevGameMostCommon` computation and pass new player fields
4. Update `LineupEditor.tsx` save handler to increment `outfield_innings` / `infield_innings` counters (same pattern as `sit_count`)
5. No DB migration needed (columns already added)

Rollback: revert `lineupLogic.ts` — no DB schema risk since columns are additive.

## Open Questions

- None — algorithm fully resolved in exploration session.
