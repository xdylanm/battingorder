## 1. Type Updates

- [x] 1.1 Add `outfield_innings: number` and `infield_innings: number` to `Player` interface in `types.ts`

## 2. Phase 1 — Anchor Pattern

- [x] 2.1 Identify 2nd pitcher and 2nd catcher from `pitcherAssignments` (sorted by `startInning`)
- [x] 2.2 Lock 2nd pitcher: assign shared OF position to inn 0, `X` to inn 1, `P` to inn 2–4
- [x] 2.3 Lock 2nd catcher: assign `X` to inn 0, same shared OF position to inn 1, `C` to inn 2–4
- [x] 2.4 Choose shared OF position: pick any OF slot not in either anchor's avoid list; default to RF if all are excluded
- [x] 2.5 Lock 1st pitcher (`P`) and 1st catcher (`C`) for their innings from the pitching schedule

## 3. Phase 2 — Sit Distribution

- [x] 3.1 Compute `sitsPerInning = max(0, N - 9)`; skip if 0
- [x] 3.2 Distribute sits across innings 0–4 by season `sit_count` descending, no back-to-back, 2nd P/C anchors excluded from general sit pool in their locked innings

## 4. Phase 3 — Baton-Pass Pool (innings 1–2)

- [x] 4.1 Identify Group A: players sitting inn 0 (excluding 2nd catcher anchor)
- [x] 4.2 For each Group A player, reserve their preferred (or neutral) field position for inn 1 and 2; build position pool PA
- [x] 4.3 Identify Group B: players sitting inn 1 (excluding 2nd pitcher anchor)
- [x] 4.4 For each Group B player, assign a position from PA to inn 0; flag avoid-list violations visually

## 5. Phase 4 — Innings 1–2 Field Positions

- [x] 5.1 For all remaining players without inn 0 or 1 positions, assign the same field position to both innings
- [x] 5.2 Respect preferred positions; fall back to non-avoided positions; flag avoid violations

## 6. Phase 5 — Zone Flip (innings 3–5)

- [x] 6.1 Classify each player as OF-early (played OF in inn 0 or 1) or IF-early (played IF in inn 0 or 1)
- [x] 6.2 Sort IF-early players by `outfield_innings` ASC to determine flip priority
- [x] 6.3 Assign OF-early players infield positions in innings 2–4; same position for consecutive innings; preferences respected
- [x] 6.4 Assign IF-early players (by priority) outfield positions in innings 2–4; same position for consecutive innings
- [x] 6.5 For IF-early players who cannot flip (no OF slots left), assign an additional infield position
- [x] 6.6 Respect sit slots throughout (players sitting in innings 2–4 are skipped for that inning)

## 7. Remove Cross-Game Stickiness

- [x] 7.1 Remove `prevGameMostCommon` computation from `buildLineup`
- [x] 7.2 Remove `+4` same-position and `+2` OF-neighbor cross-game bonuses from scoring (or remove scoring entirely if replaced by structural assignment)
- [x] 7.3 Remove `OF_NEIGHBORS` usage if no longer needed by the new algorithm

## 8. Season Counter Increment on Save

- [x] 8.1 In `LineupEditor.tsx` save handler, count each player's infield and outfield innings from the final grid (excluding P, C, X, empty)
- [x] 8.2 Call Supabase to increment `outfield_innings` and `infield_innings` on each player record (same pattern as `sit_count`)

## 9. Validation

- [x] 9.1 Verify `validateGrid` still works correctly with the new grid structure (no changes expected but confirm)
- [x] 9.2 Manually test N=9 (no sits), N=10 (1 sit/inning), N=11 (2 sits/inning) cases
- [x] 9.3 Confirm no duplicate positions per inning in generated grids
- [x] 9.4 Confirm avoid-list violations are flagged and preferred-position assignments are respected
