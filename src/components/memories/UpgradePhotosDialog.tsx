import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Unlock, ArrowLeft } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/payments/StripeEmbeddedCheckout";

const TIERS = [
  { key: "starter" as const, label: "Starter", photos: 500, price: 9 },
  { key: "plus" as const, label: "Plus", photos: 1500, price: 29, popular: true },
  { key: "premium" as const, label: "Premium", photos: 2500, price: 49 },
];

interface UpgradePhotosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId?: string;
  currentLimit: number;
  totalPhotos: number;
}

export default function UpgradePhotosDialog({
  open,
  onOpenChange,
  weddingId,
  currentLimit,
  totalPhotos,
}: UpgradePhotosDialogProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const availableTiers = TIERS.filter((t) => t.photos > currentLimit);
  const lockedCount = Math.max(0, totalPhotos - currentLimit);
  const suggestedTier = TIERS.find((t) => t.photos >= totalPhotos) || TIERS[TIERS.length - 1];

  const checkoutBody = useMemo(
    () => ({ weddingId: weddingId || "", tier: selectedTier || "" }),
    [weddingId, selectedTier],
  );

  const handleClose = (next: boolean) => {
    if (!next) setSelectedTier(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            {selectedTier ? "Completa il pagamento" : "Sblocca più foto"}
          </DialogTitle>
          {!selectedTier && (
            <DialogDescription>
              {lockedCount > 0
                ? `Hai ${lockedCount} foto in più da sbloccare. Scegli il pacchetto giusto per te.`
                : "Scegli un pacchetto per garantire che le foto non vengano eliminate dopo 30 giorni."}
            </DialogDescription>
          )}
        </DialogHeader>

        {selectedTier && weddingId ? (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTier(null)}
              className="gap-1.5 -ml-2"
            >
              <ArrowLeft size={14} />
              Cambia pacchetto
            </Button>
            <StripeEmbeddedCheckout functionName="unlock-photos" body={checkoutBody} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
              {availableTiers.map((tier) => {
                const isRecommended = tier.key === suggestedTier.key && availableTiers.length > 1;
                return (
                  <Card
                    key={tier.key}
                    className={`relative transition-shadow ${
                      isRecommended ? "border-primary shadow-md ring-1 ring-primary/20" : ""
                    }`}
                  >
                    {isRecommended && (
                      <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] px-2">
                        Consigliato
                      </Badge>
                    )}
                    <CardContent className="p-4 text-center space-y-3">
                      <div>
                        <p className="text-sm font-semibold">{tier.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Fino a {tier.photos.toLocaleString("it-IT")} foto
                        </p>
                      </div>
                      <p className="text-2xl font-bold">€{tier.price}</p>
                      <Button
                        size="sm"
                        className="w-full gap-1.5"
                        variant={isRecommended ? "default" : "outline"}
                        onClick={() => setSelectedTier(tier.key)}
                        disabled={!weddingId}
                      >
                        <Unlock size={14} />
                        {currentLimit > 150 ? "Upgrade" : "Sblocca"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <p className="text-[11px] text-center text-muted-foreground mt-2">
              Pagamento sicuro · Hai un codice promo? Inseriscilo al checkout. Le foto oltre il tuo limite verranno eliminate dopo 30 giorni.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
