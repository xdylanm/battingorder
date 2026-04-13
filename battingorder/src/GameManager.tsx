import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Button, TextField, List, ListItem, ListItemText, IconButton, Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { Game } from './types';

interface Props {
  onSelectGame: (game: Game) => void;
}

export default function GameManager({ onSelectGame }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    starttime: '',
    location: '',
    opponent: '',
    tags: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  async function fetchGames() {
    setLoading(true);
    const { data, error } = await supabase.from('games').select('*').order('starttime', { ascending: false });
    if (!error && data) setGames(data);
    setLoading(false);
  }

  async function addGame(e: React.FormEvent) {
    e.preventDefault();
    // Convert local datetime-local input to ISO string in local timezone
    const localDate = new Date(form.starttime);
    await supabase.from('games').insert({
        starttime: localDate,
        location: form.location,
        opponent: form.opponent,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    });
    setForm({ starttime: '', location: '', opponent: '', tags: '' });
    setOpen(false);
    fetchGames();
  }

  async function deleteGame(id: string) {
    await supabase.from('games').delete().eq('id', id);
    fetchGames();
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <h2>Games</h2>
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mb: 2 }}>Add Game</Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Game</DialogTitle>
        <form onSubmit={addGame}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Start Time"
              type="datetime-local"
              value={form.starttime}
              onChange={e => setForm(f => ({ ...f, starttime: e.target.value }))}
              required
            />
            <TextField
              label="Location"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              required
            />
            <TextField
              label="Opponent"
              value={form.opponent}
              onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))}
              required
            />
            <TextField
              label="Tags (comma separated)"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add</Button>
          </DialogActions>
        </form>
      </Dialog>
      <List>
        {loading ? <ListItem>Loading...</ListItem> : games.map(game => (
          <ListItem key={game.id} secondaryAction={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton edge="end" aria-label="edit lineup" onClick={() => onSelectGame(game)}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" aria-label="delete" onClick={() => deleteGame(game.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          }>
            <ListItemText
              primary={`${new Date(game.starttime).toLocaleString()} — ${game.opponent} @ ${game.location}`}
              secondary={game.tags?.length ? `Tags: ${game.tags.join(', ')}` : ''}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
