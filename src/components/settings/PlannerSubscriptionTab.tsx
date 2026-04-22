import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import { usePlannerSubscription } from "@/hooks/usePlannerSubscription";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export function PlannerSubscriptionTab() {
  const sub = usePlannerSubscription();
  const navigate = useNavigate();

  const labels: Record<string, { text: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    trialing: { text: "Prova gratuita", variant: "secondary" },
    active: { text: "Attivo", variant: "default" },
    past_due: { text: "Pagamento scaduto", variant: "destructive" },
    canceled: { text: "Cancellato", variant: "destructive" },
    loading: { text: "—", variant: "outline" },
  };
  const s = labels[sub.status] || labels.loading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Abbonamento Planner
            </CardTitle>
            <CardDescription>Gestisci il tuo piano e gli slot matrimoni</CardDescription>
          </div>
          {sub.hasSubscription && <Badge variant={s.variant}>{s.text}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!sub.hasSubscription ? (
          <div className="rounded-lg border border-dashed p-4 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Non hai ancora un piano Planner attivo.
            </p>
            <Button onClick={() => navigate("/app/upgrade/planner")}>Vedi piani Planner</Button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Piano</span>
                <span className="font-medium capitalize">{sub.tier}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Slot matrimoni</span>
                <span className="font-medium">
                  {sub.slotsUsed} / {sub.slotLimit === 9999 ? "∞" : sub.slotLimit}
                </span>
              </div>
              {sub.currentPeriodEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rinnovo</span>
                  <span className="font-medium">
                    {format(new Date(sub.currentPeriodEnd), "d MMM yyyy", { locale: it })}
                  </span>
                </div>
              )}
            </div>
            {sub.slotsUsed >= sub.slotLimit && sub.slotLimit < 9999 && (
              <div className="rounded-lg border border-destructive/30 p-4 space-y-2">
                <p className="text-sm">
                  Hai raggiunto il limite di slot. Passa a un piano superiore per gestire più
                  matrimoni.
                </p>
                <Button size="sm" onClick={() => navigate("/app/upgrade/planner")}>
                  Aggiorna piano
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
