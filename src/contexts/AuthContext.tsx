import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { weddingStorage } from "@/utils/weddingStorage";

/**
 * Stati dell'autenticazione con distinzione esplicita:
 * - loading: inizializzazione in corso
 * - unauthenticated: utente non loggato
 * - authenticated: loggato CON matrimonio (weddingId garantito)
 * - no_wedding: loggato MA senza matrimonio (nuovo utente -> onboarding)
 * - authenticated_wedding_error: loggato ma errore nel recupero wedding (mostra retry)
 * - error: errore critico di autenticazione
 */
type AuthState = 
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: User; session: Session; weddingId: string; role: string | null }
  | { status: "no_wedding"; user: User; session: Session }
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
  
  // Ref per prevenire chiamate parallele a handleAuthSession (race condition fix)
  const isLoadingContext = useRef(false);
  // Ref per tracciare l'ultimo user.id processato
  const lastProcessedUserId = useRef<string | null>(null);

  /**
   * Verifica in background che il cached ID sia ancora valido (Fire & Forget)
   */
  const verifyCacheInBackground = useCallback(async (idToVerify: string) => {
    try {
      const { data } = await supabase
        .from('weddings')
        .select('id')
        .eq('id', idToVerify)
        .maybeSingle();

      if (!data) {
        console.warn('[AuthContext] ⚠️ Background check: cached ID is invalid/deleted.');
        weddingStorage.clear();
      } else {
        console.log('[AuthContext] ✅ Background check passed.');
      }
    } catch (e) {
      console.warn('[AuthContext] Background check network error (ignored):', e);
    }
  }, []);

  /**
   * Carica il contesto utente usando la RPC ottimizzata (singola chiamata)
   * Ritorna { weddingId, role } oppure lancia errore
   */
  const loadUserContext = useCallback(async (): Promise<{ weddingId: string | null; role: string | null }> => {
    // 1. Cache Check: Se abbiamo già l'ID in localStorage, usiamolo per istantaneità
    const cached = weddingStorage.get();
    if (cached) {
      console.log('[AuthContext] ⚡ Cache hit! Using:', cached);
      // Verifica in background senza bloccare
      verifyCacheInBackground(cached);
      return { weddingId: cached, role: null };
    }

    // 2. RPC Call: Singola chiamata al database
    console.log('[AuthContext] ⚡ Fetching user context via RPC...');
    
    const { data, error } = await supabase.rpc('get_user_context');
    
    if (error) {
      console.error('[AuthContext] RPC Error:', error);
      throw error;
    }

    // Parse JSON response from RPC
    const contextData = data as { wedding_id: string | null; role: string | null } | null;
    const serverWeddingId = contextData?.wedding_id || null;
    const serverRole = contextData?.role || null;

    if (serverWeddingId) {
      console.log('[AuthContext] ✅ Context resolved:', serverWeddingId, 'role:', serverRole);
      weddingStorage.set(serverWeddingId);
    } else {
      console.log('[AuthContext] 🤷 No wedding context found (new user)');
    }

    return { weddingId: serverWeddingId, role: serverRole };
  }, [verifyCacheInBackground]);

  /**
   * Gestore centrale della sessione - chiamato per ogni evento auth
   */
  const handleAuthSession = useCallback(async (session: Session) => {
    try {
      const { weddingId, role } = await loadUserContext();
      
      if (weddingId) {
        // Caso A: Utente ha un matrimonio -> Authenticated
        setAuthState({
          status: "authenticated",
          user: session.user,
          session,
          weddingId,
          role
        });
      } else {
        // Caso B: Utente loggato ma SENZA matrimonio -> No Wedding (onboarding)
        console.log('[AuthContext] User logged in but needs onboarding');
        setAuthState({
          status: "no_wedding",
          user: session.user,
          session
        });
      }
    } catch (error) {
      console.error('[AuthContext] Error finalizing auth session:', error);
      setAuthState({
        status: "authenticated_wedding_error",
        user: session.user,
        session,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }, [loadUserContext]);

  useEffect(() => {
    let mounted = true;

    // Check iniziale della sessione
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session && mounted) {
          await handleAuthSession(session);
        } else if (!session && mounted) {
          setAuthState({ status: "unauthenticated" });
        }
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

    // Listener eventi auth (Event-Driven)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log(`[AuthContext] Auth event: ${event}`);

        // Logout o sessione invalida
        if (event === 'SIGNED_OUT' || !session) {
          weddingStorage.clear();
          setAuthState({ status: "unauthenticated" });
          return;
        }

        // Token refresh: preserva lo stato esistente, aggiorna solo la sessione
        if (event === 'TOKEN_REFRESHED') {
          setAuthState(prev => {
            if (prev.status === 'authenticated') {
              console.log('[AuthContext] Token refreshed, keeping weddingId:', prev.weddingId);
              return { ...prev, session };
            }
            if (prev.status === 'authenticated_wedding_error') {
              return { ...prev, session };
            }
            if (prev.status === 'no_wedding') {
              return { ...prev, session };
            }
            return prev;
          });
          return;
        }

        // SIGNED_IN, INITIAL_SESSION e altri eventi: gestione unificata
        if (['SIGNED_IN', 'INITIAL_SESSION'].includes(event)) {
          // Evita chiamate parallele (race condition fix)
          if (isLoadingContext.current) {
            console.log('[AuthContext] Context already loading, skipping duplicate call');
            return;
          }
          
          // Evita ri-caricamento se stesso utente già processato
          if (lastProcessedUserId.current === session.user.id) {
            console.log('[AuthContext] Same user already processed, skipping');
            return;
          }
          
          isLoadingContext.current = true;
          try {
            await handleAuthSession(session);
            lastProcessedUserId.current = session.user.id;
          } finally {
            isLoadingContext.current = false;
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [handleAuthSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    weddingStorage.clear();
    setAuthState({ status: "unauthenticated" });
  };

  const refreshAuth = async () => {
    setAuthState({ status: "loading" });
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await handleAuthSession(session);
    } else {
      setAuthState({ status: "unauthenticated" });
    }
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
