import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentPlanWidget } from "./PaymentPlanWidget";
import { Separator } from "@/components/ui/separator";

interface ExpenseItem {
  id: string;
  description: string;
  category_id: string | null;
  vendor_id: string;
  total_amount: number | null;
  amount_is_tax_inclusive: boolean;
  tax_rate: number | null;
}

interface ExpenseItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  categoryId: string | null;
  expenseItem: ExpenseItem | null;
  onSaved: () => void;
}

const expenseItemSchema = z.object({
  description: z.string().min(1, "La descrizione è obbligatoria").max(200, "Massimo 200 caratteri"),
  total_amount: z.string().optional(),
  amount_is_tax_inclusive: z.boolean(),
  tax_rate: z.string().optional(),
});

type ExpenseItemFormData = z.infer<typeof expenseItemSchema>;

export function ExpenseItemDialog({
  open,
  onOpenChange,
  vendorId,
  categoryId,
  expenseItem,
  onSaved,
}: ExpenseItemDialogProps) {
  const [expenseItemId, setExpenseItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const { authState } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseItemFormData>({
    resolver: zodResolver(expenseItemSchema),
    defaultValues: {
      description: "",
      total_amount: "",
      amount_is_tax_inclusive: true,
      tax_rate: "22",
    },
  });

  const watchTotalAmount = watch("total_amount");
  const watchAmountLogic = watch("amount_is_tax_inclusive");
  const watchTaxRate = watch("tax_rate");

  // Calcoli per il riepilogo
  const calculateSummary = () => {
    const amount = parseFloat(watchTotalAmount || "0");
    const taxRate = parseFloat(watchTaxRate || "0") / 100;

    if (isNaN(amount) || amount === 0) {
      return { taxable: 0, tax: 0, total: 0 };
    }

    if (watchAmountLogic) {
      // IVA Inclusa: totale è l'input, calcolo imponibile
      const total = amount;
      const taxable = total / (1 + taxRate);
      const tax = total - taxable;
      return { taxable, tax, total };
    } else {
      // IVA Esclusa: imponibile è l'input, calcolo totale
      const taxable = amount;
      const tax = taxable * taxRate;
      const total = taxable + tax;
      return { taxable, tax, total };
    }
  };

  const summary = calculateSummary();

  useEffect(() => {
    if (expenseItem) {
      reset({
        description: expenseItem.description,
        total_amount: expenseItem.total_amount ? String(expenseItem.total_amount) : "",
        amount_is_tax_inclusive: expenseItem.amount_is_tax_inclusive !== false,
        tax_rate: expenseItem.tax_rate ? String(expenseItem.tax_rate) : "22",
      });
      setExpenseItemId(expenseItem.id);
    } else {
      reset({
        description: "",
        total_amount: "",
        amount_is_tax_inclusive: true,
        tax_rate: "22",
      });
      setExpenseItemId(null);
    }
  }, [expenseItem, open, reset]);

  const onSubmit = async (data: ExpenseItemFormData) => {
    if (authState.status !== "authenticated" || !authState.weddingId) return;

    try {
      const expenseData = {
        description: data.description,
        category_id: categoryId,
        total_amount: data.total_amount ? parseFloat(data.total_amount) : null,
        amount_is_tax_inclusive: data.amount_is_tax_inclusive,
        tax_rate: data.tax_rate ? parseFloat(data.tax_rate) : null,
      };

      if (expenseItem) {
        // Update existing
        const { error } = await supabase
          .from("expense_items")
          .update(expenseData)
          .eq("id", expenseItem.id);

        if (error) throw error;

        toast({
          title: "Spesa aggiornata",
          description: "Le modifiche sono state salvate",
        });
      } else {
        // Create new
        const { data: newItem, error } = await supabase
          .from("expense_items")
          .insert({
            wedding_id: authState.weddingId,
            vendor_id: vendorId,
            ...expenseData,
          })
          .select("id")
          .single();

        if (error) throw error;

        setExpenseItemId(newItem.id);

        toast({
          title: "Spesa creata",
          description: "Ora puoi aggiungere il piano di pagamento qui sotto",
        });
      }

      onSaved();
    } catch (error) {
      console.error("Error saving expense item:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la spesa",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    reset();
    setExpenseItemId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {expenseItem ? "Modifica Spesa" : "Nuova Spesa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione Spesa *</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Es: Servizio Fotografico Completo"
              maxLength={200}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* TESTATA SPESA: Importo Contratto e IVA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="total_amount">Importo Contratto</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("total_amount")}
                  placeholder="Es: 3000"
                />
                <p className="text-xs text-muted-foreground">
                  Inserisci il valore totale del contratto (opzionale)
                </p>
              </div>

              {watchTotalAmount && parseFloat(watchTotalAmount) > 0 && (
                <>
                  <div className="space-y-3">
                    <Label>Logica Importo</Label>
                    <RadioGroup
                      value={watchAmountLogic ? "inclusive" : "exclusive"}
                      onValueChange={(val) => {
                        const form = document.querySelector('form');
                        const input = form?.querySelector('input[name="amount_is_tax_inclusive"]') as HTMLInputElement;
                        if (input) {
                          const event = new Event('input', { bubbles: true });
                          input.value = val === "inclusive" ? "true" : "false";
                          input.dispatchEvent(event);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="inclusive" id="inclusive" />
                        <Label htmlFor="inclusive" className="font-normal cursor-pointer">
                          L'importo è il TOTALE FINALE (IVA Inclusa)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="exclusive" id="exclusive" />
                        <Label htmlFor="exclusive" className="font-normal cursor-pointer">
                          L'importo è l'IMPONIBILE (IVA Esclusa)
                        </Label>
                      </div>
                    </RadioGroup>
                    <input type="hidden" {...register("amount_is_tax_inclusive")} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax_rate">Aliquota IVA (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register("tax_rate")}
                      placeholder="22"
                    />
                  </div>

                  {/* RIEPILOGO CALCOLI */}
                  <div className="bg-background border rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-sm">Riepilogo Importi</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">IMPONIBILE</p>
                        <p className="font-mono font-semibold">€ {summary.taxable.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">IVA</p>
                        <p className="font-mono font-semibold">€ {summary.tax.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">TOTALE FATTURA</p>
                        <p className="font-mono font-semibold text-primary">€ {summary.total.toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      ℹ️ Questo è il totale che verrà suddiviso nelle rate sottostanti
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {expenseItemId ? "Chiudi" : "Annulla"}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : "Salva Testata"}
            </Button>
          </DialogFooter>
        </form>

        {/* Payment Plan Widget - mostra solo se la spesa è stata salvata */}
        {expenseItemId && (
          <>
            <Separator className="my-6" />
            <PaymentPlanWidget
              vendorId={vendorId}
              expenseItemId={expenseItemId}
              categoryId={categoryId}
              totalInvoice={summary.total}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
