import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearCachedAuthSession() {
  if (typeof window === 'undefined') return;

  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        window.localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.warn('Unable to clear cached auth session:', err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let validationVersion = 0;
    let initialAuthFallback: number | undefined;

    const applyAuthState = (nextSession: Session | null, nextUser: User | null, version: number) => {
      if (!isMounted || version !== validationVersion) return;

      if (initialAuthFallback) {
        window.clearTimeout(initialAuthFallback);
        initialAuthFallback = undefined;
      }

      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);
    };

    const syncOAuthProfile = (activeSession: Session) => {
      const meta = activeSession.user.user_metadata;
      const avatarUrl = meta?.avatar_url || meta?.picture;
      const fullName = meta?.full_name || meta?.name;

      if (!avatarUrl && !fullName) return;

      setTimeout(async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, full_name')
            .eq('id', activeSession.user.id)
            .maybeSingle();

          if (profile) {
            const updates: Record<string, string> = {};
            if (!profile.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;
            if (!profile.full_name && fullName) updates.full_name = fullName;

            if (Object.keys(updates).length > 0) {
              await supabase
                .from('profiles')
                .update(updates)
                .eq('id', activeSession.user.id);
            }
          }
        } catch (err) {
          console.error('Failed to sync profile from OAuth:', err);
        }
      }, 0);
    };

    const validateOrRecoverSession = async (
      candidateSession: Session | null,
      shouldSyncOAuthProfile: boolean = false,
    ) => {
      const version = ++validationVersion;

      if (!candidateSession) {
        applyAuthState(null, null, version);
        return;
      }

      const finalize = (nextSession: Session, nextUser: User) => {
        applyAuthState(nextSession, nextUser, version);
        if (shouldSyncOAuthProfile) {
          syncOAuthProfile({ ...nextSession, user: nextUser });
        }
      };

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser(candidateSession.access_token);

        if (!userError && userData.user) {
          finalize(candidateSession, userData.user);
          return;
        }

        const authMessage = `${userError?.message || ''} ${
          (userError as { code?: string } | null)?.code || ''
        }`.toLowerCase();
        const shouldAttemptRefresh = /session|jwt|token|unauthorized|expired|missing|not found|not exist/.test(authMessage);

        if (!shouldAttemptRefresh) {
          console.error('Failed to validate session:', userError);
          finalize(candidateSession, candidateSession.user);
          return;
        }

        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshed.session?.user) {
          console.warn('Session recovery failed, signing out:', refreshError ?? userError);
          await supabase.auth.signOut().catch(() => undefined);
          clearCachedAuthSession();
          applyAuthState(null, null, version);
          return;
        }

        finalize(refreshed.session, refreshed.session.user);
      } catch (err) {
        console.error('Unexpected session validation error:', err);
        finalize(candidateSession, candidateSession.user);
      }
    };

    // Set up auth state listener FIRST
    initialAuthFallback = window.setTimeout(() => {
      if (!isMounted) return;

      console.warn('Auth initialization timed out; clearing cached session.');
      const version = ++validationVersion;
      clearCachedAuthSession();
      applyAuthState(null, null, version);
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === 'SIGNED_OUT') {
          const version = ++validationVersion;
          clearCachedAuthSession();
          applyAuthState(null, null, version);
          return;
        }

        setTimeout(() => {
          void validateOrRecoverSession(nextSession, event === 'SIGNED_IN');
        }, 0);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(({ data: { session: existingSession } }) => {
        void validateOrRecoverSession(existingSession);
      })
      .catch((err) => {
        console.error('Failed to initialize auth session:', err);
        const version = ++validationVersion;
        clearCachedAuthSession();
        applyAuthState(null, null, version);
      });

    return () => {
      isMounted = false;
      if (initialAuthFallback) window.clearTimeout(initialAuthFallback);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      clearCachedAuthSession();
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
