import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabase';
import type { Tables } from '../types/database.types';

export type Profile = Tables<'profiles'> & {
  clubs: Pick<Tables<'clubs'>, 'id' | 'name' | 'invite_code'> | null;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  isLoading: true,
  isAdmin: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, clubs(id, name, invite_code)')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Failed to load profile:', error.message);
    return null;
  }
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id;
    setProfile(userId ? await fetchProfile(userId) : null);
  }, [session?.user.id]);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (data.session) {
        const p = await fetchProfile(data.session.user.id);
        if (isMounted) setProfile(p);
      }
      if (isMounted) setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, next) => {
      if (!isMounted) return;
      setSession(next);
      // A different coach may sign in on this device — never serve them the
      // previous account's cached data.
      if (event === 'SIGNED_IN') queryClient.invalidateQueries();
      if (event === 'SIGNED_OUT') queryClient.clear();
      if (next) {
        const p = await fetchProfile(next.user.id);
        if (isMounted) setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isLoading,
        isAdmin: profile?.role === 'admin',
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
