import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseSpreadsheetTab } from "./ExpenseSpreadsheetTab";
import { PaymentPlanTab } from "./PaymentPlanTab";
import { supabase } from "@/integrations/supabase/client";

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
    } else if (open && !expenseItemId) {
      // Crea un nuovo expense item
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
          planned_adults: null, // Eredita automaticamente dai target globali
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
