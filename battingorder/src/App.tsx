import { useState } from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Button } from '@mui/material';
import { AuthProvider, useAuth } from './AuthContext';
import PlayerManager from './PlayerManager';
import GameManager from './GameManager';
import LineupEditor from './LineupEditor';
import type { Game } from './types';
import './App.css';

function AppContent() {
  const { user, loading, signIn, signOut } = useAuth();
  const [tab, setTab] = useState(0);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}>Loading…</Box>;

  if (!user) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10 }}>
        <Typography variant="h4" gutterBottom>Batting Order</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Sign in to manage your team's lineup</Typography>
        <Button variant="contained" size="large" onClick={signIn}>Sign in with Google</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>⚾ Batting Order</Typography>
          <Typography sx={{ mr: 2, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{user.email}</Typography>
          <Button color="inherit" size="small" onClick={signOut}>Sign out</Button>
        </Toolbar>
      </AppBar>

      {selectedGame ? (
        <LineupEditor game={selectedGame} onClose={() => setSelectedGame(null)} />
      ) : (
        <>
          <Box sx={{ bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
              <Tab label="Games" />
              <Tab label="Players" />
            </Tabs>
          </Box>
          <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {tab === 0 && <GameManager onSelectGame={setSelectedGame} />}
            {tab === 1 && <PlayerManager />}
          </Box>
        </>
      )}
    </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
