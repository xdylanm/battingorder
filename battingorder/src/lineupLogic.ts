import type { Player, LineupEntry, PitcherAssignment } from './types';

const INFIELD = ['1B', '2B', '3B', 'SS'];
const OUTFIELD = ['LF', 'CF', 'RF'];
const INFIELD_SET = new Set(INFIELD);
const OUTFIELD_SET = new Set(OUTFIELD);
const OF_NEIGHBORS: Record<string, string[]> = {
  LF: ['CF'],
  CF: ['LF', 'RF'],
  RF: ['CF'],
};

// Returns the last inning index (exclusive, 0-based) for a given pitcher
function getPitcherEndInning(pa: PitcherAssignment, allPitchers: PitcherAssignment[]): number {
  const sorted = [...allPitchers].sort((a, b) => a.startInning - b.startInning);
  const idx = sorted.findIndex(p => p.pitcherId === pa.pitcherId && p.startInning === pa.startInning);
  if (idx >= 0 && idx < sorted.length - 1) return sorted[idx + 1].startInning - 1;
  return 5; // last pitcher goes through inning 5
}

// Build inning-to-pitcher and inning-to-catcher maps (0-based inning)
function buildPitchingSchedule(pitcherAssignments: PitcherAssignment[]): {
  pitcherForInning: Record<number, string>;
  catcherForInning: Record<number, string>;
} {
  const pitcherForInning: Record<number, string> = {};
  const catcherForInning: Record<number, string> = {};
  for (const pa of pitcherAssignments) {
    const end = getPitcherEndInning(pa, pitcherAssignments);
    for (let inn = pa.startInning - 1; inn < end; inn++) {
      pitcherForInning[inn] = pa.pitcherId;
      catcherForInning[inn] = pa.catcherId;
    }
  }
  return { pitcherForInning, catcherForInning };
}

// Staged lineup grid builder.
//
// Stage 1 – commit pitchers, catchers, and mandatory pre-pitcher sits.
// Stage 2 – assign sits + field positions for innings 0-1.
// Stage 3 – pre-assign inning 2 for players who sat in exactly one of innings 0-1
//           (gives them two consecutive playing innings in the same position).
// Stage 4 – greedily complete innings 2-4 (respects pre-assignments).
function buildGrid(
  orderedIds: string[],
  N: number,
  pitcherForInning: Record<number, string>,
  catcherForInning: Record<number, string>,
  playerMap: Record<string, Player>,
  prevGameMostCommon: Record<string, string>,
): { grid: Record<string, string[]>; gameSitCounts: Record<string, number> } {
  const sitsPerInning = Math.max(0, N - 9);

  const grid: Record<string, string[]> = {};
  orderedIds.forEach(id => { grid[id] = Array(9).fill(''); });

  const gameSitCounts: Record<string, number> = {};
  orderedIds.forEach(id => { gameSitCounts[id] = 0; });

  const infieldCount: Record<string, number> = {};
  const outfieldCount: Record<string, number> = {};
  const lastPlayedPos: Record<string, string> = {};
  orderedIds.forEach(id => { infieldCount[id] = 0; outfieldCount[id] = 0; });

  const score = (id: string, pos: string): number => {
    const player = playerMap[id];
    let s = 0;
    if (player?.preferred_positions?.includes(pos)) s += 10;
    if (player?.avoid_positions?.includes(pos)) s -= 10;
    const last = lastPlayedPos[id];
    if (last) {
      if (pos === last) s += 5;
      else if (OF_NEIGHBORS[last]?.includes(pos)) s += 4;
    }
    const prevCommon = prevGameMostCommon[id];
    if (prevCommon) {
      if (pos === prevCommon) s += 4;
      else if (OF_NEIGHBORS[prevCommon]?.includes(pos)) s += 2;
    }
    const imbalance = infieldCount[id] - outfieldCount[id];
    if (INFIELD_SET.has(pos) && imbalance < 0) s += 3 * Math.abs(imbalance);
    if (OUTFIELD_SET.has(pos) && imbalance > 0) s += 3 * imbalance;
    return s;
  };

  // ── STAGE 1 ──────────────────────────────────────────────────────────────
  for (let inn = 0; inn < 5; inn++) {
    const pId = pitcherForInning[inn];
    const cId = catcherForInning[inn];
    if (pId && grid[pId][inn] === '') grid[pId][inn] = 'P';
    if (cId && grid[cId][inn] === '') grid[cId][inn] = 'C';
  }
  // Mandatory pre-pitcher sit: pitcher starting after inning 0 sits the inning before (N >= 10)
  if (N >= 10 && sitsPerInning > 0) {
    for (let inn = 1; inn < 5; inn++) {
      const nextPitcher = pitcherForInning[inn];
      if (!nextPitcher) continue;
      if (pitcherForInning[inn - 1] === nextPitcher) continue; // already pitching
      const sitInn = inn - 1;
      if (grid[nextPitcher][sitInn] === '' && (sitInn === 0 || grid[nextPitcher][sitInn - 1] !== 'X')) {
        grid[nextPitcher][sitInn] = 'X';
        gameSitCounts[nextPitcher]++;
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function doSits(inn: number): void {
    if (sitsPerInning === 0) return;
    const alreadySitting = orderedIds.filter(id => grid[id][inn] === 'X').length;
    const need = Math.max(0, sitsPerInning - alreadySitting);
    if (need === 0) return;
    const cannotSit = new Set<string>();
    // Already assigned this inning (P, C, pre-sit, pre-assigned field)
    orderedIds.forEach(id => { if (grid[id][inn] !== '') cannotSit.add(id); });
    // No back-to-back sits
    if (inn > 0) orderedIds.forEach(id => { if (grid[id][inn - 1] === 'X') cannotSit.add(id); });
    const eligible = orderedIds
      .filter(id => !cannotSit.has(id))
      .map(id => ({ id, seasonSits: playerMap[id]?.sit_count ?? 0, gameSits: gameSitCounts[id] }))
      .sort((a, b) => b.seasonSits !== a.seasonSits ? b.seasonSits - a.seasonSits : a.gameSits - b.gameSits);
    for (let i = 0; i < need && i < eligible.length; i++) {
      grid[eligible[i].id][inn] = 'X';
      gameSitCounts[eligible[i].id]++;
    }
  }

  function doPositions(inn: number): void {
    // Update counts/lastPlayed for positions already committed in this inning
    for (const id of orderedIds) {
      const pos = grid[id][inn];
      if (pos && pos !== '' && pos !== 'X' && pos !== 'P' && pos !== 'C') {
        if (INFIELD_SET.has(pos)) infieldCount[id]++;
        if (OUTFIELD_SET.has(pos)) outfieldCount[id]++;
        lastPlayedPos[id] = pos;
      }
    }
    const fieldPlayers = orderedIds.filter(id => grid[id][inn] === '');
    if (fieldPlayers.length === 0) {
      for (const id of orderedIds) {
        const pos = grid[id][inn];
        if (pos && pos !== 'X' && pos !== '') lastPlayedPos[id] = pos;
      }
      return;
    }
    // Total active fielders this inning (determines whether RF is included)
    const totalFielders = orderedIds.filter(id => {
      const pos = grid[id][inn];
      return pos !== 'X' && pos !== 'P' && pos !== 'C';
    }).length;
    const takenPositions = new Set(
      orderedIds.map(id => grid[id][inn]).filter(p => p && p !== '' && p !== 'X' && p !== 'P' && p !== 'C'),
    );
    const allFieldPositions = totalFielders <= 6 ? [...INFIELD, 'LF', 'CF'] : [...INFIELD, ...OUTFIELD];
    const remaining = allFieldPositions.filter(p => !takenPositions.has(p));
    const sorted = [...fieldPlayers].sort((a, b) => {
      const aOk = remaining.filter(p => score(a, p) >= 0).length;
      const bOk = remaining.filter(p => score(b, p) >= 0).length;
      return aOk - bOk;
    });
    for (const id of sorted) {
      if (remaining.length === 0) break;
      const best = [...remaining].sort((a, b) => score(id, b) - score(id, a))[0];
      if (best !== undefined) {
        grid[id][inn] = best;
        remaining.splice(remaining.indexOf(best), 1);
        if (INFIELD_SET.has(best)) infieldCount[id]++;
        if (OUTFIELD_SET.has(best)) outfieldCount[id]++;
        lastPlayedPos[id] = best;
      }
    }
    for (const id of orderedIds) {
      const pos = grid[id][inn];
      if (pos && pos !== 'X' && pos !== '') lastPlayedPos[id] = pos;
    }
  }

  // ── STAGE 2: innings 0-1 ─────────────────────────────────────────────────
  for (let inn = 0; inn < 2; inn++) {
    doSits(inn);
    doPositions(inn);
  }

  // ── STAGE 3: pre-assign inning 2 for stage-2 sitters ─────────────────────
  // A player who sat in exactly one of innings 0-1 gets their other-inning
  // position locked into inning 2, giving them two consecutive play innings
  // in the same position (e.g. ["CF","X","CF"] or ["X","CF","CF"]).
  const claimedInn2 = new Set<string>(
    orderedIds.map(id => grid[id][2]).filter(p => p && p !== '' && p !== 'X'),
  );
  const isFieldPos = (p: string) => p && p !== '' && p !== 'X' && p !== 'P' && p !== 'C';
  for (const id of orderedIds) {
    if (grid[id][2] !== '') continue;
    const sat0 = grid[id][0] === 'X';
    const sat1 = grid[id][1] === 'X';
    if (sat0 === sat1) continue; // sat both or neither — no extension
    const srcPos = sat0 ? grid[id][1] : grid[id][0];
    if (!isFieldPos(srcPos)) continue;
    if (claimedInn2.has(srcPos)) continue;
    grid[id][2] = srcPos;
    claimedInn2.add(srcPos);
  }

  // ── STAGE 4: innings 2-4 (greedy, respects pre-assignments) ──────────────
  for (let inn = 2; inn < 5; inn++) {
    doSits(inn);
    doPositions(inn);
  }

  return { grid, gameSitCounts };
}

export interface BuildLineupResult {
  battingOrder: string[];
  grid: Record<string, string[]>;
  gameSitCounts: Record<string, number>;
}

export function buildLineup(
  allPlayers: Player[],
  scratchIds: Set<string>,
  pitcherAssignments: PitcherAssignment[],
  prevLineupEntries: LineupEntry[] | null,
  overrideOrder?: string[],
): BuildLineupResult {
  const activePlayers = allPlayers.filter(p => !scratchIds.has(p.id));
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

  // Batting order: use override if provided, else use previous, else default
  let battingOrder: string[];
  if (overrideOrder) {
    const existingActive = overrideOrder.filter(id => activePlayers.some(p => p.id === id));
    const newIds = activePlayers.filter(p => !existingActive.includes(p.id)).map(p => p.id);
    battingOrder = [...existingActive, ...newIds];
  } else if (prevLineupEntries && prevLineupEntries.length > 0) {
    const prevOrdered = [...prevLineupEntries]
      .filter(e => !e.is_scratch && e.batting_order != null)
      .sort((a, b) => (a.batting_order ?? 999) - (b.batting_order ?? 999))
      .map(e => e.player_id)
      .filter(id => activePlayers.some(p => p.id === id));
    const newIds = activePlayers
      .filter(p => !prevOrdered.includes(p.id))
      .map(p => p.id);
    battingOrder = [...prevOrdered, ...newIds];
  } else {
    battingOrder = activePlayers.map(p => p.id);
  }

  // Compute each player's most common non-pitcher field position from the previous game
  const prevGameMostCommon: Record<string, string> = {};
  if (prevLineupEntries) {
    for (const entry of prevLineupEntries) {
      const counts: Record<string, number> = {};
      for (const pos of entry.positions) {
        if (pos && pos !== 'X' && pos !== '' && pos !== 'P') {
          counts[pos] = (counts[pos] ?? 0) + 1;
        }
      }
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (best) prevGameMostCommon[entry.player_id] = best[0];
    }
  }

  const { pitcherForInning, catcherForInning } = buildPitchingSchedule(pitcherAssignments);
  const { grid, gameSitCounts } = buildGrid(
    battingOrder, activePlayers.length, pitcherForInning, catcherForInning, playerMap, prevGameMostCommon,
  );

  return { battingOrder, grid, gameSitCounts };
}

export interface Conflict {
  type: 'duplicate' | 'missing';
  inning: number; // 0-based
  message: string;
  missingPositions?: string[]; // positions not yet assigned in this inning (for 'duplicate' | 'missing')
}

export function validateGrid(
  battingOrder: string[],
  grid: Record<string, string[]>,
  scratchIds: Set<string>,
): Conflict[] {
  const ALL_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const conflicts: Conflict[] = [];
  for (let inn = 0; inn < 9; inn++) {
    const posCount: Record<string, number> = {};
    let missingCount = 0;
    for (const id of battingOrder) {
      if (scratchIds.has(id)) continue;
      const pos = grid[id]?.[inn] ?? '';
      if (pos === '') {
        if (inn < 5) missingCount++;
      } else if (pos !== 'X') {
        posCount[pos] = (posCount[pos] ?? 0) + 1;
      }
    }
    const assignedPositions = new Set(Object.keys(posCount));
    const missingPositions = ALL_POSITIONS.filter(p => !assignedPositions.has(p));

    for (const [pos, count] of Object.entries(posCount)) {
      if (count > 1) {
        conflicts.push({
          type: 'duplicate',
          inning: inn,
          message: `Inning ${inn + 1}: "${pos}" assigned to ${count} players. Unfilled: ${missingPositions.join(', ')}`,
          missingPositions,
        });
      }
    }
    if (missingCount > 0 && inn < 5) {
      conflicts.push({
        type: 'missing',
        inning: inn,
        message: `Inning ${inn + 1}: ${missingCount} player(s) have no position. Unfilled: ${missingPositions.join(', ')}`,
        missingPositions,
      });
    }
  }
  return conflicts;
}
