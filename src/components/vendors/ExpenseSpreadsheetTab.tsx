import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExpenseLineRow } from "./ExpenseLineRow";
import { ExpenseSummaryCard } from "./ExpenseSummaryCard";
import { calculateExpectedCounts, calculateTotalVendorStaff } from "@/lib/expectedCalculator";

interface ExpenseItem {
  id: string;
  description: string;
  calculation_mode: 'planned' | 'confirmed' | 'expected';
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
  price_is_tax_inclusive: boolean;
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
  const [globalMode, setGlobalMode] = useState<'planned' | 'confirmed' | 'expected'>('planned');
  const [actualAdults, setActualAdults] = useState(0);
  const [actualChildren, setActualChildren] = useState(0);
  const [actualStaff, setActualStaff] = useState(0);
  const [expectedAdults, setExpectedAdults] = useState(0);
  const [expectedChildren, setExpectedChildren] = useState(0);
  const [expectedStaff, setExpectedStaff] = useState(0);
  const [itemDescription, setItemDescription] = useState(expenseItem.description);
  const [plannedAdults, setPlannedAdults] = useState<number | null>(expenseItem.planned_adults);
  const [plannedChildren, setPlannedChildren] = useState<number | null>(expenseItem.planned_children);
  const [plannedStaff, setPlannedStaff] = useState<number | null>(expenseItem.planned_staff);
  const [weddingTargets, setWeddingTargets] = useState({ adults: 100, children: 0, staff: 0 });
  const [useCustomCounts, setUseCustomCounts] = useState(
    expenseItem.planned_adults !== null || 
    expenseItem.planned_children !== null || 
    expenseItem.planned_staff !== null
  );
  const { toast } = useToast();

  // Load global calculation mode and targets from wedding
  useEffect(() => {
    const loadGlobalSettings = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Recupera il wedding_id dell'expense item (più affidabile che user_roles per planner multi-wedding)
      const { data: itemRow } = await supabase
        .from("expense_items")
        .select("wedding_id")
        .eq("id", expenseItem.id)
        .maybeSingle();

      const weddingId = itemRow?.wedding_id;
      if (!weddingId) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("calculation_mode, target_adults, target_children, target_staff")
        .eq("id", weddingId)
        .maybeSingle();

      if (weddingData) {
        if (weddingData.calculation_mode) {
          setGlobalMode(weddingData.calculation_mode as 'planned' | 'confirmed' | 'expected');
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
    loadExpectedGuestCounts();
  }, [expenseItem.id]);

  useEffect(() => {
    const totals = calculateTotals();
    onTotalsUpdate(totals.planned, totals.actual);
  }, [lineItems, plannedAdults, plannedChildren, plannedStaff, actualAdults, actualChildren, actualStaff, expectedAdults, expectedChildren, expectedStaff]);

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
      // Recupera wedding_id dall'expense item (più affidabile per planner)
      const { data: itemRow } = await supabase
        .from("expense_items")
        .select("wedding_id")
        .eq("id", expenseItem.id)
        .maybeSingle();

      const weddingId = itemRow?.wedding_id;
      if (!weddingId) return;

      // Conta direttamente dalla tabella guests usando rsvp_status canonico ('confirmed')
      // Sposi (is_couple_member) sono SEMPRE inclusi come adulti.
      // Bambini "infant" (<3 anni) sono ESCLUSI (no coperto).
      const { data: guests } = await supabase
        .from("guests")
        .select("is_child, is_staff, is_couple_member, rsvp_status, child_age_group")
        .eq("wedding_id", weddingId);

      let adults = 0;
      let children = 0;
      let staff = 0;

      guests?.forEach((g: any) => {
        const isConfirmed =
          g.is_couple_member ||
          g.rsvp_status === 'confirmed' ||
          g.rsvp_status === 'Confermato';

        if (!isConfirmed) return;

        if (g.is_staff) {
          staff++;
        } else if (g.is_child) {
          // Escludi infant (<3 anni) dal conteggio pagante
          if (g.child_age_group !== 'infant') children++;
        } else {
          adults++;
        }
      });

      setActualAdults(adults);
      setActualChildren(children);
      setActualStaff(staff);
    } catch (error) {
      console.error("Error loading guest counts:", error);
    }
  };

  const loadExpectedGuestCounts = async () => {
    try {
      const { data: itemRow } = await supabase
        .from("expense_items")
        .select("wedding_id")
        .eq("id", expenseItem.id)
        .maybeSingle();

      const weddingId = itemRow?.wedding_id;
      if (!weddingId) return;

      const { data: guests } = await supabase
        .from("guests")
        .select("id, is_child, is_staff, is_couple_member, save_the_date_sent_at, std_response, party_id, phone, allow_plus_one, plus_one_name, rsvp_status, child_age_group")
        .eq("wedding_id", weddingId);

      const { data: vendors } = await supabase
        .from("vendors")
        .select("staff_meals_count")
        .eq("wedding_id", weddingId);

      if (!guests) return;

      const vendorStaffTotal = calculateTotalVendorStaff(vendors || []);
      // Includi sposi (mangiano!) ed escludi solo staff e infant (<3 anni, no coperto)
      const cateringGuests = guests.filter(
        (g: any) => !g.is_staff && !(g.is_child && g.child_age_group === 'infant')
      );
      const expectedResult = calculateExpectedCounts(cateringGuests, guests, vendorStaffTotal);

      setExpectedAdults(expectedResult.adults);
      setExpectedChildren(expectedResult.children);
      setExpectedStaff(expectedResult.staff);
    } catch (error) {
      console.error("Error loading expected guest counts:", error);
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
      price_is_tax_inclusive: false,
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

  const handleToggleCustomCounts = async (checked: boolean) => {
    setUseCustomCounts(checked);
    
    if (!checked) {
      // Clear local values when switching to global
      setPlannedAdults(null);
      setPlannedChildren(null);
      setPlannedStaff(null);
      
      // Save to DB
      try {
        const { error } = await supabase
          .from("expense_items")
          .update({ 
            planned_adults: null,
            planned_children: null,
            planned_staff: null,
          })
          .eq("id", expenseItem.id);

        if (error) throw error;

        toast({
          title: "Salvato",
          description: "Ora usa i valori globali",
        });
        onExpenseItemUpdate();
      } catch (error) {
        console.error("Error clearing custom counts:", error);
        toast({
          title: "Errore",
          description: "Impossibile salvare le modifiche",
          variant: "destructive",
        });
      }
    }
  };

  const calculateLineTotal = (line: ExpenseLineItem, mode: 'planned' | 'actual' | 'expected'): number => {
    let quantity = 0;

    if (line.quantity_type === 'fixed') {
      quantity = line.quantity_fixed || 0;
    } else {
      // Calculate base quantity - use global targets as fallback
      let baseQuantity = 0;
      const getCount = (type: 'adults' | 'children' | 'staff') => {
        if (mode === 'planned') {
          const custom = type === 'adults' ? plannedAdults : type === 'children' ? plannedChildren : plannedStaff;
          return custom ?? weddingTargets[type];
        } else if (mode === 'expected') {
          return type === 'adults' ? expectedAdults : type === 'children' ? expectedChildren : expectedStaff;
        } else {
          return type === 'adults' ? actualAdults : type === 'children' ? actualChildren : actualStaff;
        }
      };

      if (line.quantity_type === 'adults') {
        baseQuantity = getCount('adults');
      } else if (line.quantity_type === 'children') {
        baseQuantity = getCount('children');
      } else if (line.quantity_type === 'staff') {
        baseQuantity = getCount('staff');
      } else if (line.quantity_type === 'total_guests') {
        baseQuantity = getCount('adults') + getCount('children') + getCount('staff');
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
    const total = line.price_is_tax_inclusive
      ? afterDiscount
      : afterDiscount * (1 + line.tax_rate / 100);

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

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 md:p-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs md:text-sm">Modalità di Calcolo Attiva</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={globalMode === 'planned' ? 'default' : 'secondary'}>
                  {globalMode === 'planned' ? '🎯 Plan.' : '✅ Conf.'}
                </Badge>
                <span className="text-xs md:text-sm text-muted-foreground">
                  {globalMode === 'planned' 
                    ? `Target: ${plannedAdults ?? weddingTargets.adults} adulti, ${plannedChildren ?? weddingTargets.children} bambini, ${plannedStaff ?? weddingTargets.staff} staff`
                    : `Confermati: ${actualAdults} adulti, ${actualChildren} bambini, ${actualStaff} staff`}
                </span>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                💡 Cambia modalità (Plan. / Prev. / Conf.) dalla sezione Spese del fornitore
              </p>
            </div>
          </div>

          {globalMode === 'planned' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox 
                  id="custom-counts" 
                  checked={useCustomCounts}
                  onCheckedChange={handleToggleCustomCounts}
                />
                <Label 
                  htmlFor="custom-counts" 
                  className="text-sm font-medium cursor-pointer"
                >
                  Personalizza conteggio per questa spesa
                </Label>
              </div>
              
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planned_adults">N° Adulti Pianificati</Label>
                  <div className="relative">
                    <Input
                      id="planned_adults"
                      type="number"
                      min="0"
                      disabled={!useCustomCounts}
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
                    {useCustomCounts 
                      ? "Lascia vuoto per usare il target globale. Scrivi un numero per creare un'eccezione."
                      : "Attiva 'Personalizza conteggio' per modificare"
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="planned_children">N° Bambini Pianificati</Label>
                  <div className="relative">
                    <Input
                      id="planned_children"
                      type="number"
                      min="0"
                      disabled={!useCustomCounts}
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
                      disabled={!useCustomCounts}
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
            </div>
          )}

          {globalMode === 'actual' && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Invitati Confermati (da RSVP):</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
          <CardTitle className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span className="text-base md:text-lg">Righe di Costo</span>
            <Button onClick={handleAddLineItem} size="sm" className="w-full md:w-auto">
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
