import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  vendors: Array<{ id: string; name: string }>;
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
  const [formData, setFormData] = useState<Expense>(emptyExpense);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData(expense);
    } else {
      setFormData(emptyExpense);
    }
  }, [expense, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving expense:", error);
    } finally {
      setLoading(false);
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Es: Affitto location, Catering, Fiorista"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Categoria *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
              required
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor_id">Fornitore</Label>
            <Select
              value={formData.vendor_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, vendor_id: value === "none" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona fornitore (opzionale)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun fornitore</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_amount">Importo Stimato (€) *</Label>
              <Input
                id="estimated_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.estimated_amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_amount: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="final_amount">Importo Finale (€)</Label>
              <Input
                id="final_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.final_amount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    final_amount: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
                placeholder="Opzionale"
              />
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
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading || !formData.category_id}>
              {loading ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
