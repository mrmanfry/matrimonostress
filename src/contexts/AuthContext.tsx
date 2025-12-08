import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { retryWithBackoff } from "@/utils/retryWithBackoff";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { weddingStorage } from "@/utils/weddingStorage";

type AuthState = 
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User; session: Session; weddingId: string | null }
  | { status: "error"; error: Error };

interface AuthContextType {
  authState: AuthState;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const loadWeddingIdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_MS = 500;

  const loadSession = async () => {
    try {
      const { data, error } = await retryWithBackoff(
        () => supabase.auth.getSession(),
        {
          maxAttempts: 3,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            console.log(`Auth retry attempt ${attempt}:`, error.message);
          }
        }
      );

      if (error) throw error;

      if (data.session) {
        // Get previous weddingId if available
        const previousWeddingId = authState.status === 'authenticated' ? authState.weddingId : null;
        
        // Load wedding_id for the user
        const weddingId = await loadWeddingId(data.session.user.id, previousWeddingId);
        
        setAuthState({
          status: "authenticated",
          user: data.session.user,
          session: data.session,
          weddingId,
        });
      } else {
        setAuthState({ status: "unauthenticated" });
      }
    } catch (error) {
      console.error("Auth error:", error);
      setAuthState({
        status: "error",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  };

  const loadWeddingId = async (userId: string, previousWeddingId?: string | null): Promise<string | null> => {
    console.log('[AuthContext] Loading weddingId for user:', userId);
    
    // 1. Recupera ID dalla cache
    const cachedWeddingId = previousWeddingId || weddingStorage.get();
    console.log('[AuthContext] Cached weddingId:', cachedWeddingId || 'none');
    
    // Se non c'è cache, dobbiamo per forza aspettare il DB
    if (!cachedWeddingId) {
      console.log('[AuthContext] No cache, fetching from DB...');
      try {
        const roleQuery = async () => {
          const result = await supabase
            .from("user_roles")
            .select("wedding_id")
            .eq("user_id", userId)
            .maybeSingle();
          console.log('[AuthContext] User role query completed:', result.data);
          return result;
        };
        
        const weddingQuery = async () => {
          const result = await supabase
            .from("weddings")
            .select("id")
            .eq("created_by", userId)
            .maybeSingle();
          console.log('[AuthContext] Wedding query completed:', result.data);
          return result;
        };
        
        // Timeout più rilassato (15s) per il primo caricamento
        const [roleResult, weddingResult] = await Promise.all([
          fetchWithTimeout(roleQuery, 15000, null),
          fetchWithTimeout(weddingQuery, 15000, null)
        ]);
        
        if (roleResult?.data?.wedding_id) {
          console.log('[AuthContext] Found weddingId from role:', roleResult.data.wedding_id);
          weddingStorage.set(roleResult.data.wedding_id);
          return roleResult.data.wedding_id;
        }
        
        if (weddingResult?.data?.id) {
          console.log('[AuthContext] Found weddingId from weddings:', weddingResult.data.id);
          weddingStorage.set(weddingResult.data.id);
          return weddingResult.data.id;
        }
        
        console.log('[AuthContext] No weddingId found in DB queries');
        return null;
      } catch (error) {
        console.error('[AuthContext] Error loading fresh wedding_id:', error);
        return null;
      }
    }
    
    // 2. Se ABBIAMO la cache, la verifichiamo in background ma SENZA bloccare
    console.log('[AuthContext] Verifying cached weddingId:', cachedWeddingId);
    try {
      // Query diretta senza timeout wrapper - se fallisce, ci fidiamo della cache
      const { data, error } = await supabase
        .from('weddings')
        .select('id')
        .eq('id', cachedWeddingId)
        .maybeSingle();

      if (error) throw error;

      // 3. Solo se il DB dice ESPLICITAMENTE "Non esiste" (data è null ma senza errori di rete)
      // allora invalidiamo la cache.
      if (!data) {
        console.warn('[AuthContext] DB confirmed cached weddingId is invalid. Clearing cache.');
        weddingStorage.clear();
        // Tentiamo di ricaricare dal DB
        return loadWeddingId(userId, null);
      }

      console.log('[AuthContext] Cached weddingId validated:', cachedWeddingId);
      return cachedWeddingId;

    } catch (error) {
      // 4. FIX SALVAVITA: Se c'è errore di rete/timeout, CI FIDIAMO DELLA CACHE
      console.warn('[AuthContext] Verification failed (network/timeout), trusting cache:', error);
      return cachedWeddingId; 
    }
  };

  const debouncedLoadWeddingId = useCallback(async (userId: string) => {
    if (loadWeddingIdTimeoutRef.current) {
      clearTimeout(loadWeddingIdTimeoutRef.current);
    }
    
    loadWeddingIdTimeoutRef.current = setTimeout(async () => {
      const weddingId = await loadWeddingId(userId);
      setAuthState(prev => {
        if (prev.status === 'authenticated') {
          return {
            ...prev,
            weddingId
          };
        }
        return prev;
      });
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    // Initial load
    loadSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth event:', event);
        
        if (!session) {
          weddingStorage.clear();
          setAuthState({ status: "unauthenticated" });
          return;
        }
        
        if (event === 'TOKEN_REFRESHED') {
          // CRITICAL: Preserve existing weddingId during token refresh
          setAuthState(prev => {
            if (prev.status === 'authenticated') {
              console.log('[AuthContext] Token refreshed, keeping weddingId:', prev.weddingId);
              return {
                ...prev,
                session, // Only update session
              };
            }
            return prev;
          });
          return;
        }
        
        if (event === 'SIGNED_IN') {
          // Only on initial login, load weddingId
          const weddingId = await loadWeddingId(session.user.id);
          setAuthState({
            status: "authenticated",
            user: session.user,
            session,
            weddingId,
          });
          return;
        }
        
        // INITIAL_SESSION and other events: keep existing state if same user
        setAuthState(prev => {
          if (prev.status === 'authenticated' && prev.user.id === session.user.id) {
            return prev; // No change, avoid duplicate loads
          }
          return {
            status: "authenticated",
            user: session.user,
            session,
            weddingId: prev.status === 'authenticated' ? prev.weddingId : null,
          };
        });
      }
    );

    return () => {
      subscription.unsubscribe();
      if (loadWeddingIdTimeoutRef.current) {
        clearTimeout(loadWeddingIdTimeoutRef.current);
      }
    };
  }, [debouncedLoadWeddingId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    weddingStorage.clear();
    setAuthState({ status: "unauthenticated" });
  };

  const refreshAuth = async () => {
    setAuthState({ status: "loading" });
    await loadSession();
  };

  return (
    <AuthContext.Provider value={{ authState, signOut, refreshAuth }}>
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
