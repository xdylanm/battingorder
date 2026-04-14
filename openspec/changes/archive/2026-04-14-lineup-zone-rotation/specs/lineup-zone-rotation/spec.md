## ADDED Requirements

### Requirement: 2nd pitcher and 2nd catcher anchor pattern
When the active roster has 10 or more players, the 2nd pitcher and 2nd catcher SHALL be assigned a fixed structural pattern before any other field assignments:
- 2nd pitcher: outfield in inning 1, sit (X) in inning 2, pitcher (P) in innings 3–5
- 2nd catcher: sit (X) in inning 1, outfield in inning 2, catcher (C) in innings 3–5

The outfield positions assigned to the 2nd pitcher (inning 1) and 2nd catcher (inning 2) SHALL be the same outfield position, chosen from the set of outfield positions (LF, CF, or RF) excluding any positions that one or both of the players has marked as 'avoid'. If the set is empty, they should both be assigned to RF.

#### Scenario: Both anchors assigned distinct preferred OF positions
- **WHEN** N ≥ 10, 2nd pitcher prefers LF, 2nd catcher prefers RF
- **THEN** 2nd pitcher grid is `["CF","X","P","P","P"]` and 2nd catcher grid is `["X","CF","C","C","C"]`

#### Scenario: Both anchors prefer the same OF position
- **WHEN** N ≥ 10, 2nd pitcher prefers CF, 2nd catcher prefers CF
- **THEN** 2nd pitcher is assigned CF, 2nd catcher is assigned CF

#### Scenario: Roster smaller than 10
- **WHEN** N < 10
- **THEN** no anchor pattern is applied; 2nd pitcher and 2nd catcher are assigned positions and sits through normal distribution

---

### Requirement: Baton-pass position pool for inning-1 sitters
For each player sitting in inning 1 (beyond the 2nd catcher anchor), the system SHALL reserve that player's preferred field position (or a neutral position if no preference is available) for innings 2 and 3 of that player ("position group A"). For each player sitting in inning 2 (beyond the 2nd pitcher anchor), the system SHALL assign them a position from position group A in inning 1, ensuring no duplicate positions within the inning.

#### Scenario: Group A player has a preferred position available
- **WHEN** a player sits inning 1, their preferred position is not already claimed for innings 2–3
- **THEN** that position is reserved for innings 2 and 3 for that player, and a Group B sitter is assigned that position in inning 1

#### Scenario: Group A player preferred position already claimed
- **WHEN** a player sits inning 1, their preferred position is already reserved by another Group A entry
- **THEN** the system assigns the next available non-avoided position and adds it to the pool

#### Scenario: Group B player has avoid constraint on their pool position
- **WHEN** a Group B player (sitting inning 2) is assigned a Group A position they have in their avoid list
- **THEN** the assignment is made anyway but the cell is visually flagged as a constraint violation

---

### Requirement: Same-position consecutive-inning pairs for innings 1–2
All players not part of the anchor rows and not covered by the baton-pass pool SHALL be assigned the same field position for both inning 1 and inning 2. Position assignment SHALL respect the player's preferred and avoid lists; avoid-list violations are flagged visually.

#### Scenario: Player has no sitting conflict and a preferred position available
- **WHEN** a player is active in both innings 1 and 2, their preferred position is not yet taken
- **THEN** they are assigned that position in both inning 1 and inning 2

#### Scenario: All preferred positions taken
- **WHEN** a player's preferred positions are all claimed for the inning pair
- **THEN** any non-avoided available position is chosen for both innings

---

### Requirement: Zone-flip for innings 3–5
Players who played outfield in innings 1 or 2 ("OF-early") SHALL be assigned infield positions in innings 3–5. Players who played infield in innings 1 or 2 ("IF-early") SHALL be assigned outfield positions in innings 3–5. Zone assignments SHALL form consecutive-inning pairs wherever possible (i.e., same position in back-to-back innings).

When the number of available outfield slots in innings 3–5 is insufficient to give every IF-early player an outfield rotation, priority SHALL be given to players with the lowest season `outfield_innings` count.

If infield/outfield balance is impossible for a player (no outfield slot available), that player SHALL be assigned an additional infield position.

Positions within the target zone SHALL respect the player's preferred and avoid lists.

#### Scenario: Sufficient OF slots for all IF-early players
- **WHEN** N = 9 (no sits), every player who played infield in innings 1–2 can flip to outfield
- **THEN** all IF-early players are assigned outfield positions in innings 3–5

#### Scenario: Insufficient OF slots, season balance used
- **WHEN** only 2 OF slots are available in innings 3–5 but 4 players need the flip
- **THEN** the 2 players with the lowest `outfield_innings` receive outfield assignments; the other 2 are assigned infield

#### Scenario: Player who sat inning 1 or 2 zone-flip
- **WHEN** an OF-early player (played OF in inning 1) sits in inning 3
- **THEN** the zone-flip assignment applies to their next active inning (inning 4 or 5)

---

### Requirement: Season outfield/infield innings counters
The system SHALL track `outfield_innings` and `infield_innings` per player as integer season counters on the `Player` record. These counters SHALL be incremented when a game lineup is saved, counting the number of innings each player spent in each zone (excluding P, C, X, and empty slots). These counters are used to break ties in zone-flip priority.

#### Scenario: Counters incremented on save
- **WHEN** a coach saves a game lineup where player A played 2 infield innings and 3 outfield innings
- **THEN** `player_A.infield_innings` increases by 2 and `player_A.outfield_innings` increases by 3

#### Scenario: P/C/X innings not counted
- **WHEN** a player's positions array contains `["P","P","X","LF","LF"]`
- **THEN** only 2 outfield innings are counted; pitcher and sit innings are excluded

---

### Requirement: Retirement of cross-game stickiness scoring
The system SHALL NOT apply a cross-game position-stickiness bonus (`prevGameMostCommon`) to position scoring. The `prevLineupEntries` data may still be used for batting order seeding but SHALL NOT influence field position assignment.

#### Scenario: Same inputs, no stickiness effect
- **WHEN** buildLineup is called with a `prevLineupEntries` record where player A always played SS
- **THEN** player A's position assignments are determined solely by preferences, zone-flip rules, and `outfield_innings` balance — not by SS appearing in previous games
