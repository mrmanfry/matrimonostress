import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Heart, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  requireWedding?: boolean;
}

export function ProtectedRoute({ children, requireWedding = false }: ProtectedRouteProps) {
  const { authState, refreshAuth } = useAuth();
  const location = useLocation();
  const [weddingCheck, setWeddingCheck] = useState<"loading" | "exists" | "missing" | "error">("loading");

  useEffect(() => {
    if (authState.status === "authenticated" && requireWedding) {
      checkWedding();
    }
  }, [authState.status, requireWedding]);

  const checkWedding = async () => {
    if (authState.status !== "authenticated") return;

    try {
      console.log("[ProtectedRoute] Checking wedding access for user:", authState.user.id);
      
      // Prima controlla se l'utente ha un ruolo associato a un matrimonio
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("wedding_id, role")
        .eq("user_id", authState.user.id)
        .maybeSingle();

      if (roleError) {
        console.error("[ProtectedRoute] Error fetching user role:", roleError);
        setWeddingCheck("error");
        return;
      }

      console.log("[ProtectedRoute] User role data:", roleData);

      if (roleData?.wedding_id) {
        // L'utente è un collaboratore - verifica che il matrimonio esista
        console.log("[ProtectedRoute] User is collaborator for wedding:", roleData.wedding_id);
        
        const { data: wedding, error: weddingError } = await supabase
          .from("weddings")
          .select("id")
          .eq("id", roleData.wedding_id)
          .maybeSingle();
        
        if (weddingError) {
          console.error("[ProtectedRoute] Error fetching wedding for collaborator:", weddingError);
          setWeddingCheck("error");
          return;
        }
        
        console.log("[ProtectedRoute] Wedding found:", wedding);
        setWeddingCheck(wedding ? "exists" : "missing");
      } else {
        // L'utente non è un collaboratore - cerca un matrimonio creato da lui
        console.log("[ProtectedRoute] User is not a collaborator, checking created weddings");
        
        const { data: wedding, error: weddingError } = await supabase
          .from("weddings")
          .select("id")
          .eq("created_by", authState.user.id)
          .maybeSingle();
        
        if (weddingError) {
          console.error("[ProtectedRoute] Error fetching created wedding:", weddingError);
          setWeddingCheck("error");
          return;
        }
        
        console.log("[ProtectedRoute] Created wedding found:", wedding);
        setWeddingCheck(wedding ? "exists" : "missing");
      }
    } catch (error) {
      console.error("[ProtectedRoute] Unexpected error checking wedding:", error);
      setWeddingCheck("error");
    }
  };

  // Loading state
  if (authState.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Card className="w-full max-w-lg p-8">
          <div className="text-center space-y-4">
            <Heart className="w-12 h-12 text-accent fill-accent animate-pulse mx-auto" />
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Error state
  if (authState.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-lg p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold">Errore di Connessione</h2>
            <p className="text-muted-foreground">
              Si è verificato un errore durante il caricamento. Verifica la tua connessione internet.
            </p>
            <Button onClick={refreshAuth} className="mt-4">
              Riprova
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Not authenticated
  if (authState.status === "unauthenticated") {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Wedding check for protected routes
  if (requireWedding) {
    if (weddingCheck === "loading") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
          <Card className="w-full max-w-lg p-8">
            <div className="text-center space-y-4">
              <Heart className="w-12 h-12 text-accent fill-accent animate-pulse mx-auto" />
              <p className="text-muted-foreground">Verifica dati matrimonio...</p>
            </div>
          </Card>
        </div>
      );
    }

    if (weddingCheck === "missing") {
      return <Navigate to="/onboarding" replace />;
    }

    if (weddingCheck === "error") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
          <Card className="w-full max-w-lg p-8">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold">Errore</h2>
              <p className="text-muted-foreground">
                Impossibile verificare i dati del matrimonio. Riprova.
              </p>
              <Button onClick={checkWedding} className="mt-4">
                Riprova
              </Button>
            </div>
          </Card>
        </div>
      );
    }
  }

  // All checks passed
  return <>{children}</>;
}
