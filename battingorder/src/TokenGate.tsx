import { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { useAuth } from './AuthContext';

export default function TokenGate() {
  const { user, signOut, redeemToken } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await redeemToken(token);
      if (!result.success) {
        setError(result.error ?? 'Unknown error');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 10, px: 2 }}>
      <Typography variant="h4" gutterBottom>Batting Order</Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        Signed in as <strong>{user?.email}</strong>
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enter your invite code to get access.
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 320 }}>
        <TextField
          label="Invite code"
          value={token}
          onChange={e => setToken(e.target.value.toUpperCase())}
          fullWidth
          autoFocus
          inputProps={{ maxLength: 10, style: { letterSpacing: 4, fontFamily: 'monospace', fontSize: 20 } }}
          sx={{ mb: 2 }}
          placeholder="A123BC4"
        />
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Button
          type="submit"
          variant="contained"
          fullWidth
          disabled={submitting || !token.trim()}
          startIcon={submitting ? <CircularProgress size={16} /> : undefined}
        >
          {submitting ? 'Checking…' : 'Submit'}
        </Button>
        <Button fullWidth sx={{ mt: 1 }} onClick={signOut} color="inherit" size="small">
          Sign out
        </Button>
      </Box>
    </Box>
  );
}
