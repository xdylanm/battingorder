import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, Select, MenuItem, FormControl,
  Button, Divider, Alert, IconButton, CircularProgress,
  FormControlLabel, Checkbox, Table, TableBody, TableCell,
  TableHead, TableRow, Menu, InputBase, TextField,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable,
  arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { supabase } from './supabaseClient';
import { buildLineup, validateGrid, type Conflict } from './lineupLogic';
import type { Player, Game, LineupEntry, PitcherAssignment } from './types';
import { exportLineupPdf } from './exportPdf';

const ALL_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const INNINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ─── Position cell ────────────────────────────────────────────────────────────

interface PositionCellProps {
  value: string;
  onChange: (val: string) => void;
  conflict?: boolean;
  disabled?: boolean;
  missingPositions?: string[];
  avoidPositions?: string[];
}

function PositionCell({ value, onChange, conflict, disabled, missingPositions, avoidPositions }: PositionCellProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isAvoid = value && avoidPositions?.includes(value);
  const cellColor =
    disabled ? '#ececec' :            // disabled inning → dimmed
    value === 'X' ? '#e0e0e0' :        // sit → gray
    isAvoid ? '#ffe0e0' :              // avoid-position → red
    value === '' ? '#f5f5f5' :
    conflict ? '#fff3cd' : '#e8f5e9';
  const missingSet = new Set(missingPositions ?? []);
  return (
    <>
      <Box
        onClick={disabled ? undefined : e => setAnchorEl(e.currentTarget as HTMLElement)}
        sx={{
          minWidth: 40, textAlign: 'center', borderRadius: 1, px: 0.5, py: 0.25,
          bgcolor: cellColor, cursor: disabled ? 'default' : 'pointer',
          fontWeight: 600, fontSize: 13,
          color: value === 'X' ? '#555' : isAvoid ? '#c62828' : 'inherit',
          border: conflict ? '1.5px solid #f9a825' : '1.5px solid transparent',
          '&:hover': disabled ? {} : { borderColor: '#1976d2' },
        }}
      >
        {value || '–'}
      </Box>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { onChange(''); setAnchorEl(null); }}>
          <em>Clear</em>
        </MenuItem>
        <MenuItem onClick={() => { onChange('X'); setAnchorEl(null); }}
          sx={{ color: '#555', fontWeight: 600 }}>
          X (Sit)
        </MenuItem>
        <Divider />
        {ALL_POSITIONS.map(pos => (
          <MenuItem
            key={pos}
            onClick={() => { onChange(pos); setAnchorEl(null); }}
            sx={{ fontWeight: missingSet.has(pos) ? 700 : 400 }}
          >
            {pos}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// ─── Jersey cell ─────────────────────────────────────────────────────────────

interface JerseyCellProps {
  value: string;
  isOverridden: boolean;
  onChange: (val: string) => void;
}

function JerseyCell({ value, isOverridden, onChange }: JerseyCellProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (editing) {
    return (
      <InputBase
        inputRef={inputRef}
        value={value}
        autoFocus
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false); }}
        inputProps={{ maxLength: 4, style: { textAlign: 'center', width: 36, fontSize: 13, padding: 2 } }}
        sx={{ bgcolor: '#fff9c4', borderRadius: 1, border: '1.5px solid #f9a825' }}
      />
    );
  }
  return (
    <Box
      onClick={() => setEditing(true)}
      sx={{
        minWidth: 32, textAlign: 'center', borderRadius: 1, px: 0.5, py: 0.25,
        fontSize: 13, color: isOverridden ? '#7b5800' : '#666',
        bgcolor: isOverridden ? '#fff9c4' : 'transparent',
        border: isOverridden ? '1.5px solid #f9a825' : '1.5px solid transparent',
        cursor: 'pointer',
        '&:hover': { borderColor: '#1976d2' },
      }}
    >
      {value || '–'}
    </Box>
  );
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

interface SortableRowProps {
  id: string;
  order: number;
  player: Player;
  entry: { positions: string[] };
  isScratch: boolean;
  conflictCells: Set<number>;
  jerseyOverride: string | null;
  missingPositionsByInning: Record<number, string[]>;
  inningsPlayed: number | null;
  onCellChange: (inning: number, val: string) => void;
  onJerseyChange: (val: string) => void;
}

function SortableRow({ id, order, player, entry, isScratch, conflictCells, jerseyOverride, missingPositionsByInning, inningsPlayed, onCellChange, onJerseyChange }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isScratch ? '#fafafa' : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell sx={{ width: 32, p: 0.5 }}>
        <IconButton size="small" {...attributes} {...listeners} sx={{ cursor: 'grab', color: '#bbb' }}>
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      </TableCell>
      <TableCell sx={{ width: 32, textAlign: 'center', fontWeight: 600, color: '#888' }}>{order}</TableCell>
      <TableCell sx={{ width: 36, textAlign: 'center', p: 0.25 }}>
        <JerseyCell
          value={jerseyOverride !== null ? jerseyOverride : (player.jersey_number != null ? String(player.jersey_number) : '')}
          isOverridden={jerseyOverride !== null}
          onChange={onJerseyChange}
        />
      </TableCell>
      <TableCell sx={{ minWidth: 120, fontWeight: isScratch ? 400 : 600, color: isScratch ? '#999' : 'inherit' }}>
        {player.name}{isScratch ? ' (Scratch)' : ''}
      </TableCell>
      {INNINGS.map((_, innIdx) => (
        <TableCell key={innIdx} sx={{ p: 0.5, textAlign: 'center' }}>
          {isScratch ? (
            <Box sx={{ minWidth: 40, textAlign: 'center', color: '#ccc' }}>—</Box>
          ) : (
            <PositionCell
              value={entry.positions[innIdx] ?? ''}
              onChange={val => onCellChange(innIdx, val)}
              conflict={conflictCells.has(innIdx)}
              disabled={inningsPlayed !== null && innIdx >= inningsPlayed}
              missingPositions={missingPositionsByInning[innIdx]}
              avoidPositions={player.avoid_positions}
            />
          )}
        </TableCell>
      ))}
    </TableRow>
  );
}

// ─── Summary panel ────────────────────────────────────────────────────────────

interface SummaryProps {
  battingOrder: string[];
  playerMap: Record<string, Player>;
  grid: Record<string, string[]>;
  scratchIds: Set<string>;
  gameSitCounts: Record<string, number>;
  conflicts: Conflict[];
}

function SummaryPanel({ battingOrder, playerMap, grid, scratchIds, gameSitCounts, conflicts }: SummaryProps) {
  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Summary</Typography>
      {conflicts.length > 0 && (
        <Box sx={{ mb: 1 }}>
          {conflicts.map((c, i) => (
            <Alert key={i} severity="warning" sx={{ mb: 0.5 }}>{c.message}</Alert>
          ))}
        </Box>
      )}
      {conflicts.length === 0 && (
        <Alert severity="success" sx={{ mb: 1 }}>No conflicts detected</Alert>
      )}
      <Typography variant="subtitle2" gutterBottom>Sit counts (this game)</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {battingOrder
          .filter(id => !scratchIds.has(id))
          .map(id => {
            const player = playerMap[id];
            const gameSits = gameSitCounts[id] ?? 0;
            const seasonSits = (player?.sit_count ?? 0) + gameSits;
            return (
              <Chip
                key={id}
                size="small"
                label={`${player?.name ?? id}: ${gameSits} (season: ${seasonSits})`}
                color={gameSits > 1 ? 'warning' : gameSits === 1 ? 'default' : 'success'}
              />
            );
          })}
      </Box>
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Position rotations</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {battingOrder
          .filter(id => !scratchIds.has(id))
          .map(id => {
            const pos = (grid[id] ?? []).filter(p => p && p !== 'X' && p !== '');
            const infield = pos.filter(p => ['1B', '2B', '3B', 'SS'].includes(p)).length;
            const outfield = pos.filter(p => ['LF', 'CF', 'RF'].includes(p)).length;
            const isPitch = pos.some(p => p === 'P');
            const isCatch = pos.some(p => p === 'C');
            const label = isPitch || isCatch
              ? `${playerMap[id]?.name}: ${pos.slice(0, 5).join(', ')}`
              : `${playerMap[id]?.name}: ${infield}IF/${outfield}OF`;
            return <Chip key={id} size="small" label={label} />;
          })}
      </Box>
    </Paper>
  );
}

// ─── LineupEditor ─────────────────────────────────────────────────────────────

interface Props {
  game: Game;
  onClose: () => void;
}

export default function LineupEditor({ game, onClose }: Props) {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [scratchIds, setScratchIds] = useState<Set<string>>(new Set());
  const [pitcherAssignments, setPitcherAssignments] = useState<PitcherAssignment[]>([
    { pitcherId: '', catcherId: '', startInning: 1 },
    { pitcherId: '', catcherId: '', startInning: 3 },
  ]);
  const [battingOrder, setBattingOrder] = useState<string[]>([]);
  const [grid, setGrid] = useState<Record<string, string[]>>({});
  const [gameSitCounts, setGameSitCounts] = useState<Record<string, number>>({});
  const [expandCatcher, setExpandCatcher] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [defaultSaveSuccess, setDefaultSaveSuccess] = useState(false);
  const [prevLineup, setPrevLineup] = useState<LineupEntry[] | null>(null);
  const [populated, setPopulated] = useState(false);
  const [jerseyOverrides, setJerseyOverrides] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState(game.notes ?? '');
  const [ourScore, setOurScore] = useState<number | null>(game.our_score ?? null);
  const [opponentScore, setOpponentScore] = useState<number | null>(game.opponent_score ?? null);
  const [inningsPlayed, setInningsPlayed] = useState<number | null>(game.innings_played ?? null);
  const [isComplete, setIsComplete] = useState<boolean>(game.is_complete ?? false);
  const battingOrderRef = useRef<string[]>([]);
  battingOrderRef.current = battingOrder;

  const playerMap: Record<string, Player> = Object.fromEntries(allPlayers.map(p => [p.id, p]));

  const conflicts = battingOrder.length > 0
    ? validateGrid(battingOrder, grid, scratchIds)
    : [];

  // Conflict inning sets per player
  const conflictCellsByPlayer: Record<string, Set<number>> = {};
  // Missing positions per inning (union across all conflict entries for that inning)
  const missingPositionsByInning: Record<number, string[]> = {};
  for (const c of conflicts) {
    if (c.missingPositions && c.missingPositions.length > 0) {
      if (!missingPositionsByInning[c.inning]) missingPositionsByInning[c.inning] = [];
      const existing = new Set(missingPositionsByInning[c.inning]);
      for (const p of c.missingPositions) if (!existing.has(p)) missingPositionsByInning[c.inning].push(p);
    }
    if (c.type === 'duplicate') {
      for (const id of battingOrder) {
        if (grid[id]?.[c.inning] && grid[id][c.inning] !== 'X' && grid[id][c.inning] !== '') {
          if (!conflictCellsByPlayer[id]) conflictCellsByPlayer[id] = new Set();
          conflictCellsByPlayer[id].add(c.inning);
        }
      }
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ─── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true);
      // Load all players
      const { data: players } = await supabase.from('players').select('*').order('name');
      if (players) setAllPlayers(players);

      // Load existing lineup for this game
      const { data: existingLineup } = await supabase
        .from('lineup').select('*').eq('game_id', game.id);

      // Restore pitcher assignments if saved on the game
      if (game.pitcher_assignments && game.pitcher_assignments.length > 0) {
        setPitcherAssignments(game.pitcher_assignments);
      }
      if (game.notes) {
        setNotes(game.notes);
      }

      if (existingLineup && existingLineup.length > 0) {
        // Restore state from saved lineup
        const scratches = new Set(existingLineup.filter(e => e.is_scratch).map((e: LineupEntry) => e.player_id));
        setScratchIds(scratches);
        const ordered = [...existingLineup]
          .filter((e: LineupEntry) => !e.is_scratch && e.batting_order != null)
          .sort((a: LineupEntry, b: LineupEntry) => (a.batting_order ?? 999) - (b.batting_order ?? 999))
          .map((e: LineupEntry) => e.player_id);
        setBattingOrder(ordered);
        const g: Record<string, string[]> = {};
        existingLineup.forEach((e: LineupEntry) => { g[e.player_id] = e.positions ?? Array(9).fill(''); });
        setGrid(g);
        const gc: Record<string, number> = {};
        existingLineup.forEach((e: LineupEntry) => { gc[e.player_id] = e.sit_count ?? 0; });
        setGameSitCounts(gc);
        setPopulated(true);
      } else {
        // Find previous game for lineup template
        const { data: prevGames } = await supabase
          .from('games')
          .select('id')
          .lt('starttime', game.starttime)
          .order('starttime', { ascending: false })
          .limit(1);
        if (prevGames && prevGames.length > 0) {
          const { data: prev } = await supabase
            .from('lineup').select('*').eq('game_id', prevGames[0].id);
          setPrevLineup(prev ?? null);
        }
      }

      setLoading(false);
    }
    load();
  }, [game.id, game.starttime]);

  // ─── Populate lineup ────────────────────────────────────────────────────────

  const populate = useCallback((keepOrder = false) => {
    if (allPlayers.length === 0) return;
    const result = buildLineup(
      allPlayers, scratchIds,
      pitcherAssignments.filter(p => p.pitcherId),
      prevLineup,
      keepOrder ? battingOrderRef.current : undefined,
    );
    setBattingOrder(result.battingOrder);
    setGrid(result.grid);
    setGameSitCounts(result.gameSitCounts);
    setPopulated(true);
  }, [allPlayers, scratchIds, pitcherAssignments, prevLineup]);

  // Auto-populate once players load (first time only)
  useEffect(() => {
    if (!loading && !populated && allPlayers.length > 0) {
      populate();
    }
  }, [loading, populated, allPlayers, populate]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleScratchChange = (playerId: string, checked: boolean) => {
    const next = new Set(scratchIds);
    if (checked) {
      // Scratching a player: remove from batting order and grid
      next.add(playerId);
      setScratchIds(next);
      setBattingOrder(prev => prev.filter(id => id !== playerId));
      setGrid(prev => {
        const updated = { ...prev };
        delete updated[playerId];
        return updated;
      });
    } else {
      // Activating a player: append to end, sit for all 5 innings
      next.delete(playerId);
      setScratchIds(next);
      setBattingOrder(prev => [...prev, playerId]);
      setGrid(prev => ({
        ...prev,
        [playerId]: ['X', 'X', 'X', 'X', 'X', '', '', '', ''],
      }));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBattingOrder(prev => {
        const oldIdx = prev.indexOf(String(active.id));
        const newIdx = prev.indexOf(String(over.id));
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  const handleCellChange = (playerId: string, inning: number, val: string) => {
    setGrid(prev => {
      const playerPositions = [...(prev[playerId] ?? Array(9).fill(''))];
      playerPositions[inning] = val;
      return { ...prev, [playerId]: playerPositions };
    });
  };

  const handlePitcherChange = (idx: number, field: keyof PitcherAssignment, val: string | number) => {
    setPitcherAssignments(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
    setPopulated(false);
  };

  // ─── Save ────────────────────────────────────────────────────────────────────

  // Returns true if the save succeeded (lineup + game fields persisted).
  const performSave = async (): Promise<boolean> => {
    try {
      const { error: deleteErr } = await supabase.from('lineup').delete().eq('game_id', game.id);
      if (deleteErr) {
        console.error('lineup delete failed', deleteErr);
        setSaveError(`Save failed (delete): ${deleteErr.message}`);
        return false;
      }

      const entries = [
        ...battingOrder.map((playerId, idx) => ({
          game_id: game.id,
          player_id: playerId,
          is_scratch: false,
          batting_order: idx + 1,
          sit_count: gameSitCounts[playerId] ?? 0,
          positions: grid[playerId] ?? Array(9).fill(''),
        })),
        ...[...scratchIds].map(playerId => ({
          game_id: game.id,
          player_id: playerId,
          is_scratch: true,
          batting_order: null,
          sit_count: 0,
          positions: Array(9).fill(''),
        })),
      ];

      const { error: insertErr } = await supabase.from('lineup').insert(entries);
      if (insertErr) {
        console.error('lineup insert failed', insertErr);
        setSaveError(`Save failed (insert): ${insertErr.message}`);
        return false;
      }

      // Best-effort: save pitcher assignments, notes, and game result fields
      const { error: updateErr } = await supabase
        .from('games')
        .update({ pitcher_assignments: pitcherAssignments, notes, our_score: ourScore, opponent_score: opponentScore, innings_played: inningsPlayed })
        .eq('id', game.id);
      if (updateErr) {
        console.error('games update failed', updateErr);
        // Lineup is saved; warn but don't block
        setSaveError(`Lineup saved, but game fields failed: ${updateErr.message}`);
      }

      return true;
    } catch (e) {
      setSaveError(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    const ok = await performSave();
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  };

  // ─── Stat recompute ──────────────────────────────────────────────────────────

  const recomputePlayerStats = async () => {
    const INFIELD_POS = new Set(['1B', '2B', '3B', 'SS']);
    const OUTFIELD_POS = new Set(['LF', 'CF', 'RF']);

    // Fetch all completed games
    const { data: completedGames } = await supabase
      .from('games')
      .select('id, innings_played')
      .eq('is_complete', true);

    const totals: Record<string, { sits: number; infield: number; outfield: number }> = {};

    if (completedGames && completedGames.length > 0) {
      const gameIds = completedGames.map((g: { id: string }) => g.id);
      const inningsMap: Record<string, number | null> = {};
      completedGames.forEach((g: { id: string; innings_played: number | null }) => {
        inningsMap[g.id] = g.innings_played;
      });

      // Fetch all lineup entries for completed games
      const { data: entries } = await supabase
        .from('lineup')
        .select('player_id, game_id, positions, is_scratch')
        .in('game_id', gameIds);

      // Group entries by game so we can compute per-game scratch sit credit
      const entriesByGame: Record<string, { player_id: string; positions: string[]; is_scratch: boolean }[]> = {};
      for (const entry of entries ?? []) {
        if (!entriesByGame[entry.game_id]) entriesByGame[entry.game_id] = [];
        entriesByGame[entry.game_id].push(entry);
      }

      for (const [gameId, gameEntries] of Object.entries(entriesByGame)) {
        const limit = inningsMap[gameId] ?? 9;
        const activeEntries = gameEntries.filter(e => !e.is_scratch);
        const scratchEntries = gameEntries.filter(e => e.is_scratch);

        // Accumulate sits/infield/outfield for active players, tracking total sits for credit calc
        let totalGameSits = 0;
        for (const entry of activeEntries) {
          const positions: string[] = (entry.positions ?? []).slice(0, limit);
          if (!totals[entry.player_id]) totals[entry.player_id] = { sits: 0, infield: 0, outfield: 0 };
          for (const pos of positions) {
            if (pos === 'X') { totals[entry.player_id].sits++; totalGameSits++; }
            else if (INFIELD_POS.has(pos)) totals[entry.player_id].infield++;
            else if (OUTFIELD_POS.has(pos)) totals[entry.player_id].outfield++;
          }
        }

        // Award scratch sit credit: round(total sits / active player count)
        const scratchCredit = activeEntries.length > 0
          ? Math.round(totalGameSits / activeEntries.length)
          : 0;
        for (const entry of scratchEntries) {
          if (!totals[entry.player_id]) totals[entry.player_id] = { sits: 0, infield: 0, outfield: 0 };
          totals[entry.player_id].sits += scratchCredit;
        }
      }
    }

    // Write totals to all players (zeroing those with no completed game entries)
    const { data: allPlayersData } = await supabase.from('players').select('id');
    for (const player of allPlayersData ?? []) {
      const t = totals[player.id] ?? { sits: 0, infield: 0, outfield: 0 };
      await supabase.from('players').update({
        sit_count: t.sits,
        outfield_innings: t.outfield,
        infield_innings: t.infield,
      }).eq('id', player.id);
    }
  };

  // ─── Mark Complete / Reopen ──────────────────────────────────────────────────

  const handleMarkComplete = async () => {
    setSaving(true);
    setSaveError(null);
    const saved = await performSave();
    if (!saved) { setSaving(false); return; }
    const { error } = await supabase.from('games').update({ is_complete: true }).eq('id', game.id);
    if (error) {
      setSaveError(`Failed to mark complete: ${error.message}`);
      setSaving(false);
      return;
    }
    setIsComplete(true);
    await recomputePlayerStats();
    setSaving(false);
  };

  const handleReopen = async () => {
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from('games').update({ is_complete: false }).eq('id', game.id);
    if (error) {
      setSaveError(`Failed to reopen game: ${error.message}`);
      setSaving(false);
      return;
    }
    setIsComplete(false);
    await recomputePlayerStats();
    setSaving(false);
  };

  const handleSaveAsDefault = async () => {
    // Upsert a game with the 'default' tag if it doesn't exist
    let defaultGame: Game | null = null;
    const { data: existing } = await supabase
      .from('games').select('*').contains('tags', ['default']).limit(1);
    if (existing && existing.length > 0) {
      defaultGame = existing[0];
    } else {
      const { data: created } = await supabase.from('games').insert({
        starttime: new Date().toISOString(),
        location: '',
        opponent: 'Default',
        tags: ['default'],
      }).select().single();
      defaultGame = created;
    }
    if (!defaultGame) return;
    await supabase.from('lineup').delete().eq('game_id', defaultGame.id);
    const entries = battingOrder.map((playerId, idx) => ({
      game_id: defaultGame!.id,
      player_id: playerId,
      is_scratch: false,
      batting_order: idx + 1,
      sit_count: 0,
      positions: grid[playerId] ?? Array(9).fill(''),
    }));
    await supabase.from('lineup').insert(entries);
    setDefaultSaveSuccess(true);
    setTimeout(() => setDefaultSaveSuccess(false), 3000);
  };

  const handleExportPdf = () => {
    exportLineupPdf(game, battingOrder, playerMap, grid, scratchIds, notes, undefined, jerseyOverrides);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const pitcherPlayers = allPlayers.filter(p => p.preferred_positions?.includes('P'));
  const catcherPlayers = allPlayers.filter(p => p.preferred_positions?.includes('C'));

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="outlined" size="small" onClick={onClose}>← Back</Button>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {game.opponent} — {new Date(game.starttime).toLocaleDateString()} @ {game.location}
        </Typography>
      </Box>

      {/* Scratches */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Scratches</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {allPlayers.map(p => (
            <FormControlLabel
              key={p.id}
              control={
                <Checkbox
                  checked={scratchIds.has(p.id)}
                  onChange={e => handleScratchChange(p.id, e.target.checked)}
                  size="small"
                />
              }
              label={`${p.name}${p.jersey_number ? ` #${p.jersey_number}` : ''}`}
            />
          ))}
        </Box>
      </Paper>

      {/* Pitcher / Catcher */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Pitchers & Catchers</Typography>
        {pitcherAssignments.map((pa, idx) => (
          <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ minWidth: 80 }}>Pitcher {idx + 1}</Typography>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={pa.pitcherId}
                displayEmpty
                onChange={e => handlePitcherChange(idx, 'pitcherId', e.target.value)}
              >
                <MenuItem value=""><em>Select pitcher</em></MenuItem>
                {(pitcherPlayers.length > 0 ? pitcherPlayers : allPlayers)
                  .filter(p => !scratchIds.has(p.id))
                  .map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography sx={{ minWidth: 80 }}>Catcher</Typography>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={pa.catcherId}
                displayEmpty
                onChange={e => handlePitcherChange(idx, 'catcherId', e.target.value)}
              >
                <MenuItem value=""><em>Select catcher</em></MenuItem>
                {((expandCatcher[idx] ? allPlayers : catcherPlayers.length > 0 ? catcherPlayers : allPlayers))
                  .filter(p => !scratchIds.has(p.id))
                  .map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            <Button size="small" onClick={() => setExpandCatcher(prev => ({ ...prev, [idx]: !prev[idx] }))}>
              {expandCatcher[idx] ? 'Show preferred only' : 'Show all'}
            </Button>
            <Typography sx={{ minWidth: 80 }}>Starts inning</Typography>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={pa.startInning}
                onChange={e => handlePitcherChange(idx, 'startInning', Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map(i => <MenuItem key={i} value={i}>{i}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button size="small" variant="outlined"
            onClick={() => setPitcherAssignments(prev => [...prev, { pitcherId: '', catcherId: '', startInning: 6 }])}>
            + Add pitcher
          </Button>
          {pitcherAssignments.length > 1 && (
            <Button size="small" color="error"
              onClick={() => setPitcherAssignments(prev => prev.slice(0, -1))}>
              Remove last
            </Button>
          )}
          <Button size="small" variant="contained" onClick={() => populate(true)} sx={{ ml: 1 }}>
            Re-generate lineup
          </Button>
        </Box>
      </Paper>

      {/* Lineup grid */}
      <Paper sx={{ p: 2, mb: 2, overflowX: 'auto' }}>
        <Typography variant="h6" gutterBottom>Lineup</Typography>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={battingOrder} strategy={verticalListSortingStrategy}>
            <Table size="small" sx={{ tableLayout: 'auto' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 32, p: 0 }} />
                  <TableCell sx={{ width: 32, textAlign: 'center' }}>#</TableCell>
                  <TableCell sx={{ width: 36, textAlign: 'center' }}>Jsy</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>Name</TableCell>
                  {INNINGS.map((inn, innIdx) => {
                    const isDimmed = inningsPlayed !== null && inn > inningsPlayed;
                    return (
                      <TableCell key={inn} sx={{ textAlign: 'center', fontWeight: 700, p: 0.5, width: 48, opacity: isDimmed ? 0.35 : 1 }}>
                        <span style={{ color: inn > 5 ? '#aaa' : 'inherit' }}>{inn}</span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {battingOrder.map((playerId, idx) => {
                  const player = playerMap[playerId];
                  if (!player) return null;
                  return (
                    <SortableRow
                      key={playerId}
                      id={playerId}
                      order={idx + 1}
                      player={player}
                      entry={{ positions: grid[playerId] ?? Array(9).fill('') }}
                      isScratch={scratchIds.has(playerId)}
                      conflictCells={conflictCellsByPlayer[playerId] ?? new Set()}
                      jerseyOverride={jerseyOverrides[playerId] ?? null}
                      missingPositionsByInning={missingPositionsByInning}
                      inningsPlayed={inningsPlayed}
                      onCellChange={(inning, val) => handleCellChange(playerId, inning, val)}
                      onJerseyChange={val => setJerseyOverrides(prev => ({ ...prev, [playerId]: val }))}
                    />
                  );
                })}
                {/* Scratched players at the bottom */}
                {[...scratchIds].map(playerId => {
                  const player = playerMap[playerId];
                  if (!player || battingOrder.includes(playerId)) return null;
                  return (
                    <TableRow key={playerId} sx={{ bgcolor: '#fafafa' }}>
                      <TableCell colSpan={13} sx={{ color: '#999', fontStyle: 'italic', pl: 8 }}>
                        {player.name} — Scratch
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SortableContext>
        </DndContext>
      </Paper>

      {/* Summary */}
      <SummaryPanel
        battingOrder={battingOrder}
        playerMap={playerMap}
        grid={grid}
        scratchIds={scratchIds}
        gameSitCounts={gameSitCounts}
        conflicts={conflicts}
      />

      {/* Notes */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>Notes</Typography>
        <TextField
          multiline
          minRows={3}
          fullWidth
          placeholder="Goals, reminders, anything for the game card…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </Paper>

      {/* Game result */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Game Result
          {isComplete && <Chip label="✓ Final" color="success" size="small" sx={{ ml: 2 }} />}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Blue Jays"
            type="number"
            size="small"
            value={ourScore ?? ''}
            onChange={e => setOurScore(e.target.value === '' ? null : Number(e.target.value))}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{ width: 120 }}
          />
          <TextField
            label="Opponent"
            type="number"
            size="small"
            value={opponentScore ?? ''}
            onChange={e => setOpponentScore(e.target.value === '' ? null : Number(e.target.value))}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{ width: 120 }}
          />
          <TextField
            label="Innings played"
            type="number"
            size="small"
            value={inningsPlayed ?? ''}
            onChange={e => setInningsPlayed(e.target.value === '' ? null : Math.min(9, Math.max(1, Number(e.target.value))))}
            slotProps={{ htmlInput: { min: 1, max: 9 } }}
            sx={{ width: 140 }}
          />
        </Box>
      </Paper>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
          color={saveSuccess ? 'success' : 'primary'}
        >
          {saving ? 'Saving…' : saveSuccess ? 'Saved ✓' : 'Save'}
        </Button>
        {isComplete ? (
          <Button variant="outlined" color="warning" onClick={handleReopen} disabled={saving}>
            Reopen
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleMarkComplete}
            disabled={saving || ourScore === null || opponentScore === null || !inningsPlayed}
          >
            Mark Complete
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={handleSaveAsDefault}
          color={defaultSaveSuccess ? 'success' : 'primary'}
        >
          {defaultSaveSuccess ? 'Saved ✓' : 'Save as Default'}
        </Button>
        <Button variant="outlined" onClick={handleExportPdf}>
          Export PDF
        </Button>
        {saveError && (
          <Alert severity="error" onClose={() => setSaveError(null)} sx={{ py: 0 }}>
            {saveError}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
