import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAllowed: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  redeemToken: (token: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAllowed: false,
  signIn: async () => {},
  signOut: async () => {},
  redeemToken: async () => ({ success: false }),
});

async function checkAllowed(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('allowed_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) setIsAllowed(await checkAllowed(u.id));
      setLoading(false);
    }
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        setIsAllowed(await checkAllowed(u.id));
      } else {
        setIsAllowed(false);
      }
    });
    return () => { listener.subscription.unsubscribe(); };
  }, []);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAllowed(false);
  };

  const redeemToken = async (token: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not signed in' };
    const normalized = token.trim().toUpperCase();
    const { data: tokenRow, error: lookupErr } = await supabase
      .from('invite_tokens')
      .select('token, used')
      .eq('token', normalized)
      .maybeSingle();
    if (lookupErr) return { success: false, error: `Database error: ${lookupErr.message}` };
    if (!tokenRow) return { success: false, error: 'Invalid invite code' };
    if (tokenRow.used) return { success: false, error: 'Invite code already used' };
    const { error: updateErr } = await supabase
      .from('invite_tokens')
      .update({ used: true, used_by: user.id })
      .eq('token', normalized);
    if (updateErr) return { success: false, error: `Failed to redeem code: ${updateErr.message}` };
    const { error: insertErr } = await supabase
      .from('allowed_users')
      .insert({ user_id: user.id });
    if (insertErr && insertErr.code !== '23505') {
      return { success: false, error: `Failed to register: ${insertErr.message}` };
    }
    setIsAllowed(true);
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAllowed, signIn, signOut, redeemToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
