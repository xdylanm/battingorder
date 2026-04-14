## Why

The lineup generator's scoring-based greedy approach does not reliably give players time in both the infield and outfield across a game or across the season. Coaches need a structured, predictable rotation where players alternate zones (infield vs. outfield) and play the same position for consecutive innings.

## What Changes

- Replace the multi-stage greedy + stickiness-bonus algorithm in `lineupLogic.ts` with an explicit zone-rotation algorithm
- The 2nd pitcher and 2nd catcher are anchored to a specific pattern: 2nd catcher sits inning 1 and plays OF in inning 2; 2nd pitcher plays OF in inning 1, sits inning 2, then pitches
- Sits are distributed by season `sit_count` (highest first), with the 2nd pitcher/catcher anchors locked before general sit distribution
- A "baton pass" pattern assigns positions for innings 1–2: players sitting inning 1 hand their position to the player filling that slot in inning 2, creating consistent consecutive-inning position pairs
- Players who play outfield in innings 1–2 are assigned infield in innings 3–5, and vice versa; when OF slots are insufficient, the player with the lowest season `outfield_innings` gets priority
- Cross-game stickiness scoring bonus is **removed** (replaced by the zone-flip's season `outfield_innings` balance)
- `Player` type gains `outfield_innings` and `infield_innings` fields (DB columns already added)
- `buildLineup` increments `outfield_innings` / `infield_innings` is tracked externally when a game is saved (same pattern as `sit_count`)

## Capabilities

### New Capabilities

- `lineup-zone-rotation`: Algorithm for structured infield/outfield zone rotation across innings and across the season

### Modified Capabilities

<!-- none — lineup-position-consistency was never synced to main specs -->

## Impact

- `battingorder/src/lineupLogic.ts` — full replacement of `buildGrid` / `assignPositions` logic
- `battingorder/src/types.ts` — add `outfield_innings: number` and `infield_innings: number` to `Player`
- `battingorder/src/LineupEditor.tsx` — pass `outfield_innings` / `infield_innings` through to `buildLineup`; increment on save (same as `sit_count`)
- No changes to `validateGrid`, `exportPdf`, or routing
