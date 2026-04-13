import type { Player, LineupEntry, PitcherAssignment } from './types';

const INFIELD = ['1B', '2B', '3B', 'SS'];
const OUTFIELD = ['LF', 'CF', 'RF'];
const INFIELD_SET = new Set(INFIELD);
const OUTFIELD_SET = new Set(OUTFIELD);

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

function assignSits(
  orderedIds: string[],
  pitcherForInning: Record<number, string>,
  catcherForInning: Record<number, string>,
  playerMap: Record<string, Player>,
): { sittingInInning: Record<number, Set<string>>; gameSitCounts: Record<string, number> } {
  const N = orderedIds.length;
  const sitsPerInning = Math.max(0, N - 9);
  const sittingInInning: Record<number, Set<string>> = {};
  for (let inn = 0; inn < 5; inn++) sittingInInning[inn] = new Set();
  const gameSitCounts: Record<string, number> = {};
  orderedIds.forEach(id => { gameSitCounts[id] = 0; });

  if (sitsPerInning === 0) return { sittingInInning, gameSitCounts };

  for (let inn = 0; inn < 5; inn++) {
    const cannotSit = new Set<string>();
    // Active pitchers and catchers cannot sit
    if (pitcherForInning[inn]) cannotSit.add(pitcherForInning[inn]);
    if (catcherForInning[inn]) cannotSit.add(catcherForInning[inn]);
    // No back-to-back sits
    if (inn > 0) sittingInInning[inn - 1].forEach(id => cannotSit.add(id));

    const eligible = orderedIds
      .filter(id => !cannotSit.has(id))
      .map(id => ({
        id,
        seasonSits: playerMap[id]?.sit_count ?? 0,
        gameSits: gameSitCounts[id],
        // Prefer to bench a pitcher the inning BEFORE her first appearance
        isPrePitcher: pitcherForInning[inn + 1] === id && !pitcherForInning[inn],
      }))
      .sort((a, b) => {
        if (a.isPrePitcher !== b.isPrePitcher) return a.isPrePitcher ? -1 : 1;
        if (b.seasonSits !== a.seasonSits) return b.seasonSits - a.seasonSits;
        return a.gameSits - b.gameSits;
      });

    for (let i = 0; i < sitsPerInning && i < eligible.length; i++) {
      const { id } = eligible[i];
      sittingInInning[inn].add(id);
      gameSitCounts[id]++;
    }
  }

  return { sittingInInning, gameSitCounts };
}

function assignPositions(
  orderedIds: string[],
  pitcherForInning: Record<number, string>,
  catcherForInning: Record<number, string>,
  sittingInInning: Record<number, Set<string>>,
  playerMap: Record<string, Player>,
): Record<string, string[]> {
  // grid[playerId][inning 0-8] = position | 'X' | ''
  const grid: Record<string, string[]> = {};
  orderedIds.forEach(id => { grid[id] = Array(9).fill(''); });

  // Mark sits
  for (let inn = 0; inn < 5; inn++) {
    sittingInInning[inn].forEach(id => { if (grid[id]) grid[id][inn] = 'X'; });
  }

  // Assign pitchers and catchers
  for (let inn = 0; inn < 5; inn++) {
    const pId = pitcherForInning[inn];
    const cId = catcherForInning[inn];
    if (pId && grid[pId] && grid[pId][inn] !== 'X') grid[pId][inn] = 'P';
    if (cId && grid[cId] && grid[cId][inn] !== 'X') grid[cId][inn] = 'C';
  }

  // Track per-player infield/outfield counts for balance
  const infieldCount: Record<string, number> = {};
  const outfieldCount: Record<string, number> = {};
  orderedIds.forEach(id => { infieldCount[id] = 0; outfieldCount[id] = 0; });

  for (let inn = 0; inn < 5; inn++) {
    // Players needing a field position this inning (not sitting, not pitcher, not catcher)
    const fieldPlayers = orderedIds.filter(id => grid[id][inn] === '');
    const fieldCount = fieldPlayers.length;
    // Use RF only if there are enough players to fill it
    const availablePositions = fieldCount <= 6
      ? [...INFIELD, 'LF', 'CF']
      : [...INFIELD, ...OUTFIELD];

    // Score (playerId, position) pair
    const score = (id: string, pos: string): number => {
      const player = playerMap[id];
      let s = 0;
      if (player?.preferred_positions?.includes(pos)) s += 10;
      if (player?.avoid_positions?.includes(pos)) s -= 10;
      // Encourage infield/outfield balance
      if (INFIELD_SET.has(pos) && outfieldCount[id] > infieldCount[id]) s += 4;
      if (OUTFIELD_SET.has(pos) && infieldCount[id] > outfieldCount[id]) s += 4;
      return s;
    };

    // Greedy assignment: most constrained player first
    const remaining = [...availablePositions];
    const sortedPlayers = [...fieldPlayers].sort((a, b) => {
      const aOk = remaining.filter(p => score(a, p) >= 0).length;
      const bOk = remaining.filter(p => score(b, p) >= 0).length;
      return aOk - bOk;
    });

    for (const id of sortedPlayers) {
      if (remaining.length === 0) break;
      const best = [...remaining].sort((a, b) => score(id, b) - score(id, a))[0];
      if (best !== undefined) {
        grid[id][inn] = best;
        remaining.splice(remaining.indexOf(best), 1);
        if (INFIELD_SET.has(best)) infieldCount[id]++;
        if (OUTFIELD_SET.has(best)) outfieldCount[id]++;
      }
    }
  }

  return grid;
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
): BuildLineupResult {
  const activePlayers = allPlayers.filter(p => !scratchIds.has(p.id));
  const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

  // Batting order: use previous, remove scratches, add new players at end
  let battingOrder: string[];
  if (prevLineupEntries && prevLineupEntries.length > 0) {
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

  const { pitcherForInning, catcherForInning } = buildPitchingSchedule(pitcherAssignments);
  const { sittingInInning, gameSitCounts } = assignSits(battingOrder, pitcherForInning, catcherForInning, playerMap);
  const grid = assignPositions(battingOrder, pitcherForInning, catcherForInning, sittingInInning, playerMap);

  return { battingOrder, grid, gameSitCounts };
}

export interface Conflict {
  type: 'duplicate' | 'missing';
  inning: number; // 0-based
  message: string;
}

export function validateGrid(
  battingOrder: string[],
  grid: Record<string, string[]>,
  scratchIds: Set<string>,
): Conflict[] {
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
    for (const [pos, count] of Object.entries(posCount)) {
      if (count > 1) {
        conflicts.push({
          type: 'duplicate',
          inning: inn,
          message: `Inning ${inn + 1}: "${pos}" assigned to ${count} players`,
        });
      }
    }
    if (missingCount > 0 && inn < 5) {
      conflicts.push({
        type: 'missing',
        inning: inn,
        message: `Inning ${inn + 1}: ${missingCount} player(s) have no position`,
      });
    }
  }
  return conflicts;
}
