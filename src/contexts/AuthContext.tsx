import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback, useMemo } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { weddingStorage } from "@/utils/weddingStorage";
import { modeStorage, ActiveMode } from "@/utils/modeStorage";

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
  | { status: "authenticated"; user: User; session: Session; weddings: WeddingContext[]; activeWeddingId: string; activeRole: string; activePermissions: PermissionsConfig | null; activeMode: ActiveMode }
  | { status: "no_wedding"; user: User; session: Session }
  | { status: "authenticated_wedding_error"; user: User; session: Session; error: Error }
  | { status: "error"; error: Error };

interface AuthContextType {
  authState: AuthState;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  switchWedding: (weddingId: string) => void;
  switchMode: (mode: ActiveMode) => void;
  weddingId: string;
  isPlanner: boolean;
  hasMultiplePersonas: boolean;
  activeMode: ActiveMode;
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

/** Determine if user has both couple and planner personas */
function computePersonas(weddings: WeddingContext[]) {
  // "Planner persona" = has any role that manages someone else's wedding (planner or manager)
  const hasPlannerRole = weddings.some(w => w.role === 'planner' || w.role === 'manager');
  // "Couple persona" = has own wedding (co_planner role = owner/partner)
  const hasCoupleRole = weddings.some(w => w.role === 'co_planner');
  return { hasPlannerRole, hasCoupleRole, hasMultiplePersonas: hasPlannerRole && hasCoupleRole };
}

/** Infer initial activeMode based on roles */
function inferActiveMode(weddings: WeddingContext[]): ActiveMode {
  const cached = modeStorage.get();
  const { hasPlannerRole, hasCoupleRole } = computePersonas(weddings);
  
  if (cached) {
    // Validate cached mode still makes sense
    if (cached === 'planner' && hasPlannerRole) return 'planner';
    if (cached === 'couple' && hasCoupleRole) return 'couple';
  }
  
  // Default inference
  if (hasPlannerRole && !hasCoupleRole) return 'planner';
  return 'couple';
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
  const authStateRef = useRef<AuthState>({ status: "loading" });

  const updateAuthState = useCallback((newState: AuthState | ((prev: AuthState) => AuthState)) => {
    setAuthState(prev => {
      const resolved = typeof newState === 'function' ? newState(prev) : newState;
      authStateRef.current = resolved;
      return resolved;
    });
  }, []);

  const handleAuthSession = useCallback(async (session: Session) => {
    if (lastProcessedUserId.current === session.user.id) {
      console.log('[AuthContext] Same user already processed, skipping');
      return;
    }
    
    try {
      const weddings = await loadUserContextWithTimeout();
      
      if (weddings.length > 0) {
        const cached = weddingStorage.get();
        const active = resolveActiveWedding(weddings, cached);
        const mode = inferActiveMode(weddings);
        modeStorage.set(mode);
        
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
            activeMode: mode,
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
          modeStorage.clear();
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

        let shouldProcess = false;

        if (event === 'INITIAL_SESSION') {
          shouldProcess = true;
        }

        if (event === 'SIGNED_IN') {
          if (authStateRef.current.status !== 'loading') {
            shouldProcess = true;
          } else {
            console.log('[AuthContext] Ignoring SIGNED_IN during initial load (INITIAL_SESSION will handle it)');
          }
        }

        if (!shouldProcess) return;

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

  const switchMode = useCallback((mode: ActiveMode) => {
    modeStorage.set(mode);
    updateAuthState(prev => {
      if (prev.status !== 'authenticated') return prev;
      return { ...prev, activeMode: mode };
    });
  }, [updateAuthState]);

  const signOut = async () => {
    await supabase.auth.signOut();
    weddingStorage.clear();
    modeStorage.clear();
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
  const activeMode: ActiveMode = authState.status === 'authenticated' ? authState.activeMode : 'couple';
  
  const hasMultiplePersonas = useMemo(() => {
    if (authState.status !== 'authenticated') return false;
    return computePersonas(authState.weddings).hasMultiplePersonas;
  }, [authState]);

  return (
    <AuthContext.Provider value={{ authState, signOut, refreshAuth, switchWedding, switchMode, weddingId, isPlanner, hasMultiplePersonas, activeMode }}>
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
