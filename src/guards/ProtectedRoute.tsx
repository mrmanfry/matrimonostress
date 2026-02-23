import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, RefreshCw, LogOut, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useIsOnline } from "@/hooks/useIsOnline";

interface ProtectedRouteProps {
  children: ReactNode;
  requireWedding?: boolean;
  redirectIfHasWedding?: boolean;
}

/**
 * ProtectedRoute - Guardiano delle rotte basato su stati espliciti
 * 
 * Logica senza timer:
 * - loading: spinner
 * - error: schermata errore critico
 * - authenticated_wedding_error: schermata retry (errore network)
 * - unauthenticated: redirect a /auth
 * - no_wedding: redirect a /onboarding (se requireWedding) o passa
 * - authenticated: redirect a /app/dashboard (se redirectIfHasWedding) o passa
 */
export function ProtectedRoute({ 
  children, 
  requireWedding = false, 
  redirectIfHasWedding = false 
}: ProtectedRouteProps) {
  const { authState, refreshAuth, signOut } = useAuth();
  const location = useLocation();
  const isOnline = useIsOnline();

  // 1. Loading State - Spinner mentre Supabase/RPC lavorano
  if (authState.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center space-y-4">
          <Heart className="w-16 h-16 text-accent fill-accent animate-pulse mx-auto" />
          <p className="text-lg text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  // 1b. Offline guard — prevent redirect loops when offline
  if (!isOnline && (authState.status === "unauthenticated" || authState.status === "error")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-6">
        <div className="text-center space-y-4">
          <WifiOff className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Sei Offline</h2>
          <p className="text-muted-foreground max-w-sm">
            Connettiti a Internet per accedere all'app. I tuoi dati sono al sicuro.
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State - Errore critico di autenticazione
  if (authState.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center space-y-4 p-6">
          <Heart className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Errore di Autenticazione</h2>
          <p className="text-muted-foreground max-w-md">
            Si è verificato un errore durante l'autenticazione. Riprova più tardi.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Ricarica la Pagina
          </Button>
        </div>
      </div>
    );
  }

  // 3. Wedding Loading Error - Utente autenticato ma errore nel fetch del wedding
  // Mostra schermata retry invece di reindirizzare a onboarding (previene loop di registrazione)
  if (authState.status === "authenticated_wedding_error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="bg-card border-destructive/50">
            <WifiOff className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">
              Impossibile caricare i dati
            </AlertTitle>
            <AlertDescription className="mt-3 space-y-4">
              <p className="text-muted-foreground">
                Si è verificato un problema di comunicazione con il server. 
                Non preoccuparti, i tuoi dati sono al sicuro.
              </p>
              
              <p className="text-sm text-muted-foreground">
                Potrebbe essere un problema temporaneo di connessione o il server potrebbe essere in aggiornamento.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  onClick={() => refreshAuth()} 
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Riprova
                </Button>
                <Button 
                  onClick={() => signOut()} 
                  variant="outline"
                  className="flex-1"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Esci e rientra
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-xs text-muted-foreground cursor-pointer">
                    Dettagli tecnici (dev)
                  </summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                    {authState.error.message}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // 4. Unauthenticated - Redirect al login salvando la location corrente
  if (authState.status === "unauthenticated") {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 5. No Wedding - Utente loggato ma nuovo (senza matrimonio)
  if (authState.status === "no_wedding") {
    // Se la pagina richiede un matrimonio (es. Dashboard), manda a Onboarding
    if (requireWedding) {
      console.log('[ProtectedRoute] Missing wedding context, redirecting to onboarding');
      return <Navigate to="/onboarding" replace />;
    }
    // Altrimenti (es. sta visitando /onboarding o /profile), lascialo passare
    return <>{children}</>;
  }

  // 6. Authenticated - Utente loggato E con matrimonio
  if (authState.status === "authenticated") {
    // Se è su una pagina che deve saltare se ha già un matrimonio (es. /onboarding), manda a Dashboard
    if (redirectIfHasWedding) {
      return <Navigate to="/app/dashboard" replace />;
    }
    // Tutto ok, mostra la pagina
    return <>{children}</>;
  }

  // Fallback di sicurezza (non dovrebbe mai arrivarci)
  return null;
}
