import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { retryWithBackoff } from "@/utils/retryWithBackoff";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { weddingStorage } from "@/utils/weddingStorage";

/**
 * Risultato del caricamento weddingId con distinzione tra:
 * - found: ID trovato con successo
 * - not_found: Utente autenticato ma senza matrimonio (nuovo utente)
 * - error: Errore tecnico (rete, timeout, server)
 */
type WeddingIdResult = 
  | { status: 'found'; weddingId: string }
  | { status: 'not_found' }
  | { status: 'error'; error: Error };

type AuthState = 
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User; session: Session; weddingId: string | null }
  | { status: "authenticated_wedding_error"; user: User; session: Session; error: Error }
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
        
        // Load wedding_id for the user with error distinction
        const result = await loadWeddingIdWithStatus(data.session.user.id, previousWeddingId);
        
        if (result.status === 'error') {
          // Errore tecnico: NON reindirizzare a onboarding!
          console.error('[AuthContext] Errore recupero wedding, mostra schermata retry');
          setAuthState({
            status: "authenticated_wedding_error",
            user: data.session.user,
            session: data.session,
            error: result.error,
          });
        } else if (result.status === 'found') {
          setAuthState({
            status: "authenticated",
            user: data.session.user,
            session: data.session,
            weddingId: result.weddingId,
          });
        } else {
          // not_found: utente nuovo, può andare a onboarding
          setAuthState({
            status: "authenticated",
            user: data.session.user,
            session: data.session,
            weddingId: null,
          });
        }
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

  // Funzione helper per la verifica in background (Fire & Forget)
  const verifyCacheInBackground = async (idToVerify: string, userId: string) => {
    try {
      const { data } = await supabase
        .from('weddings')
        .select('id')
        .eq('id', idToVerify)
        .maybeSingle();

      if (!data) {
        console.warn('[AuthContext] ⚠️ Background check: cached ID is invalid/deleted.');
        weddingStorage.clear();
        // L'utente verrà reindirizzato al prossimo refresh
      } else {
        console.log('[AuthContext] ✅ Background check passed.');
      }
    } catch (e) {
      console.warn('[AuthContext] Background check network error (ignored):', e);
    }
  };

  /**
   * Versione migliorata di loadWeddingId che distingue tra:
   * - Matrimonio trovato
   * - Nessun matrimonio (utente nuovo)
   * - Errore tecnico
   */
  const loadWeddingIdWithStatus = async (
    userId: string, 
    previousWeddingId?: string | null
  ): Promise<WeddingIdResult> => {
    // 1. RECUPERO CACHE
    const cachedWeddingId = previousWeddingId || weddingStorage.get();
    
    // CASO A: ABBIAMO UN ID IN CACHE (Utente di ritorno) - INGRESSO IMMEDIATO
    if (cachedWeddingId) {
      console.log('[AuthContext] ⚡ Cache hit! Entering immediately:', cachedWeddingId);
      
      // NON BLOCCHIAMO L'INGRESSO. Lanciamo la verifica in background ("Fire & Forget")
      verifyCacheInBackground(cachedWeddingId, userId);
      
      return { status: 'found', weddingId: cachedWeddingId };
    }
    
    // CASO B: NESSUNA CACHE (Primo accesso o cache pulita)
    console.log('[AuthContext] No cache, fetching from DB (Cold Start)...');
    try {
      const roleQuery = async () => {
        return await supabase.from("user_roles").select("wedding_id").eq("user_id", userId).maybeSingle();
      };
      
      const weddingQuery = async () => {
        return await supabase.from("weddings").select("id").eq("created_by", userId).maybeSingle();
      };
      
      // Timeout generoso (15s) solo per chi NON ha cache
      const [roleResult, weddingResult] = await Promise.all([
        fetchWithTimeout(roleQuery, 15000, null),
        fetchWithTimeout(weddingQuery, 15000, null)
      ]);

      // Verifica se c'è stato un errore nella query (non solo timeout)
      if (roleResult === null && weddingResult === null) {
        // Entrambe le query hanno fallito - probabile errore di rete
        throw new Error('Timeout o errore di rete nel recupero dati matrimonio');
      }
      
      if (roleResult?.data?.wedding_id) {
        weddingStorage.set(roleResult.data.wedding_id);
        return { status: 'found', weddingId: roleResult.data.wedding_id };
      }
      
      if (weddingResult?.data?.id) {
        weddingStorage.set(weddingResult.data.id);
        return { status: 'found', weddingId: weddingResult.data.id };
      }
      
      // Nessun matrimonio trovato - utente nuovo
      return { status: 'not_found' };
    } catch (error) {
      console.error('[AuthContext] Error fetching wedding ID:', error);
      return { 
        status: 'error', 
        error: error instanceof Error ? error : new Error(String(error)) 
      };
    }
  };

  // Legacy function for backward compatibility
  const loadWeddingId = async (userId: string, previousWeddingId?: string | null): Promise<string | null> => {
    const result = await loadWeddingIdWithStatus(userId, previousWeddingId);
    if (result.status === 'found') return result.weddingId;
    return null;
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
            // Also preserve authenticated_wedding_error state
            if (prev.status === 'authenticated_wedding_error') {
              return {
                ...prev,
                session,
              };
            }
            return prev;
          });
          return;
        }
        
        if (event === 'SIGNED_IN') {
          // Only on initial login, load weddingId
          const result = await loadWeddingIdWithStatus(session.user.id);
          
          if (result.status === 'error') {
            setAuthState({
              status: "authenticated_wedding_error",
              user: session.user,
              session,
              error: result.error,
            });
          } else {
            setAuthState({
              status: "authenticated",
              user: session.user,
              session,
              weddingId: result.status === 'found' ? result.weddingId : null,
            });
          }
          return;
        }
        
        // INITIAL_SESSION and other events: keep existing state if same user
        setAuthState(prev => {
          if (prev.status === 'authenticated' && prev.user.id === session.user.id) {
            return prev; // No change, avoid duplicate loads
          }
          if (prev.status === 'authenticated_wedding_error' && prev.user.id === session.user.id) {
            return prev; // Preserve error state
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
