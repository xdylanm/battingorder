## 1. Static Facts Data

- [x] 1.1 Create `src/blueJayFacts.ts` exporting a `BLUE_JAY_FACTS: string[]` array with all 30 facts
- [x] 1.2 Add the `hashGameId(id: string): number` helper function to `blueJayFacts.ts` (deterministic string hash, returns index into facts array)

## 2. PDF Layout — Bottom Section

- [x] 2.1 In `exportPdf.ts`, replace the single full-width Notes section with a two-column layout: fact panel (left, ~42% width) and notes panel (right, ~58% width)
- [x] 2.2 Compute the fact panel height: wrap fact text with `splitTextToSize`, calculate line height, enforce minimum of 35mm
- [x] 2.3 Compute the notes panel height: wrap notes text (or use blank box), enforce minimum of 35mm
- [x] 2.4 Set both panels to `Math.max(factH, notesH)` so they share equal height
- [x] 2.5 Render the Blue Jay Fact panel: header label "Blue Jay Fact", border box, wrapped fact text at 8pt
- [x] 2.6 Render the Notes panel at its offset (fact panel width to the right): header label "Notes", border box, notes content (same logic as current implementation)
- [x] 2.7 Import `BLUE_JAY_FACTS` and `hashGameId` from `blueJayFacts.ts` in `exportPdf.ts`
