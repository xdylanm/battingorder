## ADDED Requirements

### Requirement: Game card PDF includes a Blue Jay Fact panel
The game card PDF export SHALL include a "Blue Jay Fact" panel displayed to the left of the Notes box at the bottom of the card. The panel SHALL display a 2–3 sentence fact about the Blue Jay (bird) selected from a static list of 30 facts. The fact displayed for a given game SHALL be determined deterministically by hashing the game's ID, so that the same game always produces the same fact regardless of when or how many times the PDF is exported.

#### Scenario: PDF export renders the Blue Jay Fact panel
- **WHEN** the user exports a game card to PDF
- **THEN** the bottom section of the card shows a "Blue Jay Fact" panel on the left and the Notes panel on the right

#### Scenario: Same game always shows the same fact
- **WHEN** the same game's PDF is exported multiple times
- **THEN** the same Blue Jay Fact appears on every export

#### Scenario: Different games show different facts
- **WHEN** two games with different IDs are exported
- **THEN** the Blue Jay Fact shown on each card MAY differ (distributed across the 30-fact list by game ID hash)

### Requirement: Blue Jay Fact and Notes panels share the same height
The Blue Jay Fact panel and the Notes panel SHALL be rendered at the same height, equal to whichever panel requires more vertical space, with a minimum height of 35mm. This ensures the two-column bottom section appears visually balanced.

#### Scenario: Notes content is taller than the fact
- **WHEN** the notes text requires more vertical space than the fact text
- **THEN** both panels are rendered at the notes content height

#### Scenario: Fact content is taller than the notes
- **WHEN** the fact text requires more vertical space than the notes content
- **THEN** both panels are rendered at the fact content height

#### Scenario: Minimum height is enforced when both panels are short
- **WHEN** both the notes and fact content are shorter than 35mm
- **THEN** both panels are rendered at 35mm

### Requirement: Blue Jay Fact panel occupies the left column of the bottom section
The bottom section of the game card SHALL be divided into two columns: the Blue Jay Fact panel on the left (approximately 42% of content width) and the Notes panel on the right (approximately 58% of content width). The fact text SHALL be wrapped to fit within the panel width.

#### Scenario: Fact panel is rendered left of notes
- **WHEN** the game card PDF is generated
- **THEN** the Blue Jay Fact panel appears to the left of the Notes panel in the bottom section of the card

#### Scenario: Fact text wraps within panel bounds
- **WHEN** the fact text is longer than the panel width
- **THEN** the text wraps to multiple lines and remains within the panel boundary
