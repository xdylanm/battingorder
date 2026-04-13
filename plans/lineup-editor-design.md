# Lineup Editor Design Document

## 1. Data Model

### Entities
- **Player** (from `players` table)
  - id, name, jersey_number, preferred_positions, avoid_positions, sit_count
- **Game** (from `games` table)
  - id, starttime, location, opponent, tags
- **Lineup** (from `lineup` table)
  - id, game_id, player_id, is_scratch, batting_order, sit_count, positions (text[]), notes

### In-Memory Structures
- **ActivePlayers**: List of players not scratched for the game, ordered by batting_order
- **Pitchers**: Array of selected pitcher player_ids, ordered (e.g., [pitcher1, pitcher2])
- **Catchers**: Map of pitcher player_id to catcher player_id
- **LineupGrid**: 2D array [player][inning] = position | 'X' (sit) | '' (unassigned)
- **Summary**: Object with sit counts, position rotation stats, and conflict flags

## 2. Logic Flow

### a. Initialization
- Fetch players, game, and lineup data for the selected game
- Pre-populate scratches, pitchers, catchers, and batting order
- If previous game/default lineup exists, use as template (adjust for scratches/returns)

### b. Pitcher/Catcher Assignment
- Show list of eligible pitchers (prefer pitching)
- User selects and orders pitchers (e.g., Pitcher 1, Pitcher 2)
- For each pitcher, user assigns a catcher (prefer catching, but can expand to all)

### c. Lineup Table Pre-population
- Use previous batting order, remove scratches, add returning players at end
- Assign sits:
  - Only if 10+ active
  - Prefer to sit pitcher before first appearance (if not starting)
  - Use season sit counts to prioritize
  - Avoid back-to-back sits
  - If needed, allow a player to sit twice, but not consecutively
- Assign positions:
  - Use preferences and last lineup as guide
  - Non-pitchers/catchers: try to assign both infield and outfield in 5 innings
  - Prefer consecutive innings at same position
  - Mark sits as 'X'
- Ensure every player has a position or sit for innings 1-5
- No duplicate positions in any inning
- Leave innings 6-9 blank

### d. Manual Editing
- User can drag-and-drop to reorder batting
- User can click/edit any cell to change position or sit
- Allow conflicts (duplicates, missing positions), but flag visually

### e. Summary Panel
- Show sit counts for this game and season
- Show position rotation stats (e.g., infield/outfield balance)
- List any conflicts (e.g., duplicate positions, missing assignments)

### f. Save/Export
- Save lineup to DB (lineup table)
- Option to save as new default lineup
- Export as PDF (matching example format)

## 3. UI Structure

- **Scratch Selector**: List of all players with checkboxes
- **Pitcher/Catcher Assignment**: Ordered list of pitchers, dropdown for catchers
- **Lineup Table**: Editable grid (rows: players, columns: innings 1-9)
  - Drag-and-drop for batting order
  - Click-to-edit for positions/sits
  - Visual flags for conflicts
- **Summary Panel**: Sits, rotations, conflicts
- **Actions**: Save, Save as Default, Export PDF

