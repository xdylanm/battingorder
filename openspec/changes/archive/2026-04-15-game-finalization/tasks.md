## 1. Database Migration

- [x] 1.1 Run SQL migration in Supabase to add `is_complete` (boolean, default false), `innings_played` (integer, nullable), `our_score` (integer, nullable), and `opponent_score` (integer, nullable) columns to the `games` table

## 2. TypeScript Types

- [x] 2.1 Add `is_complete: boolean`, `innings_played: number | null`, `our_score: number | null`, and `opponent_score: number | null` to the `Game` interface in `types.ts`

## 3. LineupEditor — Score and Innings Played Fields

- [x] 3.1 Add local state for `ourScore`, `opponentScore`, and `inningsPlayed` in `LineupEditor`, initialised from `game` prop on load
- [x] 3.2 Render "Blue Jays" and "Opponent" integer text fields and an innings played field (1–9, clearable) in the editor header area
- [x] 3.3 Include `our_score`, `opponent_score`, and `innings_played` in the `games` update call inside `handleSave`

## 4. LineupEditor — Greyed Inning Columns

- [x] 4.1 Pass `inningsPlayed` into the grid rendering so that inning columns with index >= `inningsPlayed` receive a disabled/greyed visual style and cannot be clicked
- [x] 4.2 Verify that updating `inningsPlayed` live (changing the field while editing) immediately greys/ungreys the appropriate columns without clearing cell values

## 5. LineupEditor — Mark Complete / Reopen

- [x] 5.1 Add a "Mark Complete" / "Reopen" button to the lineup editor (label toggles based on `game.is_complete`)
- [x] 5.2 Show a visual "Finalized" badge or indicator when the game is already complete
- [x] 5.3 Implement `handleMarkComplete`: run the full save flow, then set `is_complete = true` on the game, then call the stat recompute
- [x] 5.4 Implement `handleReopen`: set `is_complete = false` on the game, then call the stat recompute

## 6. Stat Recompute

- [x] 6.1 Implement a `recomputePlayerStats` function: fetch all games where `is_complete = true`, fetch all lineup entries for those games, iterate over entries and sum sits/infield/outfield innings per player using only positions `[0..innings_played-1]` (or all 9 if `innings_played` is null)
- [x] 6.2 Write the computed totals to `players.sit_count`, `players.outfield_innings`, and `players.infield_innings` (update all players in the roster, zeroing out players with no entries in completed games)
- [x] 6.3 Remove the existing delta stat update block from `handleSave` in `LineupEditor`

## 7. GameManager — Reordered Game List

- [x] 7.1 Update game classification logic: Recent = past + not complete, Upcoming = future, Completed = past + complete (all excluding `default`-tagged games)
- [x] 7.2 Render Recent games always-visible (newest first) above Upcoming
- [x] 7.3 Cap Upcoming at 5 items with an "Show all N upcoming" expand button for the remainder
- [x] 7.4 Render Completed section collapsed by default with a toggle to expand (newest first)
- [x] 7.5 Display score and a "✓ Final" indicator on completed game list items
