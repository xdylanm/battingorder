## Context

The game card PDF is generated entirely in `exportPdf.ts` using jsPDF. The current bottom section of the card has a "Notes" section — either a filled text box or a blank 35mm box — that takes the full content width. The team wants a Blue Jay Fact displayed on every game card. We explored the options in design discovery and aligned on a two-column bottom section with the fact on the left and notes on the right.

The fact list will be static (30 facts), selected deterministically by game ID so that multiple prints of the same game card always show the same fact.

## Goals / Non-Goals

**Goals:**
- Add a Blue Jay Fact panel to the bottom-left of the game card PDF, beside the Notes box
- 30 static facts, each 2-3 sentences
- Fact selection seeded by game ID (same game → same fact, always)
- Both panels share the same height so the layout is visually consistent

**Non-Goals:**
- Dynamic or editable facts (no DB changes)
- User-selectable facts
- Changing any other section of the card layout
- Displaying facts anywhere other than the PDF export

## Decisions

### 1. Static fact list in source code

**Decision:** A `const BLUE_JAY_FACTS: string[]` array defined directly in `exportPdf.ts` (or a thin companion module `blueJayFacts.ts` imported by it).

**Alternatives considered:**
- DB table: unnecessary complexity for static content that never changes at runtime
- Config file (JSON/YAML): indirection with no benefit for a 30-item static list

**Rationale:** Simple, zero-dependency, no network calls, facts travel with the codebase.

### 2. Deterministic selection via game ID hash

**Decision:** Use a simple deterministic string hash of `game.id` modulo 30 to pick the fact index.

```
function hashGameId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
factIndex = hashGameId(game.id) % BLUE_JAY_FACTS.length
```

**Alternatives considered:**
- Random on export: different copies of the same game card get different facts — confusing
- Sequential by game number: requires knowing game sequence, fragile

**Rationale:** Game IDs are UUIDs — good entropy. Deterministic means any reprint is identical.

### 3. Side-by-side layout (fact left, notes right)

**Decision:** Split the bottom section into two columns at approximately 42% / 58% of the content width. Fact panel on the left, Notes on the right. Both panels rendered at the same height (max of the two natural heights, minimum ~35mm).

**Alternatives considered:**
- Fact below notes: risks pushing off the page if notes are long
- Fact inside notes box footer: hard to distinguish visually, less prominent

**Rationale:** Makes the fact a first-class element visually. The notes box currently wastes horizontal space.

### 4. Text wrapping for fact content

**Decision:** Use `doc.splitTextToSize()` (already used elsewhere in the file for notes) to wrap the fact text within the fact panel width. Font: helvetica normal 8pt, consistent with other body text.

## Risks / Trade-offs

- **Long notes pushing layout off page** → Both panels share the same height, so an unusually long notes entry could make the fact panel taller than its content warrants. Mitigation: enforce a minimum height of 35mm; the notes box already handles long text with splitTextToSize.
- **Fact panel too narrow for 2-3 sentence facts at 8pt** → At ~79mm wide with 2mm padding each side, roughly 75mm of text width at 8pt fits ~8-9 words per line. A 2-sentence fact is ~50-70 words → ~6-9 lines → ~30-45mm tall. This fits comfortably. Verified against jsPDF's character-per-mm at 8pt.
- **Hash collision patterns** → With 30 facts and UUID game IDs, distribution is effectively uniform. Not a meaningful risk.

## Migration Plan

No data migration required. The change is purely additive to `exportPdf.ts`. Existing PDFs are unaffected; the new layout applies on next export.
