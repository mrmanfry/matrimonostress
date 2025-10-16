import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { expenseSchema, type ExpenseFormData } from "@/lib/validationSchemas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Expense {
  id?: string;
  description: string;
  category_id: string;
  estimated_amount: number;
  final_amount: number | null;
  vendor_id: string | null;
}

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  categories: Array<{ id: string; name: string }>;
  vendors: Array<{ id: string; name: string; category_id?: string | null }>;
  onSave: (expense: Expense) => Promise<void>;
}

const emptyExpense: Expense = {
  description: "",
  category_id: "",
  estimated_amount: 0,
  final_amount: null,
  vendor_id: null,
};

export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  categories,
  vendors,
  onSave,
}: ExpenseDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: emptyExpense,
  });

  const categoryId = watch("category_id");
  const vendorId = watch("vendor_id");

  useEffect(() => {
    if (expense) {
      reset(expense);
    } else {
      reset(emptyExpense);
    }
  }, [expense, open, reset]);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      const expenseData = {
        ...data,
        id: expense?.id,
        description: data.description,
        category_id: data.category_id,
        estimated_amount: data.estimated_amount,
        final_amount: data.final_amount || null,
        vendor_id: data.vendor_id || null,
      };
      await onSave(expenseData as Expense);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {expense ? "Modifica Spesa" : "Nuova Spesa"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione *</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Es: Affitto location, Catering, Fiorista"
              maxLength={200}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Categoria *</Label>
            <Select
              value={categoryId}
              onValueChange={(value) => setValue("category_id", value, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-sm text-destructive">{errors.category_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor_id">Fornitore</Label>
            <Select
              value={vendorId || "none"}
              onValueChange={(value) => setValue("vendor_id", value === "none" ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona fornitore (opzionale)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun fornitore</SelectItem>
                {vendors
                  .filter((vendor) => {
                    // Filtra vendor per categoria se la spesa ha una categoria
                    if (!categoryId) return true;
                    return !vendor.category_id || vendor.category_id === categoryId;
                  })
                  .map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {categoryId && vendors.filter(v => !v.category_id || v.category_id === categoryId).length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nessun fornitore disponibile per questa categoria
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_amount">Importo Stimato (€) *</Label>
              <Input
                id="estimated_amount"
                type="number"
                min="0"
                step="0.01"
                {...register("estimated_amount", { valueAsNumber: true })}
              />
              {errors.estimated_amount && (
                <p className="text-sm text-destructive">{errors.estimated_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="final_amount">Importo Finale (€)</Label>
              <Input
                id="final_amount"
                type="number"
                min="0"
                step="0.01"
                {...register("final_amount", { 
                  valueAsNumber: true,
                  setValueAs: (v) => v === "" ? null : parseFloat(v)
                })}
                placeholder="Opzionale"
              />
              {errors.final_amount && (
                <p className="text-sm text-destructive">{errors.final_amount.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Lascia vuoto se non ancora confermato
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
