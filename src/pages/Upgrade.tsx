import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Check, ArrowLeft, Lock, CreditCard } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

const benefits = [
  "Accesso illimitato a Checklist e Budget",
  "Sincronizzazione multi-dispositivo con il partner",
  "Nessun limite agli invitati",
  "Esportazione PDF e gestione tavoli",
  "Promemoria automatici pagamenti e scadenze",
  "Tesoreria e previsione flussi di cassa",
];

const Upgrade = () => {
  const navigate = useNavigate();
  const { status, daysLeft } = useSubscription();

  const handleCheckout = async () => {
    // Stripe integration will be added in Phase 3
    toast({
      title: "Funzionalità in arrivo",
      description: "L'integrazione con il sistema di pagamento sarà disponibile a breve.",
    });
  };

  if (status === "active") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <Heart className="w-12 h-12 text-accent-foreground fill-accent-foreground mx-auto" />
          <h1 className="text-2xl font-bold font-serif">Sei già Premium!</h1>
          <p className="text-muted-foreground">
            Il tuo account è attivo. Goditi l'organizzazione senza stress.
          </p>
          <Button onClick={() => navigate("/app/dashboard")} className="w-full">
            Torna alla Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal header */}
      <header className="h-14 border-b border-border flex items-center px-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Indietro
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-accent">
                <Heart className="w-10 h-10 text-accent-foreground fill-accent-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold font-serif">
              Sblocca l'organizzazione perfetta
            </h1>
            <p className="text-muted-foreground text-lg">
              Passa a Premium e goditi il tuo matrimonio senza pensieri.
            </p>
          </div>

          {/* Pricing Card */}
          <Card className="p-8 border-2 border-primary/20 bg-gradient-hero">
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-primary">49€</div>
              <div className="text-muted-foreground mt-1">per anno</div>
              <p className="text-xs text-muted-foreground mt-2">
                Meno del costo di un singolo invitato al ricevimento
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-status-confirmed shrink-0 mt-0.5" />
                  <span className="text-sm">{benefit}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full h-14 text-base gap-2"
              size="lg"
              onClick={handleCheckout}
            >
              <Lock className="w-4 h-4" />
              Paga in sicurezza con Stripe
            </Button>

            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
              <CreditCard className="w-4 h-4" />
              <span>Pagamento sicuro e criptato</span>
            </div>
          </Card>

          {/* Trial info */}
          {status === "trialing" && daysLeft !== null && daysLeft > 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Ti restano ancora <strong>{daysLeft}</strong> giorni di prova gratuita.
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Upgrade;
