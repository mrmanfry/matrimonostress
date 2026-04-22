import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Lock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Full-page hard paywall shown when the trial has expired (isReadOnly = true).
 * Blocks all app navigation except the upgrade page and settings (for billing/sign-out).
 *
 * Wrapped at the AppLayoutInner level so it overlays the entire authenticated app.
 */
export function HardPaywallScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="max-w-lg w-full p-8 text-center space-y-6 border-2 border-primary/20 shadow-xl">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-accent">
            <Lock className="w-10 h-10 text-accent-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-serif">La tua prova è terminata</h1>
          <p className="text-muted-foreground">
            I tuoi dati sono al sicuro. Attiva Premium per continuare a organizzare
            il tuo matrimonio senza interruzioni.
          </p>
        </div>

        <div className="rounded-lg bg-gradient-hero p-5 space-y-1">
          <div className="text-3xl font-bold text-primary">49€</div>
          <div className="text-xs text-muted-foreground">all'anno · meno di 1€ a settimana</div>
        </div>

        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => navigate("/app/upgrade")}
          >
            <Heart className="w-4 h-4" />
            Attiva Premium ora
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4" />
            Esci
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Hai un codice promo? Inseriscilo al checkout per uno sconto.
        </p>
      </Card>
    </div>
  );
}
