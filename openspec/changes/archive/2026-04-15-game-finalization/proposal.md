## Why

Games don't always go the full 9 innings, so the current 9-inning assumption produces incorrect season stats for sits, infield innings, and outfield innings. There's also no way to record the final score or mark a game as done, which means past unfinished games are indistinguishable from games that haven't been played yet.

## What Changes

- Add `innings_played`, `our_score`, `opponent_score`, and `is_complete` columns to the `games` table
- Display the innings grid with innings past `innings_played` greyed out and non-editable
- Add score fields ("Blue Jays" / "Opponent") and an innings played input to the lineup editor
- Add a "Mark Complete" / "Reopen" toggle in the lineup editor; marking complete triggers a stat recompute
- Change the games list order to: (1) recent unfinalized past games, (2) upcoming games (up to 5, expandable), (3) completed games (collapsed)
- Replace the broken delta-on-save stat update with a recompute-on-finalize approach: query all completed games, sum innings from `positions[0..innings_played-1]` per player, and write the totals to `players.sit_count`, `players.outfield_innings`, `players.infield_innings`

## Capabilities

### New Capabilities

- `game-finalization`: Fields, UI controls, and stat recompute logic for completing a game with a score and innings count

### Modified Capabilities

<!-- none — no existing specs change their requirements -->

## Impact

- `battingorder/src/types.ts` — `Game` interface gains `innings_played`, `our_score`, `opponent_score`, `is_complete`
- `battingorder/src/GameManager.tsx` — games list reordered into three sections
- `battingorder/src/LineupEditor.tsx` — score fields, innings played input, mark complete button, greyed-out inning cells, recompute logic replaces the current delta update
- Supabase `games` table — four new columns (migration required)
- Supabase `players` table — `sit_count`, `outfield_innings`, `infield_innings` now written only by the recompute, not on every save
