import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { Button, TextField, List, ListItem, ListItemText, IconButton, Box, Dialog, DialogTitle, DialogContent, DialogActions, Divider, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { Game } from './types';

interface Props {
  onSelectGame: (game: Game) => void;
}

export default function GameManager({ onSelectGame }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [open, setOpen] = useState(false);
  const [showPast, setShowPast] = useState(false);
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
    const { data, error } = await supabase.from('games').select('*').order('starttime', { ascending: true });
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

  async function handleEditDefault() {
    const { data: existing } = await supabase
      .from('games').select('*').contains('tags', ['default']).limit(1);
    if (existing && existing.length > 0) {
      onSelectGame(existing[0]);
      return;
    }
    const { data: created } = await supabase.from('games').insert({
      starttime: new Date().toISOString(),
      location: '',
      opponent: 'Default',
      tags: ['default'],
    }).select().single();
    if (created) onSelectGame(created);
  }

  const now = new Date();
  const nonDefaultGames = games.filter(g => !g.tags?.includes('default'));
  const upcomingGames = nonDefaultGames.filter(g => new Date(g.starttime) >= now);
  const pastGames = nonDefaultGames.filter(g => new Date(g.starttime) < now).reverse();

  function GameListItem({ game }: { game: Game }) {
    return (
      <ListItem secondaryAction={
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
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <h2>Games</h2>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => setOpen(true)}>Add Game</Button>
        <Button variant="outlined" onClick={handleEditDefault}>Edit Default Lineup</Button>
      </Box>
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
        {loading ? (
          <ListItem>Loading...</ListItem>
        ) : (
          <>
            {upcomingGames.length === 0 && (
              <ListItem><ListItemText primary="No upcoming games" /></ListItem>
            )}
            {upcomingGames.map(game => <GameListItem key={game.id} game={game} />)}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ px: 2, py: 0.5 }}>
              <Button size="small" onClick={() => setShowPast(p => !p)}>
                {showPast ? 'Hide Past Games' : `Show Past Games (${pastGames.length})`}
              </Button>
            </Box>
            {showPast && (
              <>
                <Typography variant="caption" sx={{ px: 2, color: 'text.secondary' }}>Past Games</Typography>
                {pastGames.map(game => <GameListItem key={game.id} game={game} />)}
              </>
            )}
          </>
        )}
      </List>
    </Box>
  );
}
