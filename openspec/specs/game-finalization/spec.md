# Spec: Game Finalization

## Purpose

Define how games are finalized after play — capturing final scores, innings played, and completion status — and how that data drives season stat computation and game list organization.

---

## Requirements

### Requirement: Game stores finalization fields
The `games` table SHALL include `is_complete` (boolean, default false), `innings_played` (integer, nullable), `our_score` (integer, nullable), and `opponent_score` (integer, nullable). The `Game` TypeScript interface SHALL reflect these fields.

#### Scenario: New game has default finalization state
- **WHEN** a game is created
- **THEN** `is_complete` is false, and `innings_played`, `our_score`, `opponent_score` are null

#### Scenario: Completed game persists all finalization fields
- **WHEN** a game is marked complete with innings played and scores set
- **THEN** all four fields are persisted to the database and readable on subsequent loads

---

### Requirement: Lineup editor exposes score and innings played inputs
The lineup editor SHALL display two score fields labelled "Blue Jays" and "Opponent" (integer inputs, nullable) and an innings played field (integer input, range 1–9, nullable). These fields SHALL be pre-populated from the loaded game's stored values.

#### Scenario: Fields are empty for a new game
- **WHEN** a game with no finalization data is opened in the lineup editor
- **THEN** score fields and innings played are blank

#### Scenario: Fields are populated for a previously finalized game
- **WHEN** a completed game is opened in the lineup editor
- **THEN** score fields and innings played reflect the stored values

#### Scenario: Innings played can be cleared
- **WHEN** the user clears the innings played field
- **THEN** the field becomes null and all 9 inning columns in the grid are active

---

### Requirement: Inning columns past innings_played are greyed out and non-editable
When `innings_played` is set to a value N (1–9), the lineup editor grid SHALL render inning columns N+1 through 9 in a visually distinct greyed-out style. Cells in those columns SHALL not accept user input. Columns 1 through N remain fully editable.

#### Scenario: Setting innings_played to 5 disables columns 6–9
- **WHEN** the user sets innings played to 5
- **THEN** inning columns 6, 7, 8, and 9 are greyed out and cannot be edited

#### Scenario: Clearing innings_played re-enables all columns
- **WHEN** the user clears the innings played field
- **THEN** all 9 inning columns are active and editable

#### Scenario: Greyed cells do not lose stored data
- **WHEN** innings_played is reduced after data was entered in later innings
- **THEN** the position values in those cells are retained in state but ignored during stat recompute

---

### Requirement: Lineup editor provides Mark Complete / Reopen toggle
The lineup editor SHALL display a button that reads "Mark Complete" when the game is not complete, and "Reopen" when the game is already complete. Activating either button SHALL save the current lineup and game fields, update `is_complete` on the game, and trigger a full season stat recompute for all players.

#### Scenario: Marking a game complete
- **WHEN** the user clicks "Mark Complete"
- **THEN** `is_complete` is set to true, the lineup and game fields are saved, and player stats are recomputed

#### Scenario: Reopening a completed game
- **WHEN** the user clicks "Reopen"
- **THEN** `is_complete` is set to false and player stats are recomputed excluding this game

#### Scenario: Complete indicator is visible in the lineup editor
- **WHEN** a completed game is opened
- **THEN** the editor shows a visual indicator that the game is finalized (e.g., badge or label)

---

### Requirement: Games list displays sections in priority order
The games screen SHALL display games in three ordered sections:
1. **Recent** — past games where `is_complete` is false (always visible, newest first)
2. **Upcoming** — games with a future start time (always visible, soonest first; shows up to 5 with an option to expand)
3. **Completed** — past games where `is_complete` is true (collapsed by default, oldest first or newest first)

#### Scenario: Unfinalized past game appears in Recent section
- **WHEN** a game's start time has passed and `is_complete` is false
- **THEN** it appears in the Recent section, not the Completed section

#### Scenario: Upcoming section is capped at 5 with expand option
- **WHEN** there are more than 5 upcoming games
- **THEN** only the 5 soonest are shown and a button allows expanding to show all

#### Scenario: Completed section is collapsed by default
- **WHEN** the games screen loads
- **THEN** the Completed section is collapsed and requires user interaction to expand

---

### Requirement: Season stats are computed from completed games only
`players.sit_count`, `players.outfield_innings`, and `players.infield_innings` SHALL be computed by summing contributions from all completed games (`is_complete = true`). For each completed game, only innings 1 through `innings_played` (or 1–9 if `innings_played` is null) SHALL be counted. Stats are written to the players table when a game is marked complete or reopened. Stats SHALL NOT be updated on every lineup save.

For each completed game, the system SHALL also compute a **scratch sit credit**: the rounded value of (total sit (`X`) positions across all active-player entries in that game, divided by the number of active players in that game), using standard rounding (round half up). Each player whose lineup entry for that game has `is_scratch = true` SHALL have their `sit_count` incremented by this scratch sit credit. If the game has no active players, the credit is zero.

#### Scenario: Stats reflect only completed games
- **WHEN** player stats are recomputed
- **THEN** incomplete games are excluded from all totals

#### Scenario: Scratch sit credit is zero when no active sits
- **WHEN** a completed game has 9 active players and all 5 innings have no sit (`X`) positions
- **THEN** scratched players receive a scratch sit credit of 0 for that game

#### Scenario: Scratch sit credit is rounded average of active-player sits
- **WHEN** a completed game (5 innings played) has 11 active players who collectively have 10 `X` positions across their inning grids, and 2 players are scratched
- **THEN** scratch sit credit = round(10 / 11) = 1, and each scratched player's `sit_count` is incremented by 1

#### Scenario: Scratch sit credit reverses on Reopen
- **WHEN** a completed game is reopened (set to `is_complete = false`) and stats are recomputed
- **THEN** the scratch sit credit for that game is no longer included, and scratched players' `sit_count` values reflect only the remaining completed games

#### Scenario: innings_played limits which innings are counted
- **WHEN** a game has innings_played = 5 and a player has positions in innings 1–9
- **THEN** only innings 1–5 contribute to that player's stats

#### Scenario: innings_played null means all 9 innings count
- **WHEN** a game has innings_played = null
- **THEN** all 9 positions in each player's lineup entry contribute to stats

#### Scenario: Reopening a game removes its stat contribution
- **WHEN** a game is reopened (is_complete set to false)
- **THEN** player stats are recomputed and that game's innings no longer contribute

#### Scenario: Sit count is derived from positions, not stored sit_count
- **WHEN** the stat recompute runs
- **THEN** sits are counted as innings where the player's position is 'X', within the innings_played range
