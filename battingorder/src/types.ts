export const INFIELD = ['1B', '2B', '3B', 'SS'] as const;
export const OUTFIELD = ['LF', 'CF', 'RF'] as const;
export const ALL_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;

export interface Player {
  id: string;
  name: string;
  jersey_number: number;
  preferred_positions: string[];
  avoid_positions: string[];
  sit_count: number;
  outfield_innings: number;
  infield_innings: number;
}

export interface Game {
  id: string;
  starttime: string;
  location: string;
  opponent: string;
  tags: string[];
  pitcher_assignments?: PitcherAssignment[] | null;
  notes?: string | null;
  is_complete?: boolean;
  innings_played?: number | null;
  our_score?: number | null;
  opponent_score?: number | null;
}

export interface LineupEntry {
  id?: string;
  game_id: string;
  player_id: string;
  is_scratch: boolean;
  batting_order: number | null;
  sit_count: number;
  // length 9, index = inning-1; 'X' = sit, '' = unassigned
  positions: string[];
  notes: string;
}

export interface PitcherAssignment {
  pitcherId: string;
  catcherId: string;
  startInning: number; // 1-based, first inning this pitcher pitches
}
