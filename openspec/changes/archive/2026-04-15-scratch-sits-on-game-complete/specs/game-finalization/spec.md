## MODIFIED Requirements

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
