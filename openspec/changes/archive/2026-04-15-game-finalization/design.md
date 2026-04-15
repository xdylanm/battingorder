## Context

The app currently has no way to record when a game is finished, what the final score was, or how many innings were played. Player season stats (`sit_count`, `outfield_innings`, `infield_innings`) are updated as a delta on every lineup save, which causes double-counting and makes the numbers unreliable. The goal is to introduce a formal finalization step that triggers a clean stat recompute.

The app is a React + TypeScript SPA using Supabase as the backend. UI is MUI. Lineup data is stored in a `lineup` table with one row per player per game, containing a `positions` array of length 9.

## Goals / Non-Goals

**Goals:**
- Add four new columns to `games`: `is_complete`, `innings_played`, `our_score`, `opponent_score`
- Surface score, innings played, and a Mark Complete / Reopen button in the lineup editor
- Grey out and disable inning columns beyond `innings_played` in the lineup grid
- Reorder the games list into Recent (unfinalized past) → Upcoming → Completed
- Replace the delta-on-save stat update with a recompute-on-finalize that reads all completed games

**Non-Goals:**
- Real-time collaboration or multi-user conflict handling
- Historical stat tracking per-game (stats are always a season aggregate on the player row)
- Migrating existing player stat rows — they start at 0 and accumulate as games are finalized going forward

## Decisions

### 1. Stat recompute scans all completed games from the database

**Decision:** When a game is marked complete or reopened, fetch all games where `is_complete = true`, then fetch all lineup entries for those games in one query, then compute totals per player and upsert to the `players` table.

**Rationale:** Recomputing from source data is idempotent — reopening and re-finalizing a game always yields the same result. The current delta approach is broken (double-counts on repeated saves). For a season (~30–40 games, ~15 players), the full scan is trivially fast.

**Alternative considered:** Track a "has been stat-counted" flag per lineup row and only apply the delta once. Rejected because it adds per-row state that must stay in sync and doesn't handle retroactive corrections (e.g., fixing innings_played after the fact).

### 2. Sit count is re-derived from positions, not from stored lineup.sit_count

**Decision:** During stat recompute, count sits as innings where `positions[i] === 'X'` within the `innings_played` range. The `lineup.sit_count` column is kept as a display convenience but is not the canonical source for season totals.

**Rationale:** `lineup.sit_count` was computed over all 9 innings regardless of how many were actually played. Using positions directly lets `innings_played` naturally limit what counts.

### 3. Greyed inning columns retain their data in state

**Decision:** When `innings_played` is reduced, cells in disabled columns are rendered as non-interactive but their values remain in the `grid` state and are saved to the database. The recompute ignores them.

**Rationale:** Avoids accidental data loss if the coach sets innings_played mid-game and then changes their mind. The state is always the full 9-slot array; only the view and stat logic are gated by `innings_played`.

### 4. Mark Complete saves lineup + game fields atomically before toggling is_complete

**Decision:** The "Mark Complete" handler runs the full save flow (delete + re-insert lineup rows, update games row) and only then sets `is_complete = true` and triggers the stat recompute. The "Reopen" handler sets `is_complete = false` first, then recomputes.

**Rationale:** Ensures stats are always computed against the current lineup state, not a stale saved state. If the save fails, `is_complete` is never toggled.

### 5. Game list sections use is_complete + starttime to classify games

**Decision:** 
- **Recent**: `starttime < now AND is_complete = false`
- **Upcoming**: `starttime >= now` (up to 5 shown, expand for rest)
- **Completed**: `starttime < now AND is_complete = true` (collapsed)

The `default`-tagged game is excluded from all sections (existing behaviour).

**Rationale:** Matches the user's mental model — a game you played yesterday but haven't finalized still needs attention, so it stays visible.

### 6. Score fields use our_score / opponent_score (two integer fields)

**Decision:** Two separate integer columns rather than a free-text score field. The "Blue Jays" label is hardcoded in the UI for the home team score.

**Rationale:** Structured data allows computed display (e.g., W/L) in future. Free text is flexible but loses meaning.

## Risks / Trade-offs

- **Recompute on large seasons**: If a team has many seasons of data in the same database, the recompute scans all completed games ever. Mitigation: filter by season tag if needed in a future change; not a concern for current usage.
- **is_complete toggled without lineup saved**: If a network error occurs mid-save, lineup and is_complete could be out of sync. Mitigation: Decision 4 (save before toggle) minimises the window; a visible save error prevents the toggle from proceeding.
- **Existing player stats**: Current `sit_count`, `outfield_innings`, `infield_innings` values may be 0, null, or incorrectly double-counted. These will remain unchanged until the first game is finalized, at which point they will be overwritten by the recompute. Coaches should be aware stats effectively reset on first finalization.

## Migration Plan

1. Run SQL migration in Supabase to add four columns to `games`:
   ```sql
   ALTER TABLE games
     ADD COLUMN is_complete boolean NOT NULL DEFAULT false,
     ADD COLUMN innings_played integer,
     ADD COLUMN our_score integer,
     ADD COLUMN opponent_score integer;
   ```
2. Deploy updated app. No data migration needed — existing games are unfinalized by default.
3. Remove the delta stat update code from `handleSave` in `LineupEditor.tsx`.

## Open Questions

- Should the Completed games section show newest-first or oldest-first? (Defaulting to newest-first so the most recent completed game is easiest to find.)
- Should "Mark Complete" be available even if innings_played is not set? (Defaulting to yes — score and innings are optional metadata.)
