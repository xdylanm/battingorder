# Lineup Editor Specification

## Overview
The lineup editor will allow the user to:
- Flag scratches for the game
- Select and order pitchers and assign catchers
- Pre-populate and edit the lineup table for 5 innings, including batting order, positions, and sits
- Apply logic and constraints to optimize fairness and player preferences

## Features & Logic

### 1. Flag Scratches
- Display all players for the game with a checkbox to mark as "scratch" (not available for lineup)
- Scratched players are excluded from all lineup and position assignments

### 2. Select Pitchers and Catchers
- Show a list of players who prefer pitching; allow user to select and order (e.g., Pitcher 1, Pitcher 2)
- For each pitcher, allow assignment of a catcher from the list of players who prefer catching (with option to expand to all active players)
- Multiple pitchers may have the same catcher
- Typical scenario: Pitcher 1 (innings 1-2), Pitcher 2 (innings 3-5)

### 3. Pre-populate Lineup Table
- Use the previous game's batting order as a starting point (or a special "default" game if needed)
- Adjust for scratches: remove scratched players, add returning players at the end
- Assign sits:
  - Only sit players if there are 10+ active
  - Prefer to sit a pitcher the inning before her first appearance (if not starting)
  - Use season sit counts to prioritize who sits
  - Minimize sits per player per game; avoid back-to-back sits
  - If roster is large, allow a player to sit twice, but not consecutively
- Assign positions:
  - Use player position preferences and last lineup as a guide
  - For non-pitchers/catchers, ensure each plays both an infield and outfield position if possible
  - Prefer to keep a player in the same position for consecutive innings
  - Mark sits with an "X" in the table
- Ensure every player in the order has a position or sit for each of the first 5 innings
- No duplicate positions in any inning

### 4. UI Requirements
- Table/grid view
  - Rows = players (batting order)
  - Columns = order, jersey number, name, innings (1-5), 
  - Cells for innings columns contain position or "X"
- Editable batting order (drag-and-drop)
- Editable positions and sits (dropdown or click-to-edit per cell)
- Visual indicators for scratches, sits, and position conflicts
- Section for pitcher/catcher assignment
- Option to save as "default" lineup for future games

## Clarifications (User Feedback)
- The "default" lineup should only be updated when the user chooses.
- To override auto-assigned positions, the user can edit cells in the table. Allow conflicts (e.g. duplicates, missing positions) but flag those with a visual indicator until resolved.
- Leave blank columns for innings 6-9: the user may choose to set positions, but they don't need to be pre-filled.


## Final Decisions
- There will be no "suggest lineup" button; the lineup is pre-populated and then fully user-editable.
- A summary panel will show sit counts and position rotations for fairness review.
- The lineup card will be exportable as a PDF, matching the provided example format.