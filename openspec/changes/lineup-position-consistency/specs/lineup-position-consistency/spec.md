## ADDED Requirements

### Requirement: Within-game position stickiness
The lineup generator SHALL score a player's current-inning position assignment higher when it matches or is adjacent (outfield only) to the position they last played in the same game. Sits SHALL NOT reset the last-played position.

#### Scenario: Player stays in same position
- **WHEN** a player was assigned SS in inning 1
- **THEN** SS receives a stickiness bonus (+8) in inning 2 scoring

#### Scenario: Sit does not reset stickiness
- **WHEN** a player was assigned 2B in inning 1 and sits in inning 2
- **THEN** 2B receives a stickiness bonus (+8) in inning 3 scoring

#### Scenario: Adjacent outfield gets partial stickiness
- **WHEN** a player was assigned CF in inning 1
- **THEN** LF and RF each receive a neighbor bonus (+4) in inning 2 scoring

#### Scenario: No adjacency across outfield extremes
- **WHEN** a player was assigned LF in inning 1
- **THEN** RF receives no stickiness bonus in inning 2

#### Scenario: No infield adjacency
- **WHEN** a player was assigned SS in inning 1
- **THEN** no infield position other than SS receives a stickiness bonus

### Requirement: Cross-game position seeding
The lineup generator SHALL seed each player's position preference for a new game based on their most common non-pitcher field position from the previous game's lineup entries. Players who primarily pitched in the previous game SHALL receive no cross-game seed.

#### Scenario: Previous game seed applied
- **WHEN** a player's most common position in the previous game was 3B
- **THEN** 3B receives a cross-game bonus (+4) in inning 1 scoring of the current game

#### Scenario: Previous game adjacent seed applied
- **WHEN** a player's most common position in the previous game was CF
- **THEN** LF and RF each receive a cross-game neighbor bonus (+2) in inning 1 scoring

#### Scenario: Pitcher role excluded from cross-game seed
- **WHEN** a player's position array from the previous game contains only P entries
- **THEN** no cross-game position seed is applied for that player

### Requirement: Scaled infield/outfield balance bonus
The infield/outfield balance bonus SHALL scale with the magnitude of the current imbalance (2 × |imbalance| per zone) rather than being a flat value, so that small imbalances do not override stickiness but large imbalances do.

#### Scenario: Small imbalance does not override stickiness
- **WHEN** a player has played 1 more infield inning than outfield
- **THEN** the outfield balance bonus is +2, which does not override the +8 stickiness bonus

#### Scenario: Large imbalance overrides stickiness
- **WHEN** a player has played 4 more infield innings than outfield
- **THEN** the outfield balance bonus is +8, which matches the stickiness bonus and balance takes priority
