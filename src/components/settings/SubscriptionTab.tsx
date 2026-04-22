import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Loader2, Heart } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getStripeEnvironment } from "@/lib/stripe";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export function SubscriptionTab() {
  const { status, daysLeft, currentPeriodEnd } = useSubscription();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageBilling = async () => {
    if (authState.status !== "authenticated") return;
    setPortalLoading(true);
    try {
      // Ensure session is present so the auth header is forwarded to the edge function.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast({ title: "Sessione scaduta", description: "Effettua di nuovo l'accesso.", variant: "destructive" });
        return;
      }
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: {
          weddingId: authState.activeWeddingId,
          environment: getStripeEnvironment(),
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      console.error("[SubscriptionTab] portal error:", err);
      toast({ title: "Errore", description: "Impossibile aprire il portale di fatturazione.", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const statusLabel: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    trialing: { text: "Prova gratuita", variant: "secondary" },
    active: { text: "Premium attivo", variant: "default" },
    past_due: { text: "Pagamento scaduto", variant: "destructive" },
    canceled: { text: "Cancellato", variant: "destructive" },
    loading: { text: "Caricamento...", variant: "outline" },
  };

  const s = statusLabel[status] || statusLabel.loading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Abbonamento
            </CardTitle>
            <CardDescription>Gestisci il tuo piano e la fatturazione</CardDescription>
          </div>
          <Badge variant={s.variant}>{s.text}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === "trialing" && (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-accent-foreground" />
              <span className="font-medium">Prova gratuita in corso</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {daysLeft !== null && daysLeft > 0
                ? `Ti restano ${daysLeft} giorni di prova. Passa a Premium per continuare senza interruzioni.`
                : "La tua prova è terminata. Attiva Premium per continuare a usare tutte le funzionalità."}
            </p>
            <Button onClick={() => navigate("/app/upgrade")} className="gap-2">
              Passa a Premium — 49€/anno
            </Button>
          </div>
        )}

        {status === "active" && (
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Il tuo abbonamento Premium è attivo.
              {currentPeriodEnd && (
                <> Si rinnoverà il{" "}
                  <strong>{format(new Date(currentPeriodEnd), "d MMMM yyyy", { locale: it })}</strong>.
                </>
              )}
            </p>
            <Button variant="outline" onClick={handleManageBilling} disabled={portalLoading} className="gap-2">
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Gestisci fatturazione
            </Button>
          </div>
        )}

        {(status === "canceled" || status === "past_due") && (
          <div className="rounded-lg border border-destructive/30 p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {status === "past_due"
                ? "C'è un problema con il pagamento. Aggiorna il metodo di pagamento per continuare."
                : "Il tuo abbonamento è stato cancellato. Riattivalo per sbloccare tutte le funzionalità."}
            </p>
            <Button onClick={() => navigate("/app/upgrade")} className="gap-2">
              Riattiva Premium
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
