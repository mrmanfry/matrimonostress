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
  weddingId: string;
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

const RPC_TIMEOUT_MS = 45000;

async function loadUserContextWithTimeout(): Promise<WeddingContext[]> {
  console.log('[AuthContext] ⚡ Fetching user context via RPC...');
  
  const rpcPromise = supabase.rpc('get_user_context').then(({ data, error }) => {
    if (error) throw error;
    return parseWeddingsFromRpc(data);
  });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('RPC timeout: get_user_context exceeded 45s')), RPC_TIMEOUT_MS)
  );

  const weddings = await Promise.race([rpcPromise, timeoutPromise]);
  console.log('[AuthContext] ✅ Weddings resolved:', weddings.length);
  return weddings;
}

// --- Provider ---

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const isLoadingContext = useRef(false);
  const lastProcessedUserId = useRef<string | null>(null);
  // Track whether we're in the initial page load phase
  const authStateRef = useRef<AuthState>({ status: "loading" });

  // Keep ref in sync with state for synchronous reads inside callbacks
  const updateAuthState = useCallback((newState: AuthState | ((prev: AuthState) => AuthState)) => {
    setAuthState(prev => {
      const resolved = typeof newState === 'function' ? newState(prev) : newState;
      authStateRef.current = resolved;
      return resolved;
    });
  }, []);

  const handleAuthSession = useCallback(async (session: Session) => {
    // Only guard: skip if same user already fully processed
    if (lastProcessedUserId.current === session.user.id) {
      console.log('[AuthContext] Same user already processed, skipping');
      return;
    }
    
    try {
      const weddings = await loadUserContextWithTimeout();
      
      if (weddings.length > 0) {
        const cached = weddingStorage.get();
        const active = resolveActiveWedding(weddings, cached);
        
        if (active) {
          weddingStorage.set(active.weddingId);
          updateAuthState({
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
        updateAuthState({
          status: "no_wedding",
          user: session.user,
          session
        });
      }
      
      lastProcessedUserId.current = session.user.id;
    } catch (error) {
      console.error('[AuthContext] Error finalizing auth session:', error);
      updateAuthState({
        status: "authenticated_wedding_error",
        user: session.user,
        session,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }, [updateAuthState]);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!session && mounted) {
          updateAuthState({ status: "unauthenticated" });
        }
        // If session exists, INITIAL_SESSION from onAuthStateChange will handle it
      } catch (error) {
        console.error('[AuthContext] Init session error:', error);
        if (mounted) {
          updateAuthState({
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
          isLoadingContext.current = false;
          updateAuthState({ status: "unauthenticated" });
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          updateAuthState(prev => {
            if (prev.status === 'authenticated') return { ...prev, session };
            if (prev.status === 'authenticated_wedding_error' || prev.status === 'no_wedding') return { ...prev, session };
            return prev;
          });
          return;
        }

        // Determine if we should process this event
        let shouldProcess = false;

        if (event === 'INITIAL_SESSION') {
          // Always process INITIAL_SESSION — it's the definitive first-load signal
          shouldProcess = true;
        }

        if (event === 'SIGNED_IN') {
          // Only process SIGNED_IN if we're NOT in the initial loading phase
          // (i.e., user just logged in during this session, not a page reload)
          if (authStateRef.current.status !== 'loading') {
            shouldProcess = true;
          } else {
            console.log('[AuthContext] Ignoring SIGNED_IN during initial load (INITIAL_SESSION will handle it)');
          }
        }

        if (!shouldProcess) return;

        // Synchronous lock: only one caller can enter at a time
        if (isLoadingContext.current) {
          console.log('[AuthContext] Lock active, skipping duplicate event');
          return;
        }
        if (lastProcessedUserId.current === session.user.id) {
          console.log('[AuthContext] User already processed, skipping');
          return;
        }

        isLoadingContext.current = true;
        try {
          await handleAuthSession(session);
        } finally {
          isLoadingContext.current = false;
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthSession, updateAuthState]);

  const switchWedding = useCallback((weddingId: string) => {
    updateAuthState(prev => {
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
  }, [updateAuthState]);

  const signOut = async () => {
    await supabase.auth.signOut();
    weddingStorage.clear();
    lastProcessedUserId.current = null;
    isLoadingContext.current = false;
    updateAuthState({ status: "unauthenticated" });
  };

  const refreshAuth = async () => {
    lastProcessedUserId.current = null;
    isLoadingContext.current = false;
    updateAuthState({ status: "loading" });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      isLoadingContext.current = true;
      try {
        await handleAuthSession(session);
      } finally {
        isLoadingContext.current = false;
      }
    } else {
      updateAuthState({ status: "unauthenticated" });
    }
  };

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
