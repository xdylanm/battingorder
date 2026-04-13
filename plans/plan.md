## Plan: Softball Game Card Web App (Supabase + React)

A web application to generate, manage, and export softball game cards, supporting lineup constraints, player preferences, and easy sharing. The app will be modern, responsive, and easy to deploy and maintain.

---

**Steps**

### Phase 1: Requirements & Design
1. Clarify any remaining requirements (see "Further Considerations" below).
2. Define data models:
   - Player (name, preferred positions, avoid positions, sit count, scratch status, etc.)
   - Game (date, location, opponent, start time, roster, lineup, notes)
   - Lineup (per-inning positions, batting order, sits)
3. Design UI wireframes for:
   - Roster management (add/edit players, preferences, scratch)
   - Game setup (opponent, location, time, roster selection)
   - Lineup editor (drag-and-drop batting order, per-inning positions, sits)
   - Game card preview/export (PDF)
   - Game sheet sharing (link generation)

### Phase 2: Tech Stack & Project Setup
4. Choose stack:
   - Frontend: React (with Material UI or similar for modern look)
   - Backend: Supabase (managed Postgres DB, Google Auth, RESTful API)
   - PDF export: jsPDF or pdfmake (client-side)
   - Deployment: Vercel/Netlify (for static hosting)
5. Scaffold project structure (frontend, Supabase integration, shared types).

### Phase 3: Core Features Implementation
6. Implement player management (CRUD, preferences, sit tracking).
7. Implement game creation (details, roster selection, scratch designation).
8. Build lineup editor:
   - Drag-and-drop batting order (react-beautiful-dnd)
   - Per-inning position assignment (with constraints: rotation, preferences, sits)
   - Visual indicators for sits, scratches, and position assignments
9. Implement PDF export of game card (matching example layout).
10. Add responsive design for mobile usability.

### Phase 4: Persistence & Sharing
11. Implement persistent storage (Supabase DB, Google Auth).
12. Enable saving and loading of game sheets.
13. Implement shareable game sheet links (read-only view for others).

### Phase 5: Polish & Verification
14. Add validation, error handling, and user feedback.
15. Test on desktop and mobile.
16. User acceptance testing with real data.
17. Prepare deployment and documentation.

---

**Relevant files**
- `src/components/PlayerManager.tsx` — Player CRUD, preferences UI
- `src/components/GameSetup.tsx` — Game details form
- `src/components/LineupEditor.tsx` — Batting order, positions, sits
- `src/components/GameCardPreview.tsx` — PDF preview/export
- `src/pages/ShareGameSheet.tsx` — Read-only shared view
- `supabase/tables.sql` — Data models

---

**Verification**
1. Create a game card with realistic constraints and export as PDF.
2. Confirm lineup editor enforces position rotation, preferences, and sits.
3. Test drag-and-drop batting order on desktop and mobile.
4. Mark a player as scratch and verify exclusion from lineup.
5. Share a game sheet link and verify read-only access.
6. Persist and reload player/game data across sessions.

---

**Decisions**
- Stack: React + Supabase, jsPDF for PDF export, Vercel/Netlify for deployment.
- Responsive, modern UI with Material UI.
- Focus on ease of use and deployment.
- Shareable links for game sheets.

---

**Further Considerations**
1. **Authentication:** Use Google account login (Supabase Auth).
2. **Player Data:** Only track lineup, positions, and sits (no performance stats).
3. **Season Management:** Track sits across all games in the season for fairness.
