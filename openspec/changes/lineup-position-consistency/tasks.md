## 1. Scoring Infrastructure

- [x] 1.1 Add `OF_NEIGHBORS` adjacency map (LF↔CF, CF↔RF) to `lineupLogic.ts`
- [x] 1.2 Add `lastPlayedPos` tracking inside `assignPositions` loop, updated after each inning (skipping sits)

## 2. Within-Game Stickiness

- [x] 2.1 Add `+8` same-position stickiness bonus to `score()` using `lastPlayedPos`
- [x] 2.2 Add `+4` OF-neighbor bonus to `score()` using `OF_NEIGHBORS`

## 3. Cross-Game Seeding

- [x] 3.1 Compute `prevGameMostCommon` in `buildLineup` from `prevLineupEntries.positions`, excluding `P`, `X`, and `''`
- [x] 3.2 Pass `prevGameMostCommon` into `assignPositions`
- [x] 3.3 Add `+4` same-position cross-game bonus and `+2` OF-neighbor cross-game bonus to `score()`

## 4. Scaled Balance Bonus

- [x] 4.1 Replace flat `+4` infield/outfield balance bonus with scaled `2 × |imbalance|` formula
