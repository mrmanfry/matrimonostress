import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, ArrowRight, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AssignVendorDialogProps {
  itemId: string;
  itemDescription: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignVendorDialog({ itemId, itemDescription, isOpen, onClose }: AssignVendorDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.weddingId : null;
  
  // Step management: 1 = vendor selection, 2 = contract confirmation
  const [step, setStep] = useState(1);
  const [vendorId, setVendorId] = useState("");
  
  // Contract confirmation fields
  const [contractAmount, setContractAmount] = useState("");
  const [isTaxInclusive, setIsTaxInclusive] = useState(true);
  const [taxRate, setTaxRate] = useState("22");

  // Fetch current expense item data
  const { data: expenseItem, isLoading: isLoadingItem } = useQuery({
    queryKey: ["expense-item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_items")
        .select("id, description, estimated_amount, fixed_amount, total_amount, amount_is_tax_inclusive, tax_rate, vendor_id")
        .eq("id", itemId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!itemId && isOpen,
  });

  // Fetch vendors list
  const { data: vendors, isLoading: isLoadingVendors } = useQuery({
    queryKey: ["vendors-list", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      const { data } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("wedding_id", weddingId)
        .order("name");
      return data || [];
    },
    enabled: !!weddingId && isOpen,
  });

  // Always show contract confirmation when assigning vendor to a placeholder
  const needsContractConfirmation = expenseItem && !expenseItem.vendor_id;

  // Pre-populate contract amount from fixed_amount (set at budget creation)
  useEffect(() => {
    if (expenseItem?.fixed_amount != null && !contractAmount) {
      setContractAmount(expenseItem.fixed_amount.toString());
    } else if (expenseItem?.estimated_amount != null && !contractAmount) {
      // Legacy fallback
      setContractAmount(expenseItem.estimated_amount.toString());
    }
    if (expenseItem?.amount_is_tax_inclusive != null) {
      setIsTaxInclusive(expenseItem.amount_is_tax_inclusive);
    }
    if (expenseItem?.tax_rate != null) {
      setTaxRate(expenseItem.tax_rate.toString());
    }
  }, [expenseItem]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setVendorId("");
      setContractAmount("");
      setIsTaxInclusive(true);
      setTaxRate("22");
    }
  }, [isOpen]);

  const assign = useMutation({
    mutationFn: async () => {
      if (!vendorId) throw new Error("Seleziona un fornitore");
      
      // Build update payload
      const updatePayload: Record<string, unknown> = { vendor_id: vendorId };
      
      // If we had contract confirmation step, include the amounts
      if (needsContractConfirmation && contractAmount) {
        const amount = parseFloat(contractAmount);
        if (isNaN(amount) || amount < 0) {
          throw new Error("Importo non valido");
        }
        updatePayload.fixed_amount = amount;
        updatePayload.total_amount = amount;
        updatePayload.amount_is_tax_inclusive = isTaxInclusive;
        updatePayload.tax_rate = parseFloat(taxRate) || 0;
      }
      
      const { error } = await supabase
        .from("expense_items")
        .update(updatePayload)
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-spreadsheet"] });
      queryClient.invalidateQueries({ queryKey: ["expense-item", itemId] });
      toast.success(needsContractConfirmation 
        ? "Fornitore assegnato e contratto confermato!" 
        : "Fornitore assegnato!");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCreateVendor = () => {
    onClose();
    navigate("/app/vendors?action=new");
  };

  const handleNext = () => {
    if (!vendorId) {
      toast.error("Seleziona un fornitore");
      return;
    }
    if (needsContractConfirmation) {
      setStep(2);
    } else {
      assign.mutate();
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleConfirm = () => {
    if (!contractAmount || parseFloat(contractAmount) < 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    assign.mutate();
  };

  const isLoading = isLoadingItem || isLoadingVendors;

  // Calculate preview amounts for step 2
  const previewAmount = parseFloat(contractAmount) || 0;
  const taxRateNum = parseFloat(taxRate) || 0;
  const previewTax = isTaxInclusive 
    ? previewAmount - (previewAmount / (1 + taxRateNum / 100))
    : previewAmount * (taxRateNum / 100);
  const previewTotal = isTaxInclusive 
    ? previewAmount 
    : previewAmount + previewTax;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Assegna Fornitore" : "Conferma Importo Contratto"}
          </DialogTitle>
        </DialogHeader>
        
        {step === 1 ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Collega la voce "<strong>{itemDescription}</strong>" a un fornitore esistente o creane uno nuovo.
            </p>
            
            {needsContractConfirmation && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Importo attuale: €{(expenseItem?.fixed_amount ?? expenseItem?.estimated_amount)?.toLocaleString('it-IT')}</p>
                    <p className="text-xs mt-1">Nel prossimo step potrai confermare o modificare l'importo del contratto.</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Scegli fornitore</Label>
              <Select value={vendorId} onValueChange={setVendorId} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Caricamento..." : "Seleziona fornitore..."} />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              onClick={handleCreateVendor}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Crea nuovo fornitore
            </Button>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Annulla
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!vendorId || assign.isPending}
                className="flex-1 gap-2"
              >
                {assign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {needsContractConfirmation ? (
                  <>Avanti <ArrowRight className="h-4 w-4" /></>
                ) : (
                  "Conferma"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Current amount reference */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Importo budget attuale (riferimento)</p>
              <p className="font-medium">€{(expenseItem?.fixed_amount ?? expenseItem?.estimated_amount)?.toLocaleString('it-IT')}</p>
            </div>

            {/* Contract amount input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="contractAmount">Importo Contratto</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Inserisci l'importo effettivo del contratto firmato. Può essere diverso dal preventivo iniziale.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="contractAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Tax options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="taxInclusive" className="text-sm">IVA inclusa nell'importo</Label>
                <Switch
                  id="taxInclusive"
                  checked={isTaxInclusive}
                  onCheckedChange={setIsTaxInclusive}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="taxRate" className="text-sm">Aliquota IVA (%)</Label>
                <Select value={taxRate} onValueChange={setTaxRate}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Esente)</SelectItem>
                    <SelectItem value="4">4%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="22">22%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview calculation */}
            {previewAmount > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Imponibile</span>
                  <span>€{(isTaxInclusive ? previewAmount - previewTax : previewAmount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA ({taxRate}%)</span>
                  <span>€{previewTax.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-medium pt-1 border-t">
                  <span>Totale</span>
                  <span>€{previewTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1 gap-2">
                <ArrowLeft className="h-4 w-4" /> Indietro
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={!contractAmount || assign.isPending}
                className="flex-1"
              >
                {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conferma Contratto
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
