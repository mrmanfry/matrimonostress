import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Briefcase, Check, Lock, Loader2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/payments/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";
import { usePlannerSubscription, PlannerTier } from "@/hooks/usePlannerSubscription";
import { toast } from "@/hooks/use-toast";

interface TierDef {
  id: PlannerTier;
  name: string;
  price: string;
  slots: string;
  perWedding: string;
  features: string[];
  highlight?: boolean;
}

const TIERS: TierDef[] = [
  {
    id: "solo",
    name: "Solo",
    price: "99€/anno",
    slots: "1 matrimonio attivo",
    perWedding: "99€ a matrimonio",
    features: ["Cockpit Planner", "Multi-wedding switcher", "Tutte le funzioni Premium", "Branding"],
  },
  {
    id: "studio",
    name: "Studio",
    price: "349€/anno",
    slots: "fino a 5 matrimoni",
    perWedding: "70€ a matrimonio",
    features: ["Tutto di Solo", "5 slot matrimoni", "Calendario unificato", "Gestione team"],
    highlight: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: "799€/anno",
    slots: "fino a 15 matrimoni",
    perWedding: "53€ a matrimonio",
    features: ["Tutto di Studio", "15 slot matrimoni", "Reportistica avanzata", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "1.499€/anno",
    slots: "matrimoni illimitati",
    perWedding: "—",
    features: ["Tutto di Agency", "Slot illimitati", "Account manager dedicato", "SLA personalizzato"],
  },
];

export default function UpgradePlanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sub = usePlannerSubscription();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PlannerTier | null>(null);
  const isSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    if (!isSuccess) return;
    // Poll planner subscription a few times until it's populated by the webhook.
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts += 1;
      await sub.refresh();
      if (sub.hasSubscription || attempts >= 5) clearInterval(poll);
    }, 2000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const handleSelect = (tier: PlannerTier) => {
    if (sub.tier === tier && sub.status === "active") {
      toast({ title: "Già attivo", description: `Sei già sul piano ${tier}.` });
      return;
    }
    setSelectedTier(tier);
    setCheckoutOpen(true);
  };

  const checkoutBody = useMemo(() => ({ tier: selectedTier ?? "solo" }), [selectedTier]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PaymentTestModeBanner />
      <header className="h-14 border-b border-border flex items-center px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Indietro
        </Button>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-accent">
                <Briefcase className="w-10 h-10 text-accent-foreground" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-serif">Piani per Wedding Planner</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Scegli il piano in base al numero di matrimoni che gestisci contemporaneamente.
              Un matrimonio resta "attivo" fino a 30 giorni dopo l'evento.
            </p>
          </div>

          {sub.hasSubscription && sub.status === "active" && (
            <Card className="p-5 bg-accent/10 border-accent/30">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Crown className="w-6 h-6 text-accent-foreground" />
                  <div>
                    <p className="font-medium">
                      Piano attivo: <span className="capitalize">{sub.tier}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {sub.slotsUsed} / {sub.slotLimit === 9999 ? "∞" : sub.slotLimit} matrimoni
                      attivi
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Attivo</Badge>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {TIERS.map((tier) => {
              const isCurrent = sub.tier === tier.id && sub.status === "active";
              return (
                <Card
                  key={tier.id}
                  className={`p-6 flex flex-col gap-4 ${
                    tier.highlight ? "border-2 border-primary shadow-lg" : ""
                  }`}
                >
                  {tier.highlight && (
                    <Badge className="self-start" variant="default">
                      Più scelto
                    </Badge>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{tier.slots}</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{tier.price}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tier.perWedding}</p>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-status-confirmed shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full gap-2"
                    variant={tier.highlight ? "default" : "outline"}
                    disabled={isCurrent}
                    onClick={() => handleSelect(tier.id)}
                  >
                    {isCurrent ? (
                      "Piano attuale"
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Scegli {tier.name}
                      </>
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Tutti i piani prevedono fatturazione annuale. Puoi cambiare piano o disdire in qualsiasi
            momento dalle impostazioni.
          </p>
        </div>
      </main>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completa il pagamento</DialogTitle>
          </DialogHeader>
          {checkoutOpen && selectedTier && (
            <StripeEmbeddedCheckout
              functionName={"create-planner-checkout" as never}
              body={checkoutBody}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
