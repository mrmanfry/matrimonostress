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
import { PaymentPlanWidget } from "./PaymentPlanWidget";
import { Separator } from "@/components/ui/separator";

interface ExpenseItem {
  id: string;
  description: string;
  category_id: string | null;
  vendor_id: string;
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
    formState: { errors, isSubmitting },
  } = useForm<ExpenseItemFormData>({
    resolver: zodResolver(expenseItemSchema),
    defaultValues: {
      description: "",
    },
  });

  useEffect(() => {
    if (expenseItem) {
      reset({
        description: expenseItem.description,
      });
      setExpenseItemId(expenseItem.id);
    } else {
      reset({
        description: "",
      });
      setExpenseItemId(null);
    }
  }, [expenseItem, open, reset]);

  const onSubmit = async (data: ExpenseItemFormData) => {
    if (authState.status !== "authenticated" || !authState.weddingId) return;

    try {
      if (expenseItem) {
        // Update existing
        const { error } = await supabase
          .from("expense_items")
          .update({
            description: data.description,
            category_id: categoryId,
          })
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
            description: data.description,
            category_id: categoryId,
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
              placeholder="Es: Servizio Fotografico 8h, Album Premium, Video Drone..."
              maxLength={200}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {!expenseItemId && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ℹ️ Salva prima la descrizione della spesa, poi potrai aggiungere il piano di pagamento.
              </p>
            </div>
          )}

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
              {isSubmitting ? "Salvataggio..." : "Salva"}
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
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
