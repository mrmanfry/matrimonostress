import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseSpreadsheetTab } from "./ExpenseSpreadsheetTab";
import { PaymentPlanTab } from "./PaymentPlanTab";
import { supabase } from "@/integrations/supabase/client";
import { calculateExpenseAmount, resolveGuestCounts, inferExpenseType, type ExpenseItem as CalcExpenseItem, type ExpenseLineItem as CalcLineItem, type GuestCounts } from "@/lib/expenseCalculations";

interface ExpenseItem {
  id: string;
  description: string;
  category_id: string | null;
  vendor_id: string;
  total_amount: number | null;
  amount_is_tax_inclusive: boolean;
  tax_rate: number | null;
  calculation_mode: 'planned' | 'actual';
  planned_adults: number;
  planned_children: number;
  planned_staff: number;
}

interface ExpenseItemTabsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  categoryId: string | null;
  expenseItemId: string | null;
  onSaved: () => void;
  calculationMode?: 'planned' | 'expected' | 'confirmed';
}

export function ExpenseItemTabs({
  open,
  onOpenChange,
  vendorId,
  categoryId,
  expenseItemId,
  onSaved,
  calculationMode = 'planned',
}: ExpenseItemTabsProps) {
  const [expenseItem, setExpenseItem] = useState<ExpenseItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>("spreadsheet");
  const [totalPlanned, setTotalPlanned] = useState(0);
  const [totalActual, setTotalActual] = useState(0);

  useEffect(() => {
    if (open && expenseItemId) {
      loadExpenseItem();
      calculateTotalsFromDB(expenseItemId);
    } else if (open && !expenseItemId) {
      createNewExpenseItem();
    }
  }, [open, expenseItemId]);

  const loadExpenseItem = async () => {
    if (!expenseItemId) return;

    try {
      const { data, error } = await supabase
        .from("expense_items")
        .select("*")
        .eq("id", expenseItemId)
        .single();

      if (error) throw error;
      setExpenseItem(data as ExpenseItem);
    } catch (error) {
      console.error("Error loading expense item:", error);
    }
  };

  // Calcola i totali direttamente dal database
  const calculateTotalsFromDB = async (itemId: string) => {
    try {
      // Carica expense item
      const { data: expenseData, error: expenseError } = await supabase
        .from("expense_items")
        .select("*")
        .eq("id", itemId)
        .single();

      if (expenseError || !expenseData) return;

      // Carica line items
      const { data: lineItemsData, error: lineError } = await supabase
        .from("expense_line_items")
        .select("*")
        .eq("expense_item_id", itemId)
        .order("order_index");

      if (lineError) throw lineError;

      // Carica wedding targets per guest counts
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Get wedding ID
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("wedding_id")
        .eq("user_id", userData.user.id)
        .limit(1)
        .maybeSingle();

      let weddingId = roleData?.wedding_id;

      if (!weddingId) {
        const { data: weddingData } = await supabase
          .from("weddings")
          .select("id")
          .eq("created_by", userData.user.id)
          .maybeSingle();
        weddingId = weddingData?.id;
      }

      if (!weddingId) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("target_adults, target_children, target_staff")
        .eq("id", weddingId)
        .single();

      // Carica conteggi ospiti effettivi (expected e confirmed)
      const { data: guestsData } = await supabase
        .from("guests")
        .select("rsvp_status, is_child, is_staff, adults_count, children_count")
        .eq("wedding_id", weddingId);

      const guests = guestsData || [];
      
      // Calcola expected (tutti tranne declined)
      const expectedAdults = guests
        .filter(g => !g.is_child && !g.is_staff && g.rsvp_status !== 'Rifiutato')
        .reduce((sum, g) => sum + (g.adults_count || 1), 0);
      const expectedChildren = guests
        .filter(g => (g.is_child || g.children_count) && g.rsvp_status !== 'Rifiutato')
        .reduce((sum, g) => sum + (g.children_count || 1), 0);
      const expectedStaff = guests
        .filter(g => g.is_staff && g.rsvp_status !== 'Rifiutato')
        .length;

      // Calcola confirmed (solo Confermato)
      const confirmedAdults = guests
        .filter(g => !g.is_child && !g.is_staff && g.rsvp_status === 'Confermato')
        .reduce((sum, g) => sum + (g.adults_count || 1), 0);
      const confirmedChildren = guests
        .filter(g => (g.is_child || g.children_count) && g.rsvp_status === 'Confermato')
        .reduce((sum, g) => sum + (g.children_count || 1), 0);
      const confirmedStaff = guests
        .filter(g => g.is_staff && g.rsvp_status === 'Confermato')
        .length;

      const globalTargets = {
        adults: weddingData?.target_adults || 100,
        children: weddingData?.target_children || 10,
        staff: weddingData?.target_staff || 0
      };

      const plannedCounts = resolveGuestCounts({
        planned_adults: expenseData.planned_adults,
        planned_children: expenseData.planned_children,
        planned_staff: expenseData.planned_staff,
      }, globalTargets);

      const guestCounts: GuestCounts = {
        planned: plannedCounts,
        expected: { adults: expectedAdults, children: expectedChildren, staff: expectedStaff },
        confirmed: { adults: confirmedAdults, children: confirmedChildren, staff: confirmedStaff }
      };

      // Prepara i dati per il calcolo
      const expenseType = inferExpenseType(
        { 
          expense_type: expenseData.expense_type as 'fixed' | 'variable' | 'mixed' | undefined,
          fixed_amount: expenseData.fixed_amount,
          total_amount: expenseData.total_amount
        }, 
        (lineItemsData || []).length > 0
      );
      
      const calcExpenseItem: CalcExpenseItem = {
        id: expenseData.id,
        expense_type: expenseType,
        fixed_amount: expenseData.fixed_amount || expenseData.total_amount || 0,
        planned_adults: plannedCounts.adults,
        planned_children: plannedCounts.children,
        planned_staff: plannedCounts.staff,
        tax_rate: expenseData.tax_rate || 0,
        amount_is_tax_inclusive: expenseData.amount_is_tax_inclusive !== false,
      };

      const calcLineItems: CalcLineItem[] = (lineItemsData || []).map(line => ({
        id: line.id,
        unit_price: line.unit_price || 0,
        quantity_type: (line.quantity_type || 'fixed') as CalcLineItem['quantity_type'],
        quantity_fixed: line.quantity_fixed,
        quantity_limit: line.quantity_limit,
        quantity_range: (line.quantity_range || 'all') as CalcLineItem['quantity_range'],
        discount_percentage: line.discount_percentage || 0,
        tax_rate: line.tax_rate || 0,
      }));

      // Calcola i totali per planned e confirmed
      const planned = calculateExpenseAmount(calcExpenseItem, calcLineItems, 'planned', guestCounts);
      const confirmed = calculateExpenseAmount(calcExpenseItem, calcLineItems, 'confirmed', guestCounts);

      setTotalPlanned(planned);
      setTotalActual(confirmed);
    } catch (error) {
      console.error("Error calculating totals from DB:", error);
    }
  };

  const createNewExpenseItem = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id")
        .eq("created_by", userData.user.id)
        .maybeSingle();

      if (!weddingData) return;

      const { data, error } = await supabase
        .from("expense_items")
        .insert({
          wedding_id: weddingData.id,
          vendor_id: vendorId,
          category_id: categoryId,
          description: "Nuova Spesa",
          calculation_mode: 'planned',
          planned_adults: null,
          planned_children: null,
          planned_staff: null,
        })
        .select()
        .single();

      if (error) throw error;
      setExpenseItem(data as ExpenseItem);
    } catch (error) {
      console.error("Error creating expense item:", error);
    }
  };

  const handleClose = () => {
    onSaved();
    onOpenChange(false);
    setActiveTab("spreadsheet");
  };

  const handleTotalsUpdate = (planned: number, actual: number) => {
    setTotalPlanned(planned);
    setTotalActual(actual);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {expenseItem?.description || "Nuova Spesa"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="spreadsheet">📊 Foglio di Calcolo</TabsTrigger>
            <TabsTrigger value="payments">💳 Piano di Pagamento</TabsTrigger>
          </TabsList>

          <TabsContent value="spreadsheet" className="space-y-4">
            {expenseItem && (
              <ExpenseSpreadsheetTab
                expenseItem={expenseItem}
                onExpenseItemUpdate={loadExpenseItem}
                onTotalsUpdate={handleTotalsUpdate}
              />
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            {expenseItem && (
              <PaymentPlanTab
                vendorId={vendorId}
                expenseItemId={expenseItem.id}
                categoryId={categoryId}
                totalPlanned={totalPlanned}
                totalActual={totalActual}
                calculationMode={calculationMode}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
