import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>
        <h2>Sign in to continue</h2>
        <button onClick={signInWithGoogle} style={{ padding: '10px 20px', fontSize: 16 }}>Sign in with Google</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>
      <h2>Welcome, {user.email}</h2>
      <button onClick={signOut} style={{ padding: '10px 20px', fontSize: 16 }}>Sign out</button>
    </div>
  );
}
