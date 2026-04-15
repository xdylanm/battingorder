## Why

The team used to print a "Blue Jay Fact" on each game card, and players looked forward to reading them. This feature was lost during the move to the digital card system, and the team has specifically asked for it to come back.

## What Changes

- A static list of 30 Blue Jay (bird) facts is added to the codebase
- Each game card PDF export includes a "Blue Jay Fact" panel displayed to the left of the Notes box
- The fact is selected deterministically by hashing the game ID, so the same game always prints the same fact and multiple printed copies are consistent

## Capabilities

### New Capabilities

- `blue-jay-facts`: A fact panel rendered on the game card PDF, showing a short Blue Jay (bird) fact seeded by game ID from a static list of 30 facts

### Modified Capabilities

- `game-finalization`: The PDF export layout changes to accommodate the new Blue Jay Fact panel beside the Notes box

## Impact

- `exportPdf.ts`: Layout change to split the bottom section into two columns (fact left, notes right); new static facts array added to the file or a companion module
- No database changes, no API changes, no new dependencies
