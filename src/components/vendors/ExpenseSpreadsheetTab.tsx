import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExpenseLineRow } from "./ExpenseLineRow";
import { ExpenseSummaryCard } from "./ExpenseSummaryCard";

interface ExpenseItem {
  id: string;
  description: string;
  calculation_mode: 'planned' | 'actual';
  planned_adults: number;
  planned_children: number;
  planned_staff: number;
}

interface ExpenseLineItem {
  id?: string;
  expense_item_id: string;
  description: string;
  unit_price: number;
  quantity_type: 'fixed' | 'adults' | 'children' | 'total_guests' | 'staff';
  quantity_fixed: number | null;
  quantity_limit: number | null;
  quantity_range: 'all' | 'up_to' | 'over';
  discount_percentage: number;
  tax_rate: number;
  order_index: number;
}

interface ExpenseSpreadsheetTabProps {
  expenseItem: ExpenseItem;
  onExpenseItemUpdate: () => void;
  onTotalsUpdate: (planned: number, actual: number) => void;
}

export function ExpenseSpreadsheetTab({
  expenseItem,
  onExpenseItemUpdate,
  onTotalsUpdate,
}: ExpenseSpreadsheetTabProps) {
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalMode, setGlobalMode] = useState<'planned' | 'actual'>('planned');
  const [actualAdults, setActualAdults] = useState(0);
  const [actualChildren, setActualChildren] = useState(0);
  const [actualStaff, setActualStaff] = useState(0);
  const [itemDescription, setItemDescription] = useState(expenseItem.description);
  const [plannedAdults, setPlannedAdults] = useState<number | null>(expenseItem.planned_adults);
  const [plannedChildren, setPlannedChildren] = useState<number | null>(expenseItem.planned_children);
  const [plannedStaff, setPlannedStaff] = useState<number | null>(expenseItem.planned_staff);
  const [weddingTargets, setWeddingTargets] = useState({ adults: 100, children: 0, staff: 0 });
  const { toast } = useToast();

  // Load global calculation mode and targets from wedding
  useEffect(() => {
    const loadGlobalSettings = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("wedding_id")
        .eq("user_id", userData.user.id)
        .single();

      if (!userRole) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("calculation_mode, target_adults, target_children, target_staff")
        .eq("id", userRole.wedding_id)
        .single();

      if (weddingData) {
        if (weddingData.calculation_mode) {
          setGlobalMode(weddingData.calculation_mode as 'planned' | 'actual');
        }
        setWeddingTargets({
          adults: weddingData.target_adults || 100,
          children: weddingData.target_children || 0,
          staff: weddingData.target_staff || 0,
        });
      }
    };
    loadGlobalSettings();
  }, []);

  useEffect(() => {
    loadLineItems();
    loadActualGuestCounts();
  }, [expenseItem.id]);

  useEffect(() => {
    const totals = calculateTotals();
    onTotalsUpdate(totals.planned, totals.actual);
  }, [lineItems, plannedAdults, plannedChildren, plannedStaff, actualAdults, actualChildren, actualStaff]);

  const loadLineItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expense_line_items")
        .select("*")
        .eq("expense_item_id", expenseItem.id)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setLineItems((data || []) as ExpenseLineItem[]);
    } catch (error) {
      console.error("Error loading line items:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le righe di costo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActualGuestCounts = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id")
        .eq("created_by", userData.user.id)
        .maybeSingle();

      if (!weddingData) return;

      const { data: parties } = await supabase
        .from("invite_parties")
        .select("id, guests(*)")
        .eq("wedding_id", weddingData.id)
        .eq("rsvp_status", "Confermato");

      let adults = 0;
      let children = 0;
      let staff = 0;

      parties?.forEach((party: any) => {
        party.guests?.forEach((guest: any) => {
          if (guest.is_staff) {
            staff++;
          } else if (guest.is_child) {
            children++;
          } else {
            adults++;
          }
        });
      });

      setActualAdults(adults);
      setActualChildren(children);
      setActualStaff(staff);
    } catch (error) {
      console.error("Error loading guest counts:", error);
    }
  };

  const handleAddLineItem = async () => {
    const newItem: ExpenseLineItem = {
      expense_item_id: expenseItem.id,
      description: "",
      unit_price: 0,
      quantity_type: 'fixed',
      quantity_fixed: 1,
      quantity_limit: null,
      quantity_range: 'all',
      discount_percentage: 0,
      tax_rate: 22,
      order_index: lineItems.length,
    };

    try {
      const { data, error } = await supabase
        .from("expense_line_items")
        .insert(newItem)
        .select()
        .single();

      if (error) throw error;

      setLineItems([...lineItems, data as ExpenseLineItem]);
      toast({
        title: "Riga aggiunta",
        description: "Nuova riga di costo creata",
      });
    } catch (error) {
      console.error("Error adding line item:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere la riga",
        variant: "destructive",
      });
    }
  };

  const handleUpdateLineItem = async (id: string, updates: Partial<ExpenseLineItem>) => {
    try {
      const { error } = await supabase
        .from("expense_line_items")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      setLineItems(lineItems.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
    } catch (error) {
      console.error("Error updating line item:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la riga",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLineItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expense_line_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setLineItems(lineItems.filter(item => item.id !== id));
      toast({
        title: "Riga eliminata",
        description: "La riga di costo è stata rimossa",
      });
    } catch (error) {
      console.error("Error deleting line item:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la riga",
        variant: "destructive",
      });
    }
  };

  const handleSaveDescription = async () => {
    try {
      const { error } = await supabase
        .from("expense_items")
        .update({ 
          description: itemDescription,
          planned_adults: plannedAdults,
          planned_children: plannedChildren,
          planned_staff: plannedStaff,
        })
        .eq("id", expenseItem.id);

      if (error) throw error;

      toast({
        title: "Salvato",
        description: "Descrizione e parametri aggiornati",
      });
      onExpenseItemUpdate();
    } catch (error) {
      console.error("Error updating description:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la descrizione",
        variant: "destructive",
      });
    }
  };

  const calculateLineTotal = (line: ExpenseLineItem, mode: 'planned' | 'actual'): number => {
    let quantity = 0;

    if (line.quantity_type === 'fixed') {
      quantity = line.quantity_fixed || 0;
    } else {
      // Calculate base quantity - use global targets as fallback
      let baseQuantity = 0;
      if (line.quantity_type === 'adults') {
        baseQuantity = mode === 'planned' ? (plannedAdults ?? weddingTargets.adults) : actualAdults;
      } else if (line.quantity_type === 'children') {
        baseQuantity = mode === 'planned' ? (plannedChildren ?? weddingTargets.children) : actualChildren;
      } else if (line.quantity_type === 'staff') {
        baseQuantity = mode === 'planned' ? (plannedStaff ?? weddingTargets.staff) : actualStaff;
      } else if (line.quantity_type === 'total_guests') {
        baseQuantity = mode === 'planned' 
          ? (plannedAdults ?? weddingTargets.adults) + (plannedChildren ?? weddingTargets.children) + (plannedStaff ?? weddingTargets.staff)
          : actualAdults + actualChildren + actualStaff;
      }

      // Apply quantity range logic
      if (line.quantity_range === 'up_to' && line.quantity_limit) {
        quantity = Math.min(baseQuantity, line.quantity_limit);
      } else if (line.quantity_range === 'over' && line.quantity_limit) {
        quantity = Math.max(baseQuantity - line.quantity_limit, 0);
      } else {
        quantity = baseQuantity;
      }
    }

    const subtotal = line.unit_price * quantity;
    const afterDiscount = subtotal * (1 - line.discount_percentage / 100);
    const total = afterDiscount * (1 + line.tax_rate / 100);

    return total;
  };

  const calculateTotals = () => {
    const planned = lineItems.reduce((sum, line) => sum + calculateLineTotal(line, 'planned'), 0);
    const actual = lineItems.reduce((sum, line) => sum + calculateLineTotal(line, 'actual'), 0);
    return { planned, actual };
  };

  const totals = calculateTotals();

  if (loading) {
    return <div className="p-4">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Descrizione e Modalità */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione Spesa</Label>
            <div className="flex gap-2">
              <Input
                id="description"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Es: Catering"
              />
              <Button onClick={handleSaveDescription} variant="outline">
                Salva
              </Button>
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="space-y-2">
              <Label className="font-semibold">Modalità di Calcolo Attiva</Label>
              <div className="flex items-center gap-2">
                <Badge variant={globalMode === 'planned' ? 'default' : 'secondary'}>
                  {globalMode === 'planned' ? '📊 Pianificato' : '✅ Effettivo'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {globalMode === 'planned' 
                    ? 'Stai usando i dati pianificati (preventivo manuale)'
                    : 'Stai usando i dati effettivi (da conferme RSVP)'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Cambia la modalità globale dalla pagina Treasury per passare tra pianificato ed effettivo
              </p>
            </div>
          </div>

          {globalMode === 'planned' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planned_adults">N° Adulti Pianificati</Label>
                <div className="relative">
                  <Input
                    id="planned_adults"
                    type="number"
                    min="0"
                    value={plannedAdults ?? ''}
                    placeholder={`Globale: ${weddingTargets.adults}`}
                    className={plannedAdults === null ? "border-primary/40 bg-primary/5" : ""}
                    onChange={(e) => setPlannedAdults(e.target.value === '' ? null : parseInt(e.target.value) || 0)}
                  />
                  {plannedAdults === null && (
                    <Badge variant="outline" className="absolute -top-2 right-2 text-[10px] bg-background">
                      Eredita globale
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Lascia vuoto per usare il target globale. Scrivi un numero per creare un'eccezione.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="planned_children">N° Bambini Pianificati</Label>
                <div className="relative">
                  <Input
                    id="planned_children"
                    type="number"
                    min="0"
                    value={plannedChildren ?? ''}
                    placeholder={`Globale: ${weddingTargets.children}`}
                    className={plannedChildren === null ? "border-primary/40 bg-primary/5" : ""}
                    onChange={(e) => setPlannedChildren(e.target.value === '' ? null : parseInt(e.target.value) || 0)}
                  />
                  {plannedChildren === null && (
                    <Badge variant="outline" className="absolute -top-2 right-2 text-[10px] bg-background">
                      Eredita globale
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="planned_staff">N° Staff Pianificato</Label>
                <div className="relative">
                  <Input
                    id="planned_staff"
                    type="number"
                    min="0"
                    value={plannedStaff ?? ''}
                    placeholder={`Globale: ${weddingTargets.staff}`}
                    className={plannedStaff === null ? "border-primary/40 bg-primary/5" : ""}
                    onChange={(e) => setPlannedStaff(e.target.value === '' ? null : parseInt(e.target.value) || 0)}
                  />
                  {plannedStaff === null && (
                    <Badge variant="outline" className="absolute -top-2 right-2 text-[10px] bg-background">
                      Eredita globale
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {globalMode === 'actual' && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Invitati Confermati (da RSVP):</p>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Adulti:</span>
                  <span className="ml-2 font-semibold text-green-700 dark:text-green-400">{actualAdults}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Bambini:</span>
                  <span className="ml-2 font-semibold text-green-700 dark:text-green-400">{actualChildren}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Staff:</span>
                  <span className="ml-2 font-semibold text-green-700 dark:text-green-400">{actualStaff}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabella Righe di Costo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Righe di Costo</span>
            <Button onClick={handleAddLineItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Riga
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessuna riga di costo. Clicca "Aggiungi Riga" per iniziare.
            </p>
          ) : (
            lineItems.map((line) => (
              <ExpenseLineRow
                key={line.id}
                lineItem={line}
                calculationMode={globalMode}
                plannedAdults={plannedAdults}
                  plannedChildren={plannedChildren}
                  plannedStaff={expenseItem.planned_staff}
                  actualAdults={actualAdults}
                  actualChildren={actualChildren}
                  actualStaff={actualStaff}
                onUpdate={handleUpdateLineItem}
                onDelete={handleDeleteLineItem}
                totalAmount={calculateLineTotal(line, globalMode)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Riepilogo */}
      <ExpenseSummaryCard
        totalPlanned={totals.planned}
        totalActual={totals.actual}
      />
    </div>
  );
}
