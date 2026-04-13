import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Button, TextField, List, ListItem, ListItemText, IconButton, Chip, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Player } from './types';

const POSITIONS = [
  'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'Bench'
];

export default function PlayerManager() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState<number | ''>('');
  const [preferred, setPreferred] = useState<string[]>([]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  async function fetchPlayers() {
    setLoading(true);
    const { data, error } = await supabase.from('players').select('*').order('name');
    if (!error && data) setPlayers(data);
    setLoading(false);
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase.from('players').insert({
      name,
      jersey_number: jerseyNumber === '' ? null : jerseyNumber,
      preferred_positions: preferred,
      avoid_positions: avoid,
      sit_count: 0,
    });
    setName(''); setJerseyNumber(''); setPreferred([]); setAvoid([]);
    fetchPlayers();
  }

  async function deletePlayer(id: string) {
    await supabase.from('players').delete().eq('id', id);
    fetchPlayers();
  }

  function togglePosition(list: string[], pos: string, setter: (v: string[]) => void) {
    setter(list.includes(pos) ? list.filter(p => p !== pos) : [...list, pos]);
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <h2>Players</h2>
      <form onSubmit={addPlayer} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <TextField label="Name" value={name} onChange={e => setName(e.target.value)} required />
        <TextField
          label="Jersey Number"
          type="number"
          value={jerseyNumber}
          onChange={e => setJerseyNumber(e.target.value === '' ? '' : Number(e.target.value))}
          slotProps={{ htmlInput: { min: 0 } }}
        />
        <div>
          <span>Preferred positions: </span>
          {POSITIONS.filter(p => p !== 'Bench').map(pos => (
            <Chip
              key={pos}
              label={pos}
              color={preferred.includes(pos) ? 'primary' : 'default'}
              onClick={() => togglePosition(preferred, pos, setPreferred)}
              sx={{ m: 0.5 }}
            />
          ))}
        </div>
        <div>
          <span>Avoid positions: </span>
          {POSITIONS.filter(p => p !== 'Bench').map(pos => (
            <Chip
              key={pos}
              label={pos}
              color={avoid.includes(pos) ? 'secondary' : 'default'}
              onClick={() => togglePosition(avoid, pos, setAvoid)}
              sx={{ m: 0.5 }}
            />
          ))}
        </div>
        {/* is_scratch removed, as it is a per-game property */}
        <Button type="submit" variant="contained">Add Player</Button>
      </form>
      <List>
        {loading ? <ListItem>Loading...</ListItem> : players.map(player => (
          <ListItem key={player.id} secondaryAction={
            <IconButton edge="end" aria-label="delete" onClick={() => deletePlayer(player.id)}>
              <DeleteIcon />
            </IconButton>
          }>
            <ListItemText
              primary={`${player.name}${player.jersey_number ? ` (#${player.jersey_number})` : ''}`}
              secondary={
                <>
                  Pref: {player.preferred_positions?.join(', ') || '-'} | Avoid: {player.avoid_positions?.join(', ') || '-'} | Sits: {player.sit_count}
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
