import type { Player, LineupEntry, PitcherAssignment } from './types';

const INFIELD = ['1B', '2B', '3B', 'SS'];
const OUTFIELD = ['LF', 'CF', 'RF'];
const INFIELD_SET = new Set(INFIELD);
const OUTFIELD_SET = new Set(OUTFIELD);

// Returns the last inning index (exclusive, 0-based) for a given pitcher assignment
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

// Pick the best position from the pool for a player.
// Prefer `prefer` if provided and not avoided.
// Then: preferred positions > non-avoided > anything.
function pickBest(
  id: string,
  pool: string[],
  playerMap: Record<string, Player>,
  prefer?: string,
): string | undefined {
  if (pool.length === 0) return undefined;
  const player = playerMap[id];
  const avoid = new Set(player?.avoid_positions ?? []);
  const preferred = new Set(player?.preferred_positions ?? []);
  if (prefer && pool.includes(prefer) && !avoid.has(prefer)) return prefer;
  const pref = pool.find(p => preferred.has(p) && !avoid.has(p));
  if (pref) return pref;
  const safe = pool.find(p => !avoid.has(p));
  if (safe) return safe;
  return pool[0];
}

// Count avoid-list violations for a set of (playerId, position) assignments.
function countAvoidViolations(
  assignments: Array<{ id: string; pos: string }>,
  playerMap: Record<string, Player>,
): number {
  return assignments.filter(({ id, pos }) => {
    const avoid = new Set(playerMap[id]?.avoid_positions ?? []);
    return avoid.has(pos);
  }).length;
}

// Return all permutations of an array.
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) result.push([arr[i], ...perm]);
  }
  return result;
}

// Choose the shared outfield position for the 2nd pitcher/catcher anchor pair.
// Picks any OF slot not in either player's avoid list. Defaults to RF.
function chooseSharedOf(
  pitcher2Id: string,
  catcher2Id: string,
  playerMap: Record<string, Player>,
): string {
  const pitcherAvoid = new Set(playerMap[pitcher2Id]?.avoid_positions ?? []);
  const catcherAvoid = new Set(playerMap[catcher2Id]?.avoid_positions ?? []);
  return OUTFIELD.find(pos => !pitcherAvoid.has(pos) && !catcherAvoid.has(pos)) ?? 'RF';
}

// Zone-rotation grid builder.
//
// Phase 1 – Lock P/C from pitching schedule; anchor 2nd pitcher (OF→X→P) and 2nd catcher (X→OF→C).
// Phase 2 – Pre-compute per-player sit budget via round-robin on a fixed priority list (season sits
//            + forced sits ASC), then schedule sit innings from that budget (no back-to-back).
// Phase 3 – Baton-pass: inn-0 sitters (Group A) reserve a field pos for inn 1+2;
//            inn-1 sitters (Group B) are assigned that position for inn 0.
// Phase 4 – Remaining players without inn 0/1 positions get the same position for both innings.
// Phase 5 – Zone flip for innings 2-4: OF-early players → infield, IF-early players → outfield
//            (priority by fewest season outfield_innings); same pos for consecutive innings.
function buildGrid(
  orderedIds: string[],
  N: number,
  pitcherForInning: Record<number, string>,
  catcherForInning: Record<number, string>,
  playerMap: Record<string, Player>,
  sortedPAs: PitcherAssignment[], // sorted by startInning ascending
): { grid: Record<string, string[]>; gameSitCounts: Record<string, number> } {
  const grid: Record<string, string[]> = {};
  orderedIds.forEach(id => { grid[id] = Array(9).fill(''); });

  const gameSitCounts: Record<string, number> = {};
  orderedIds.forEach(id => { gameSitCounts[id] = 0; });

  const sitsPerInning = Math.max(0, N - 9);

  // All field positions available (RF included when >= 7 fielders; equals N - sitsPerInning - 2)
  const fieldCount = N - sitsPerInning - 2;
  const allFieldPositions = fieldCount <= 6 ? [...INFIELD, 'LF', 'CF'] : [...INFIELD, ...OUTFIELD];

  // ── PHASE 1: Lock anchors ─────────────────────────────────────────────────

  // Lock pitchers and catchers for every inning
  for (let inn = 0; inn < 5; inn++) {
    const pId = pitcherForInning[inn];
    const cId = catcherForInning[inn];
    if (pId && grid[pId][inn] === '') grid[pId][inn] = 'P';
    if (cId && grid[cId][inn] === '') grid[cId][inn] = 'C';
  }

  // 2nd pitcher/catcher special pattern (N >= 10 only)
  const pa2 = sortedPAs[1]; // second pitching assignment (0-indexed, sorted by startInning)
  if (N >= 10 && pa2) {
    const pitcher2Id = pa2.pitcherId;
    const catcher2Id = pa2.catcherId;
    const sharedOf = chooseSharedOf(pitcher2Id, catcher2Id, playerMap);

    // 2nd pitcher: inn 0 = sharedOf, inn 1 = X  (P slots already locked above for inn 2-4)
    if (grid[pitcher2Id][0] === '') grid[pitcher2Id][0] = sharedOf;
    if (grid[pitcher2Id][1] === '') {
      grid[pitcher2Id][1] = 'X';
      gameSitCounts[pitcher2Id]++;
    }

    // 2nd catcher: inn 0 = X, inn 1 = sharedOf  (C slots already locked above for inn 2-4)
    if (grid[catcher2Id][0] === '') {
      grid[catcher2Id][0] = 'X';
      gameSitCounts[catcher2Id]++;
    }
    if (grid[catcher2Id][1] === '') grid[catcher2Id][1] = sharedOf;
  }

  // ── PHASE 2: Pre-compute sit budget, then schedule ───────────────────────

  if (sitsPerInning > 0) {
    const numInnings = 5;
    const totalSitSlots = sitsPerInning * numInnings;

    // Count sits already locked in by Phase 1 anchor patterns
    const forcedSits: Record<string, number> = {};
    orderedIds.forEach(id => {
      forcedSits[id] = grid[id].slice(0, numInnings).filter(p => p === 'X').length;
    });
    const forcedTotal = orderedIds.reduce((sum, id) => sum + forcedSits[id], 0);
    let remainingSlots = totalSitSlots - forcedTotal;

    // Fixed priority list: sort by (seasonSits + forcedSits) ASC so players who already
    // have forced game sits are deprioritised; tiebreak by batting order (index).
    const priorityList = [...orderedIds].sort((a, b) => {
      const aTotal = (playerMap[a]?.sit_count ?? 0) + forcedSits[a];
      const bTotal = (playerMap[b]?.sit_count ?? 0) + forcedSits[b];
      if (aTotal !== bTotal) return aTotal - bTotal;
      return orderedIds.indexOf(a) - orderedIds.indexOf(b);
    });

    // Round-robin through the priority list to assign extra sit slots.
    // Each player gets at most one extra sit per pass through the list.
    const extraSits: Record<string, number> = {};
    orderedIds.forEach(id => { extraSits[id] = 0; });
    for (let pi = 0; pi < priorityList.length * 2 && remainingSlots > 0; pi++) {
      extraSits[priorityList[pi % priorityList.length]]++;
      remainingSlots--;
    }

    // sitBudget = total sits this player should have this game (forced + extra)
    const sitBudget: Record<string, number> = {};
    orderedIds.forEach(id => { sitBudget[id] = forcedSits[id] + extraSits[id]; });

    // Schedule: fill each inning from the priority list, respecting budget and no back-to-back.
    for (let inn = 0; inn < numInnings; inn++) {
      const need = sitsPerInning - orderedIds.filter(id => grid[id][inn] === 'X').length;
      if (need <= 0) continue;

      const eligible = priorityList.filter(id => {
        const scheduledSoFar = grid[id].slice(0, inn).filter(p => p === 'X').length;
        return (
          grid[id][inn] === '' &&                            // not already assigned this inning
          (inn === 0 || grid[id][inn - 1] !== 'X') &&       // no back-to-back sits
          scheduledSoFar < sitBudget[id]                     // has remaining budget
        );
      });

      for (let i = 0; i < need && i < eligible.length; i++) {
        grid[eligible[i]][inn] = 'X';
        gameSitCounts[eligible[i]]++;
      }
    }
  }

  // ── PHASE 3: Baton-pass pool ──────────────────────────────────────────────

  const anchor2CatcherId = N >= 10 && pa2 ? pa2.catcherId : null;
  const anchor2PitcherId = N >= 10 && pa2 ? pa2.pitcherId : null;

  // Group A: sitting inn 0, excluding the 2nd-catcher anchor
  const groupA = orderedIds.filter(id => grid[id][0] === 'X' && id !== anchor2CatcherId);

  // Group B: sitting inn 1, excluding the 2nd-pitcher anchor
  const groupB = orderedIds.filter(id => grid[id][1] === 'X' && id !== anchor2PitcherId);

  // Track positions already claimed in inn 1 (non-X, non-empty)
  const claimedInn1Base = new Set(
    orderedIds.filter(id => grid[id][1] !== '' && grid[id][1] !== 'X').map(id => grid[id][1]),
  );

  // Build the initial PA pool by greedily assigning preferred positions to Group A
  function buildPoolPA(aOrder: string[]): string[] {
    const claimed = new Set(claimedInn1Base);
    const pool: string[] = [];
    for (const id of aOrder) {
      const avail = allFieldPositions.filter(p => !claimed.has(p));
      const pos = pickBest(id, avail, playerMap);
      if (pos !== undefined) {
        claimed.add(pos);
        pool.push(pos);
      }
    }
    return pool;
  }

  // Cloned inn-0 claimed set for scoring permutations
  const claimedInn0Base = new Set(
    orderedIds.filter(id => grid[id][0] !== '' && grid[id][0] !== 'X').map(id => grid[id][0]),
  );

  // Score a PA pool + Group B assignment for avoid violations
  function scorePoolForB(poolPA: string[], aOrder: string[]): number {
    const poolRemaining = poolPA.filter(p => !claimedInn0Base.has(p));
    const assignments: Array<{ id: string; pos: string }> = [];
    const used = new Set<string>();
    for (let i = 0; i < groupB.length && i < poolRemaining.length; i++) {
      const avail = poolRemaining.filter(p => !used.has(p));
      const pos = pickBest(groupB[i], avail, playerMap);
      if (pos !== undefined) {
        used.add(pos);
        assignments.push({ id: groupB[i], pos });
      }
    }
    // Also score Group A assignments themselves
    const claimedA = new Set(claimedInn1Base);
    for (let i = 0; i < aOrder.length; i++) {
      const avail = allFieldPositions.filter(p => !claimedA.has(p));
      const pos = pickBest(aOrder[i], avail, playerMap);
      if (pos !== undefined) {
        claimedA.add(pos);
        assignments.push({ id: aOrder[i], pos });
      }
    }
    return countAvoidViolations(assignments, playerMap);
  }

  // Try permutations of Group A order to minimise avoid violations (cap at 6 players = 720)
  let bestAOrder = groupA;
  if (groupA.length <= 6 && groupB.length > 0) {
    let bestScore = Infinity;
    for (const perm of permutations(groupA)) {
      const pool = buildPoolPA(perm);
      const score = scorePoolForB(pool, perm);
      if (score < bestScore) {
        bestScore = score;
        bestAOrder = perm;
        if (bestScore === 0) break;
      }
    }
  }

  // Assign Group A using the best order found
  const poolPA: string[] = [];
  {
    const claimed = new Set(claimedInn1Base);
    for (const id of bestAOrder) {
      const avail = allFieldPositions.filter(p => !claimed.has(p));
      const pos = pickBest(id, avail, playerMap);
      if (pos !== undefined) {
        claimed.add(pos);
        // BUG FIX: only assign inn 1/2 if not already occupied by a Phase 2 sit
        if (grid[id][1] === '') grid[id][1] = pos;
        if (grid[id][2] === '') grid[id][2] = pos;
        poolPA.push(pos);
      }
    }
  }

  // Positions available in inn 0 that are in the PA pool
  const claimedInn0 = new Set(
    orderedIds.filter(id => grid[id][0] !== '' && grid[id][0] !== 'X').map(id => grid[id][0]),
  );
  const availPA = poolPA.filter(p => !claimedInn0.has(p));

  // Assign Group B players a position from PA pool for inn 0
  for (const id of groupB) {
    if (availPA.length === 0) break;
    const pos = pickBest(id, availPA, playerMap);
    if (pos !== undefined) {
      grid[id][0] = pos;
      availPA.splice(availPA.indexOf(pos), 1);
      claimedInn0.add(pos);
    }
  }

  // ── PHASE 4: Innings 0-1 pairs for remaining players ─────────────────────

  // Players who need both inn 0 and inn 1 assigned simultaneously
  const needsBoth = orderedIds.filter(id => grid[id][0] === '' && grid[id][1] === '');
  // Union of claimed positions across both innings (to find positions free in BOTH)
  const claimedPair = new Set([
    ...orderedIds.filter(id => grid[id][0] !== '' && grid[id][0] !== 'X').map(id => grid[id][0]),
    ...orderedIds.filter(id => grid[id][1] !== '' && grid[id][1] !== 'X').map(id => grid[id][1]),
  ]);
  const availPair = allFieldPositions.filter(p => !claimedPair.has(p));

  // Try permutations of needsBoth order to minimise avoid violations (cap at 6 players)
  let bestPairOrder = needsBoth;
  if (needsBoth.length > 1 && needsBoth.length <= 6) {
    let bestScore = Infinity;
    for (const perm of permutations(needsBoth)) {
      const pool = [...availPair];
      const assignments: Array<{ id: string; pos: string }> = [];
      for (const id of perm) {
        if (pool.length === 0) break;
        const pos = pickBest(id, pool, playerMap);
        if (pos !== undefined) {
          pool.splice(pool.indexOf(pos), 1);
          assignments.push({ id, pos });
          assignments.push({ id, pos }); // counted twice (inn 0 + inn 1)
        }
      }
      const score = countAvoidViolations(assignments, playerMap);
      if (score < bestScore) {
        bestScore = score;
        bestPairOrder = perm;
        if (bestScore === 0) break;
      }
    }
  }

  for (const id of bestPairOrder) {
    if (availPair.length === 0) break;
    const pos = pickBest(id, availPair, playerMap);
    if (pos !== undefined) {
      grid[id][0] = pos;
      grid[id][1] = pos;
      availPair.splice(availPair.indexOf(pos), 1);
    }
  }

  // Fallback: any player still missing inn 0 or inn 1 individually (edge cases)
  for (const inn of [0, 1]) {
    const stillNeeds = orderedIds.filter(id => grid[id][inn] === '');
    if (stillNeeds.length === 0) continue;
    const claimed = new Set(
      orderedIds.filter(id => grid[id][inn] !== '' && grid[id][inn] !== 'X').map(id => grid[id][inn]),
    );
    const avail = allFieldPositions.filter(p => !claimed.has(p));
    for (const id of stillNeeds) {
      if (avail.length === 0) break;
      const pos = pickBest(id, avail, playerMap);
      if (pos !== undefined) {
        grid[id][inn] = pos;
        avail.splice(avail.indexOf(pos), 1);
      }
    }
  }

  // ── PHASE 5: Zone flip for innings 2-4 ────────────────────────────────────

  // Classify players by zone played in innings 0-1
  const isField = (p: string) => p !== '' && p !== 'X' && p !== 'P' && p !== 'C';
  const ofEarly = new Set<string>();
  const ifEarly = new Set<string>();

  for (const id of orderedIds) {
    const p0 = grid[id][0];
    const p1 = grid[id][1];
    const playedOF = (isField(p0) && OUTFIELD_SET.has(p0)) || (isField(p1) && OUTFIELD_SET.has(p1));
    const playedIF = (isField(p0) && INFIELD_SET.has(p0)) || (isField(p1) && INFIELD_SET.has(p1));
    if (playedOF) ofEarly.add(id);
    else if (playedIF) ifEarly.add(id);
    // Players who only played P/C/X in inn 0-1 are unclassified (handled as residual)
  }

  // Sort IF-early by outfield_innings ASC: fewest OF innings → top flip priority
  const ifEarlyOrdered = [...ifEarly].sort((a, b) =>
    (playerMap[a]?.outfield_innings ?? 0) - (playerMap[b]?.outfield_innings ?? 0));

  // Track last assigned position in Phase 5 per player (for consecutive-inning stickiness)
  let lastFlip: Record<string, string> = {};

  // Phase 5 assignment for a single inning given a particular processing order for orderedIds.
  // Returns the assignments made and the updated lastFlip state.
  function assignInn(
    inn: number,
    ofEarlySet: Set<string>,
    ifEarlyArr: string[],
    order: string[],
    prevLastFlip: Record<string, string>,
  ): { assignments: Record<string, string>; nextLastFlip: Record<string, string> } {
    const taken = new Set(
      orderedIds.filter(id => grid[id][inn] !== '' && grid[id][inn] !== 'X').map(id => grid[id][inn]),
    );
    const availIF = allFieldPositions.filter(p => INFIELD_SET.has(p) && !taken.has(p));
    const availOF = allFieldPositions.filter(p => OUTFIELD_SET.has(p) && !taken.has(p));
    const assignments: Record<string, string> = {};
    const nextLastFlip = { ...prevLastFlip };

    // Count non-avoided options a player has in a given pool (MRV helper).
    function safeCount(id: string, pool: string[]): number {
      const avoid = new Set(playerMap[id]?.avoid_positions ?? []);
      return pool.filter(p => !avoid.has(p)).length;
    }

    function assign(id: string, pos: string, list: string[]) {
      assignments[id] = pos;
      list.splice(list.indexOf(pos), 1);
      taken.add(pos);
      nextLastFlip[id] = pos;
    }

    // OF-early → infield (MRV: most constrained first to claim safe slots first)
    const ofEarlyNeeding = order.filter(id => ofEarlySet.has(id) && grid[id][inn] === '' && !assignments[id]);
    ofEarlyNeeding.sort((a, b) => safeCount(a, availIF) - safeCount(b, availIF));
    for (const id of ofEarlyNeeding) {
      const pref = prevLastFlip[id] && INFIELD_SET.has(prevLastFlip[id]) ? prevLastFlip[id] : undefined;
      const pos = pickBest(id, availIF, playerMap, pref);
      if (pos !== undefined) assign(id, pos, availIF);
    }

    // IF-early → outfield (MRV; skip if no non-avoided OF option — try again next inning)
    const ifEarlyNeeding = ifEarlyArr.filter(id => grid[id][inn] === '' && !assignments[id] && availOF.length > 0);
    ifEarlyNeeding.sort((a, b) => {
      const sa = safeCount(a, availOF);
      const sb = safeCount(b, availOF);
      if (sa !== sb) return sa - sb; // most constrained first
      // tiebreak: retain outfield_innings priority (fewest first)
      return (playerMap[a]?.outfield_innings ?? 0) - (playerMap[b]?.outfield_innings ?? 0);
    });
    for (const id of ifEarlyNeeding) {
      if (availOF.length === 0) break;
      const avoid = new Set(playerMap[id]?.avoid_positions ?? []);
      const safeOF = availOF.filter(p => !avoid.has(p));
      // Skip if no safe OF available — player will be handled by the couldn't-flip step
      // and retried in the next inning.
      if (safeOF.length === 0) continue;
      const pref = prevLastFlip[id] && OUTFIELD_SET.has(prevLastFlip[id]) ? prevLastFlip[id] : undefined;
      const pos = pickBest(id, safeOF, playerMap, pref);
      if (pos !== undefined) assign(id, pos, availOF);
    }

    // IF-early who couldn't flip → additional infield (MRV)
    const ifEarlyNoFlip = ifEarlyArr.filter(id => grid[id][inn] === '' && !assignments[id]);
    ifEarlyNoFlip.sort((a, b) => safeCount(a, availIF) - safeCount(b, availIF));
    for (const id of ifEarlyNoFlip) {
      const pref = prevLastFlip[id] && INFIELD_SET.has(prevLastFlip[id]) ? prevLastFlip[id] : undefined;
      const pos = pickBest(id, availIF, playerMap, pref);
      if (pos !== undefined) assign(id, pos, availIF);
    }

    // Residual (MRV across all remaining positions)
    const residualNeeding = order.filter(id => grid[id][inn] === '' && !assignments[id]);
    residualNeeding.sort((a, b) => safeCount(a, [...availIF, ...availOF]) - safeCount(b, [...availIF, ...availOF]));
    for (const id of residualNeeding) {
      const allAvail = [...availIF, ...availOF];
      if (allAvail.length === 0) continue;
      const pref = prevLastFlip[id];
      const pos = pickBest(id, allAvail, playerMap, pref);
      if (pos !== undefined) {
        if (availIF.includes(pos)) assign(id, pos, availIF);
        else assign(id, pos, availOF);
      }
    }
    return { assignments, nextLastFlip };
  }

  // Score a set of Phase 5 assignments for avoid violations + zone-flip correctness.
  // Lower is better. Avoid violations are heavily penalised (near-hard constraint).
  // Zone-flip misses (OF-early in OF, IF-early in IF) are soft penalties.
  function scorePhase5(
    assignmentsByInn: Record<string, string>[],
    ofEarlySet: Set<string>,
    ifEarlySet: Set<string>,
  ): number {
    let score = 0;
    for (const assignments of assignmentsByInn) {
      for (const [id, pos] of Object.entries(assignments)) {
        const avoid = new Set(playerMap[id]?.avoid_positions ?? []);
        if (avoid.has(pos)) score += 10; // strongly penalise — near-hard constraint
        if (ofEarlySet.has(id) && OUTFIELD_SET.has(pos)) score += 1;
        if (ifEarlySet.has(id) && INFIELD_SET.has(pos)) score += 1;
      }
    }
    return score;
  }

  // Try multiple orderings of orderedIds for Phase 5 (cap at a small set of candidates)
  // Strategy: try batting order, reversed, and a few preference-sorted orders.
  const phase5Candidates: string[][] = [
    [...orderedIds],
    [...orderedIds].reverse(),
    // Sort by avoid-list size DESC so players with more constraints are assigned first
    [...orderedIds].sort((a, b) =>
      (playerMap[b]?.avoid_positions?.length ?? 0) - (playerMap[a]?.avoid_positions?.length ?? 0)),
    // Sort by avoid-list size ASC
    [...orderedIds].sort((a, b) =>
      (playerMap[a]?.avoid_positions?.length ?? 0) - (playerMap[b]?.avoid_positions?.length ?? 0)),
  ];

  let bestPhase5Order = orderedIds;
  let bestPhase5Score = Infinity;

  for (const candidate of phase5Candidates) {
    let candidateLastFlip: Record<string, string> = {};
    const innAssignments: Record<string, string>[] = [];
    for (let inn = 2; inn < 5; inn++) {
      const { assignments, nextLastFlip } = assignInn(inn, ofEarly, ifEarlyOrdered, candidate, candidateLastFlip);
      innAssignments.push(assignments);
      candidateLastFlip = nextLastFlip;
    }
    const score = scorePhase5(innAssignments, ofEarly, ifEarly);
    if (score < bestPhase5Score) {
      bestPhase5Score = score;
      bestPhase5Order = candidate;
    }
    if (bestPhase5Score === 0) break;
  }

  // Apply Phase 5 with the best ordering found
  for (let inn = 2; inn < 5; inn++) {
    const { assignments, nextLastFlip } = assignInn(inn, ofEarly, ifEarlyOrdered, bestPhase5Order, lastFlip);
    for (const [id, pos] of Object.entries(assignments)) {
      grid[id][inn] = pos;
    }
    lastFlip = nextLastFlip;
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

  const sortedPAs = [...pitcherAssignments].sort((a, b) => a.startInning - b.startInning);
  const { pitcherForInning, catcherForInning } = buildPitchingSchedule(pitcherAssignments);
  const { grid, gameSitCounts } = buildGrid(
    battingOrder, activePlayers.length, pitcherForInning, catcherForInning, playerMap, sortedPAs,
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
