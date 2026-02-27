import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { weddingStorage } from "@/utils/weddingStorage";

// --- Types ---

export interface PermissionsConfig {
  budget_visible?: boolean;
  vendor_costs_visible?: boolean;
}

export interface WeddingContext {
  weddingId: string;
  role: string;
  permissionsConfig: PermissionsConfig | null;
  partner1Name: string;
  partner2Name: string;
  weddingDate: string;
}

type AuthState = 
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User; session: Session; weddings: WeddingContext[]; activeWeddingId: string; activeRole: string; activePermissions: PermissionsConfig | null }
  | { status: "no_wedding"; user: User; session: Session }
  | { status: "authenticated_wedding_error"; user: User; session: Session; error: Error }
  | { status: "error"; error: Error };

interface AuthContextType {
  authState: AuthState;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  switchWedding: (weddingId: string) => void;
  /** Convenience: currently active weddingId (or empty string) */
  weddingId: string;
  /** Convenience: true if active role is 'planner' */
  isPlanner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Helpers ---

function parseWeddingsFromRpc(data: any): WeddingContext[] {
  if (!data || !data.weddings || !Array.isArray(data.weddings)) return [];
  return data.weddings.map((w: any) => ({
    weddingId: w.wedding_id,
    role: w.role || 'owner',
    permissionsConfig: w.permissions_config || null,
    partner1Name: w.partner1_name || '',
    partner2Name: w.partner2_name || '',
    weddingDate: w.wedding_date || '',
  }));
}

function resolveActiveWedding(weddings: WeddingContext[], cachedId: string | null): WeddingContext | null {
  if (weddings.length === 0) return null;
  if (cachedId) {
    const found = weddings.find(w => w.weddingId === cachedId);
    if (found) return found;
  }
  return weddings[0];
}

// --- Provider ---

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const isLoadingContext = useRef(false);
  const lastProcessedUserId = useRef<string | null>(null);

  const loadUserContext = useCallback(async (): Promise<WeddingContext[]> => {
    console.log('[AuthContext] ⚡ Fetching user context via RPC...');
    const { data, error } = await supabase.rpc('get_user_context');
    if (error) {
      console.error('[AuthContext] RPC Error:', error);
      throw error;
    }
    const weddings = parseWeddingsFromRpc(data);
    console.log('[AuthContext] ✅ Weddings resolved:', weddings.length);
    return weddings;
  }, []);

  const handleAuthSession = useCallback(async (session: Session) => {
    if (isLoadingContext.current) {
      console.log('[AuthContext] handleAuthSession already running, skipping');
      return;
    }
    
    if (lastProcessedUserId.current === session.user.id) {
      console.log('[AuthContext] Same user already processed, skipping');
      return;
    }
    
    isLoadingContext.current = true;
    
    try {
      const weddings = await loadUserContext();
      
      if (weddings.length > 0) {
        const cached = weddingStorage.get();
        const active = resolveActiveWedding(weddings, cached);
        
        if (active) {
          weddingStorage.set(active.weddingId);
          setAuthState({
            status: "authenticated",
            user: session.user,
            session,
            weddings,
            activeWeddingId: active.weddingId,
            activeRole: active.role,
            activePermissions: active.permissionsConfig,
          });
        }
      } else {
        console.log('[AuthContext] User logged in but needs onboarding');
        setAuthState({
          status: "no_wedding",
          user: session.user,
          session
        });
      }
      
      lastProcessedUserId.current = session.user.id;
    } catch (error) {
      console.error('[AuthContext] Error finalizing auth session:', error);
      setAuthState({
        status: "authenticated_wedding_error",
        user: session.user,
        session,
        error: error instanceof Error ? error : new Error(String(error))
      });
    } finally {
      isLoadingContext.current = false;
    }
  }, [loadUserContext]);

  useEffect(() => {
    let mounted = true;

    // We rely SOLELY on onAuthStateChange to trigger handleAuthSession.
    // initSession only sets unauthenticated if there's no session at all,
    // avoiding the race condition where both initSession and onAuthStateChange
    // would call handleAuthSession simultaneously.
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session && mounted) {
          setAuthState({ status: "unauthenticated" });
        }
        // If session exists, do NOT call handleAuthSession here.
        // onAuthStateChange(INITIAL_SESSION) will handle it.
      } catch (error) {
        console.error('[AuthContext] Init session error:', error);
        if (mounted) {
          setAuthState({
            status: "error",
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log(`[AuthContext] Auth event: ${event}`);

        if (event === 'SIGNED_OUT' || !session) {
          weddingStorage.clear();
          lastProcessedUserId.current = null;
          setAuthState({ status: "unauthenticated" });
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          setAuthState(prev => {
            if (prev.status === 'authenticated') {
              return { ...prev, session };
            }
            if (prev.status === 'authenticated_wedding_error' || prev.status === 'no_wedding') {
              return { ...prev, session };
            }
            return prev;
          });
          return;
        }

        if (event === 'SIGNED_IN') {
          if (!isLoadingContext.current && lastProcessedUserId.current !== session.user.id) {
            await handleAuthSession(session);
          }
        }

        if (event === 'INITIAL_SESSION') {
          if (!isLoadingContext.current) {
            await handleAuthSession(session);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthSession]);

  const switchWedding = useCallback((weddingId: string) => {
    setAuthState(prev => {
      if (prev.status !== 'authenticated') return prev;
      const target = prev.weddings.find(w => w.weddingId === weddingId);
      if (!target) return prev;
      weddingStorage.set(weddingId);
      return {
        ...prev,
        activeWeddingId: target.weddingId,
        activeRole: target.role,
        activePermissions: target.permissionsConfig,
      };
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    weddingStorage.clear();
    lastProcessedUserId.current = null;
    setAuthState({ status: "unauthenticated" });
  };

  const refreshAuth = async () => {
    lastProcessedUserId.current = null;
    setAuthState({ status: "loading" });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await handleAuthSession(session);
    } else {
      setAuthState({ status: "unauthenticated" });
    }
  };

  // Convenience derived values
  const weddingId = authState.status === 'authenticated' ? authState.activeWeddingId : '';
  const isPlanner = authState.status === 'authenticated' && authState.activeRole === 'planner';

  return (
    <AuthContext.Provider value={{ authState, signOut, refreshAuth, switchWedding, weddingId, isPlanner }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
