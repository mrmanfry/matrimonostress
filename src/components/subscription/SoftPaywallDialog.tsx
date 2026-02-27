import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export function SoftPaywallDialog() {
  const { status, daysLeft } = useSubscription();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (status !== "trialing" || daysLeft === null || daysLeft > 3) return;
    if (daysLeft <= 0) return; // hard paywall handles this

    const dismissed = sessionStorage.getItem("soft_paywall_dismissed");
    if (!dismissed) {
      setOpen(true);
    }
  }, [status, daysLeft]);

  const handleDismiss = () => {
    sessionStorage.setItem("soft_paywall_dismissed", "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-accent">
              <Sparkles className="w-6 h-6 text-accent-foreground" />
            </div>
          </div>
          <DialogTitle className="text-center">
            Speriamo tu stia organizzando senza stress!
          </DialogTitle>
          <DialogDescription className="text-center">
            Il tuo periodo di prova scade tra <strong>{daysLeft}</strong> {daysLeft === 1 ? "giorno" : "giorni"}.
            Attiva ora il piano Premium per non interrompere il tuo planning e mantenere attivi tutti i promemoria.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => { handleDismiss(); navigate("/app/upgrade"); }}
          >
            Vedi Piano Premium
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleDismiss}
          >
            Ricordamelo dopo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
