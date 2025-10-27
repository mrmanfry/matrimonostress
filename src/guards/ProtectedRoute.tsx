import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  requireWedding?: boolean;
  redirectIfHasWedding?: boolean;
}

export function ProtectedRoute({ children, requireWedding = false, redirectIfHasWedding = false }: ProtectedRouteProps) {
  const { authState } = useAuth();
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

  // Error state
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
