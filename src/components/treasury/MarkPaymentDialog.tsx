import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Payment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'Da Pagare' | 'Pagato';
  paid_on_date: string | null;
  paid_by: string | null;
  expense_item_id: string;
  tax_inclusive: boolean;
  tax_rate: number | null;
}

interface Contributor {
  id: string;
  name: string;
  type: string;
  contribution_target: number | null;
}

interface ContributorAllocation {
  contributorId: string;
  contributorName: string;
  amount: number;
}

interface MarkPaymentDialogProps {
  payment: Payment | null;
  vendorName: string;
  totalAmount: number;
  contributors: Contributor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MarkPaymentDialog({
  payment,
  vendorName,
  totalAmount,
  contributors,
  open,
  onOpenChange,
  onSuccess,
}: MarkPaymentDialogProps) {
  const { toast } = useToast();
  const [selectedContributors, setSelectedContributors] = useState<Set<string>>(new Set());
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && payment) {
      // Reset state when dialog opens
      setSelectedContributors(new Set());
      setAllocations({});
    }
  }, [open, payment]);

  const handleToggleContributor = (contributorId: string) => {
    const newSelected = new Set(selectedContributors);
    if (newSelected.has(contributorId)) {
      newSelected.delete(contributorId);
      const newAllocations = { ...allocations };
      delete newAllocations[contributorId];
      setAllocations(newAllocations);
    } else {
      newSelected.add(contributorId);
    }
    setSelectedContributors(newSelected);
  };

  const handleAmountChange = (contributorId: string, value: string) => {
    const amount = parseFloat(value) || 0;
    setAllocations({
      ...allocations,
      [contributorId]: amount,
    });
  };

  const handleAutoDivide = () => {
    if (selectedContributors.size === 0) return;
    
    const amountPerContributor = totalAmount / selectedContributors.size;
    const newAllocations: Record<string, number> = {};
    
    selectedContributors.forEach((contributorId) => {
      newAllocations[contributorId] = parseFloat(amountPerContributor.toFixed(2));
    });
    
    setAllocations(newAllocations);
  };

  const calculateTotal = () => {
    return Object.values(allocations).reduce((sum, amount) => sum + amount, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const isValid = () => {
    if (selectedContributors.size === 0) return false;
    
    const total = calculateTotal();
    const difference = Math.abs(total - totalAmount);
    
    // Allow 1 cent difference due to rounding
    return difference < 0.01;
  };

  const handleSave = async () => {
    if (!payment || !isValid()) return;

    setSaving(true);
    try {
      // Update payment status
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          status: "Pagato",
          paid_on_date: format(new Date(), "yyyy-MM-dd"),
        })
        .eq("id", payment.id);

      if (paymentError) throw paymentError;

      // Create allocation records
      const allocationRecords = Array.from(selectedContributors).map((contributorId) => ({
        payment_id: payment.id,
        contributor_id: contributorId,
        amount: allocations[contributorId],
        percentage: (allocations[contributorId] / totalAmount) * 100,
      }));

      const { error: allocError } = await supabase
        .from("payment_allocations")
        .insert(allocationRecords);

      if (allocError) throw allocError;

      toast({
        title: "Pagamento registrato",
        description: `${formatCurrency(totalAmount)} a ${vendorName}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      toast({
        title: "Errore",
        description: "Impossibile registrare il pagamento",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!payment) return null;

  const total = calculateTotal();
  const difference = totalAmount - total;
  const isValidAmount = isValid();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Segna Pagamento Come Effettuato</DialogTitle>
          <DialogDescription>
            Suddividi il pagamento tra i contributori del matrimonio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Details */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Fornitore</span>
                <span className="font-semibold">{vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Descrizione</span>
                <span className="font-medium">{payment.description}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm font-medium">Importo Totale</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Auto-divide Button */}
          {selectedContributors.size > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAutoDivide}
              type="button"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Suddividi Equamente tra {selectedContributors.size} Contributori
            </Button>
          )}

          {/* Contributors Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Chi ha contribuito a questo pagamento?</Label>
            
            {contributors.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nessun contributore trovato. Vai nelle Impostazioni per configurare i contributori.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {contributors.map((contributor) => {
                  const isSelected = selectedContributors.has(contributor.id);
                  return (
                    <div
                      key={contributor.id}
                      className={`rounded-lg border p-4 transition-colors ${
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`contributor-${contributor.id}`}
                          checked={isSelected}
                          onCheckedChange={() => handleToggleContributor(contributor.id)}
                        />
                        <div className="flex-1 space-y-3">
                          <label
                            htmlFor={`contributor-${contributor.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {contributor.name}
                            {contributor.contribution_target && (
                              <span className="text-xs text-muted-foreground ml-2">
                                (Target: {formatCurrency(contributor.contribution_target)})
                              </span>
                            )}
                          </label>
                          
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`amount-${contributor.id}`} className="text-xs">
                                Importo
                              </Label>
                              <Input
                                id={`amount-${contributor.id}`}
                                type="number"
                                step="0.01"
                                min="0"
                                max={totalAmount}
                                value={allocations[contributor.id] || ""}
                                onChange={(e) => handleAmountChange(contributor.id, e.target.value)}
                                className="h-8"
                                placeholder="0.00"
                              />
                              <span className="text-xs text-muted-foreground">€</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Validation Summary */}
          {selectedContributors.size > 0 && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Totale Assegnato</span>
                <span className={total > totalAmount ? "text-destructive font-semibold" : "font-medium"}>
                  {formatCurrency(total)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Importo da Pagare</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Differenza</span>
                <span className={!isValidAmount ? "text-destructive" : "text-green-600"}>
                  {formatCurrency(Math.abs(difference))}
                  {difference > 0 && " mancanti"}
                  {difference < 0 && " in eccesso"}
                </span>
              </div>
            </div>
          )}

          {!isValidAmount && selectedContributors.size > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Il totale assegnato deve corrispondere all'importo del pagamento.
                Usa il pulsante "Suddividi Equamente" o modifica manualmente gli importi.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={!isValidAmount || saving}>
            {saving ? "Salvataggio..." : "Conferma Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
