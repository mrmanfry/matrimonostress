import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Calculator, Users } from "lucide-react";
import { toast } from "sonner";

export function AddBudgetItemDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.weddingId : null;

  // Stato Form
  const [type, setType] = useState<"fixed" | "variable">("fixed");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Fetch Categorie
  const { data: categories } = useQuery({
    queryKey: ["expense-categories", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      const { data } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("wedding_id", weddingId);
      return data || [];
    },
    enabled: !!weddingId,
  });

  // Fetch Wedding Targets per preview
  const { data: weddingTargets } = useQuery({
    queryKey: ["wedding-targets", weddingId],
    queryFn: async () => {
      if (!weddingId) return null;
      const { data } = await supabase
        .from("weddings")
        .select("target_adults, target_children, target_staff")
        .eq("id", weddingId)
        .single();
      return data;
    },
    enabled: !!weddingId,
  });

  const guestCount = weddingTargets?.target_adults || 100;

  // Preview Calcolo Real-Time
  const previewTotal = type === "variable" 
    ? (parseFloat(amount || "0") * (guestCount || 0)) 
    : parseFloat(amount || "0");

  const createItem = useMutation({
    mutationFn: async () => {
      if (!weddingId) throw new Error("Wedding ID mancante");
      if (!categoryId || !description || !amount) throw new Error("Compila tutti i campi");

      const numAmount = parseFloat(amount);
      
      // 1. Crea l'item padre
      const { data: newItem, error: itemError } = await supabase
        .from("expense_items")
        .insert({
          wedding_id: weddingId,
          description,
          category_id: categoryId,
          expense_type: type,
          estimated_amount: type === "fixed" ? numAmount : null,
          vendor_id: null, // PLACEHOLDER
          planned_adults: weddingTargets?.target_adults || 100,
          planned_children: weddingTargets?.target_children || 0,
          planned_staff: weddingTargets?.target_staff || 0,
          calculation_mode: "planned",
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // 2. Se Variabile, crea la riga di dettaglio
      if (type === "variable") {
        const { error: lineError } = await supabase
          .from("expense_line_items")
          .insert({
            expense_item_id: newItem.id,
            description: "Costo stimato per persona",
            quantity_type: "adults",
            unit_price: numAmount,
            quantity_range: "all",
            order_index: 0,
            discount_percentage: 0,
            tax_rate: 22,
          });
        if (lineError) throw lineError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-spreadsheet"] });
      toast.success("Voce aggiunta al budget!");
      setIsOpen(false);
      setDescription("");
      setAmount("");
      setCategoryId("");
      setType("fixed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Calculator className="w-4 h-4" /> Aggiungi Voce Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nuova Voce di Budget (Placeholder)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          
          {/* Tipo Spesa */}
          <div className="space-y-3">
            <Label>Tipologia di Costo</Label>
            <RadioGroup value={type} onValueChange={(v: any) => setType(v)} className="grid grid-cols-2 gap-4">
              <div>
                <RadioGroupItem value="fixed" id="fixed" className="peer sr-only" />
                <Label
                  htmlFor="fixed"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-lg font-bold">€ Fisso</span>
                  <span className="text-xs text-muted-foreground">es. Fotografo</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="variable" id="variable" className="peer sr-only" />
                <Label
                  htmlFor="variable"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-lg font-bold">€ / Persona</span>
                  <span className="text-xs text-muted-foreground">es. Catering</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label>Cosa devi prenotare?</Label>
            <Input 
              placeholder="Es. Bomboniere, DJ..." 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Seleziona categoria" /></SelectTrigger>
              <SelectContent>
                {categories?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Importo con Preview */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-4 border border-border">
            <div className="space-y-2">
              <Label className="font-semibold">
                {type === "fixed" ? "Budget Stimato Totale" : "Costo Stimato per Ospite"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">€</span>
                <Input 
                  type="number" 
                  className="pl-8 text-lg font-medium" 
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>

            {type === "variable" && (
              <div className="flex items-center gap-2 text-sm bg-background p-2 rounded border border-border">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">x {guestCount} ospiti previsti = </span>
                <span className="font-bold text-foreground">
                  {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(previewTotal)}
                </span>
              </div>
            )}
          </div>
          
          <Button 
            onClick={() => createItem.mutate()} 
            disabled={createItem.isPending || !categoryId || !description || !amount} 
            className="w-full"
          >
            {createItem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aggiungi al Budget
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
