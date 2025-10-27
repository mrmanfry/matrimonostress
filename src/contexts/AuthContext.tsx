import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { retryWithBackoff } from "@/utils/retryWithBackoff";

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
        // Load wedding_id for the user
        const weddingId = await loadWeddingId(data.session.user.id);
        
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

  const loadWeddingId = async (userId: string): Promise<string | null> => {
    console.log('[AuthContext] Loading weddingId for user:', userId);
    try {
      // Add timeout to prevent hanging
      const queryTimeout = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.log('[AuthContext] Query timeout reached');
          resolve(null);
        }, 5000);
      });

      // First check if user is a collaborator
      const roleQuery = supabase
        .from("user_roles")
        .select("wedding_id")
        .eq("user_id", userId)
        .maybeSingle()
        .then(result => {
          console.log('[AuthContext] User role data:', result.data);
          return result;
        });

      const roleResult = await Promise.race([roleQuery, queryTimeout]) as any;

      if (roleResult?.data?.wedding_id) {
        console.log('[AuthContext] Found weddingId from role:', roleResult.data.wedding_id);
        return roleResult.data.wedding_id;
      }

      // Then check if user created a wedding
      const weddingQuery = supabase
        .from("weddings")
        .select("id")
        .eq("created_by", userId)
        .maybeSingle()
        .then(result => {
          console.log('[AuthContext] Wedding created by user:', result.data);
          return result;
        });

      const weddingResult = await Promise.race([weddingQuery, queryTimeout]) as any;

      return weddingResult?.data?.id || null;
    } catch (error) {
      console.error('[AuthContext] Error loading wedding_id:', error);
      return null;
    }
  };

  useEffect(() => {
    // Initial load
    loadSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          // Solo per eventi di login, ricarica il wedding_id
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const weddingId = await loadWeddingId(session.user.id);
            setAuthState({
              status: "authenticated",
              user: session.user,
              session,
              weddingId,
            });
          } else {
            // Per altri eventi, mantieni lo stato esistente se è lo stesso utente
            setAuthState(prevState => {
              if (prevState.status === 'authenticated' && prevState.user.id === session.user.id) {
                return prevState; // Nessun cambiamento, evita loop
              }
              return {
                status: "authenticated",
                user: session.user,
                session,
                weddingId: prevState.status === 'authenticated' ? prevState.weddingId : null,
              };
            });
          }
        } else {
          setAuthState({ status: "unauthenticated" });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
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
