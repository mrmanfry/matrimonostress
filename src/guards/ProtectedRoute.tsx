import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, RefreshCw, LogOut, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ProtectedRouteProps {
  children: ReactNode;
  requireWedding?: boolean;
  redirectIfHasWedding?: boolean;
}

export function ProtectedRoute({ children, requireWedding = false, redirectIfHasWedding = false }: ProtectedRouteProps) {
  const { authState, refreshAuth, signOut } = useAuth();
  const location = useLocation();
  const [gracePeriodExpired, setGracePeriodExpired] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setGracePeriodExpired(true);
      console.log('[ProtectedRoute] Grace period expired');
    }, 6000); // 6 second grace period (queries run in parallel with 5s timeout)
    
    return () => clearTimeout(timer);
  }, [authState.status === 'authenticated' ? authState.weddingId : null]);

  // Loading state
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

  // Error state (general auth error)
  if (authState.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="text-center space-y-4 p-6">
          <Heart className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Errore di Autenticazione</h2>
          <p className="text-muted-foreground max-w-md">
            Si è verificato un errore durante l'autenticazione. Riprova più tardi.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Ricarica la Pagina
          </Button>
        </div>
      </div>
    );
  }

  // NEW: Wedding loading error state (user is authenticated but wedding fetch failed)
  // This prevents the "registration loop" bug - we show retry instead of redirecting to onboarding
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

  // Not authenticated
  if (authState.status === "unauthenticated") {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Wedding check for protected routes
  if (authState.status === "authenticated") {
    const hasWedding = authState.weddingId !== null;
    
    // During grace period, show loading instead of redirect
    if (!hasWedding && !gracePeriodExpired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
          <div className="text-center space-y-4">
            <Heart className="w-16 h-16 text-accent fill-accent animate-pulse mx-auto" />
            <p className="text-lg text-muted-foreground">Verifica in corso...</p>
          </div>
        </div>
      );
    }

    if (redirectIfHasWedding && hasWedding) {
      return <Navigate to="/app/dashboard" replace />;
    }

    if (requireWedding && !hasWedding && gracePeriodExpired) {
      console.warn('[ProtectedRoute] No weddingId after grace period, redirecting to onboarding');
      return <Navigate to="/onboarding" replace />;
    }
  }

  // All checks passed
  return <>{children}</>;
}
