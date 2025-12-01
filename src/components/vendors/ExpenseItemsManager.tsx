import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExpenseItemTabs } from "./ExpenseItemTabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExpenseItemCard } from "./ExpenseItemCard";

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

interface ExpenseLineItem {
  id: string;
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

interface Payment {
  id: string;
  description: string;
  amount: number;
  amount_type: 'fixed' | 'percentage';
  percentage_value: number | null;
  due_date: string;
  status: 'Da Pagare' | 'Pagato';
  tax_rate: number | null;
  tax_inclusive: boolean;
}

interface ExpenseItemsManagerProps {
  vendorId: string;
  categoryId: string | null;
}

export function ExpenseItemsManager({ vendorId, categoryId }: ExpenseItemsManagerProps) {
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [lineItems, setLineItems] = useState<Record<string, ExpenseLineItem[]>>({});
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [loading, setLoading] = useState(true);
  const [tabsOpen, setTabsOpen] = useState(false);
  const [selectedExpenseItemId, setSelectedExpenseItemId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [actualAdults, setActualAdults] = useState(0);
  const [actualChildren, setActualChildren] = useState(0);
  const [actualStaff, setActualStaff] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (vendorId) {
      loadExpenseItems();
      loadActualGuestCounts();
    }
  }, [vendorId]);

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

  const loadExpenseItems = async () => {
    setLoading(true);
    try {
      // Load expense items
      const { data: itemsData, error: itemsError } = await supabase
        .from("expense_items")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      const items = itemsData || [];
      setExpenseItems(items as ExpenseItem[]);

      // Load line items and payments for each item
      if (items.length > 0) {
        const itemIds = items.map(item => item.id);
        
        // Load line items
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from("expense_line_items")
          .select("*")
          .in("expense_item_id", itemIds)
          .order("order_index", { ascending: true });

        if (lineItemsError) throw lineItemsError;

        // Group line items by expense_item_id
        const lineItemsByItem = (lineItemsData || []).reduce((acc, lineItem) => {
          if (!acc[lineItem.expense_item_id]) {
            acc[lineItem.expense_item_id] = [];
          }
          acc[lineItem.expense_item_id].push(lineItem as ExpenseLineItem);
          return acc;
        }, {} as Record<string, ExpenseLineItem[]>);

        setLineItems(lineItemsByItem);

        // Load payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .in("expense_item_id", itemIds)
          .order("due_date", { ascending: true });

        if (paymentsError) throw paymentsError;

        // Group payments by expense_item_id
        const paymentsByItem = (paymentsData || []).reduce((acc, payment) => {
          if (!acc[payment.expense_item_id]) {
            acc[payment.expense_item_id] = [];
          }
          acc[payment.expense_item_id].push(payment as Payment);
          return acc;
        }, {} as Record<string, Payment[]>);

        setPayments(paymentsByItem);
      }
    } catch (error) {
      console.error("Error loading expense items:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le spese",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpenseItem = () => {
    setSelectedExpenseItemId(null);
    setTabsOpen(true);
  };

  const handleEditExpenseItem = (itemId: string) => {
    setSelectedExpenseItemId(itemId);
    setTabsOpen(true);
  };

  const handleDeleteExpenseItem = async (itemId: string) => {
    try {
      // Delete payments first
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("expense_item_id", itemId);

      if (paymentsError) throw paymentsError;

      // Delete expense item
      const { error: itemError } = await supabase
        .from("expense_items")
        .delete()
        .eq("id", itemId);

      if (itemError) throw itemError;

      toast({
        title: "Spesa eliminata",
        description: "La spesa e i suoi pagamenti sono stati eliminati",
      });

      loadExpenseItems();
    } catch (error) {
      console.error("Error deleting expense item:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la spesa",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  const calculateLineTotal = (lineItem: ExpenseLineItem, item: ExpenseItem): number => {
    let quantity = 0;

    if (lineItem.quantity_type === 'fixed') {
      quantity = lineItem.quantity_fixed || 0;
    } else {
      // Calculate base quantity
      let baseQuantity = 0;
      const mode = item.calculation_mode;
      
      if (lineItem.quantity_type === 'adults') {
        baseQuantity = mode === 'planned' ? item.planned_adults : actualAdults;
      } else if (lineItem.quantity_type === 'children') {
        baseQuantity = mode === 'planned' ? item.planned_children : actualChildren;
      } else if (lineItem.quantity_type === 'staff') {
        baseQuantity = mode === 'planned' ? item.planned_staff : actualStaff;
      } else if (lineItem.quantity_type === 'total_guests') {
        baseQuantity = mode === 'planned' 
          ? item.planned_adults + item.planned_children + item.planned_staff
          : actualAdults + actualChildren + actualStaff;
      }

      // Apply quantity range logic
      if (lineItem.quantity_range === 'up_to' && lineItem.quantity_limit) {
        quantity = Math.min(baseQuantity, lineItem.quantity_limit);
      } else if (lineItem.quantity_range === 'over' && lineItem.quantity_limit) {
        quantity = Math.max(baseQuantity - lineItem.quantity_limit, 0);
      } else {
        quantity = baseQuantity;
      }
    }

    const subtotal = lineItem.unit_price * quantity;
    const afterDiscount = subtotal * (1 - lineItem.discount_percentage / 100);
    const total = afterDiscount * (1 + lineItem.tax_rate / 100);

    return total;
  };

  const calculateItemTotal = useCallback(async (item: ExpenseItem): Promise<number> => {
    // Import centralized calculation library
    const { calculateExpenseAmount, inferExpenseType } = await import("@/lib/expenseCalculations");
    
    // Get wedding data for global mode
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return 0;
    
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("wedding_id")
      .eq("user_id", userData.user.id)
      .single();
    
    if (!userRole) return 0;
    
    const { data: weddingData } = await supabase
      .from("weddings")
      .select("calculation_mode")
      .eq("id", userRole.wedding_id)
      .single();
    
    const globalMode = weddingData?.calculation_mode || 'planned';
    
    const itemLines = lineItems[item.id] || [];
    const hasLineItems = itemLines.length > 0;
    
    // Infer expense type for legacy data
    const expenseType = inferExpenseType(item, hasLineItems);
    
    const guestCounts = {
      planned: {
        adults: item.planned_adults,
        children: item.planned_children,
        staff: item.planned_staff
      },
      actual: {
        adults: actualAdults,
        children: actualChildren,
        staff: actualStaff
      }
    };
    
    // Use centralized calculation
    return calculateExpenseAmount(
      { 
        ...item, 
        expense_type: expenseType,
        fixed_amount: item.total_amount || null
      },
      itemLines,
      globalMode as 'planned' | 'actual',
      guestCounts
    );
  }, [lineItems, actualAdults, actualChildren, actualStaff]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const [totalVendorAmount, setTotalVendorAmount] = useState(0);
  
  useEffect(() => {
    const calculateTotal = async () => {
      let sum = 0;
      for (const item of expenseItems) {
        sum += await calculateItemTotal(item);
      }
      setTotalVendorAmount(sum);
    };
    calculateTotal();
  }, [expenseItems, lineItems, actualAdults, actualChildren, actualStaff]);

  const calculateAmountPaid = (): number => {
    return Object.values(payments).flat().reduce((sum, payment) => {
      if (payment.status === 'Pagato' && payment.amount_type === 'fixed') {
        let amount = Number(payment.amount);
        // Se IVA Esclusa, aggiungi l'IVA all'importo
        if (payment.tax_inclusive === false && payment.tax_rate) {
          amount = amount * (1 + Number(payment.tax_rate) / 100);
        }
        return sum + amount;
      }
      return sum;
    }, 0);
  };

  const amountPaid = calculateAmountPaid();
  const amountRemaining = totalVendorAmount - amountPaid;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spese di questo Fornitore</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Spese di questo Fornitore</CardTitle>
          <CardDescription>
            Gestisci le spese e i piani di pagamento per questo fornitore
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {expenseItems.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-muted-foreground">
                Nessuna spesa registrata per questo fornitore
              </p>
              <Button onClick={handleAddExpenseItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Prima Spesa
              </Button>
            </div>
          ) : (
            <>
              {expenseItems.map((item) => (
                <ExpenseItemCard
                  key={item.id}
                  item={item}
                  payments={payments[item.id] || []}
                  isExpanded={expandedItems.has(item.id)}
                  onToggleExpand={() => toggleExpanded(item.id)}
                  onEdit={() => handleEditExpenseItem(item.id)}
                  onDelete={() => confirmDelete(item.id)}
                  calculateTotal={calculateItemTotal}
                />
              ))}

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">TOTALE FORNITORE:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalVendorAmount)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center justify-between px-3 py-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <span className="text-green-700 dark:text-green-400">Importo Pagato:</span>
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      {formatCurrency(amountPaid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                    <span className="text-amber-700 dark:text-amber-400">Da Pagare:</span>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {formatCurrency(amountRemaining)}
                    </span>
                  </div>
                </div>
                
                <Button onClick={handleAddExpenseItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Nuova Spesa
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ExpenseItemTabs
        open={tabsOpen}
        onOpenChange={setTabsOpen}
        vendorId={vendorId}
        categoryId={categoryId}
        expenseItemId={selectedExpenseItemId}
        onSaved={loadExpenseItems}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa spesa? Verranno eliminati anche tutti i pagamenti associati.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  handleDeleteExpenseItem(itemToDelete);
                  setDeleteDialogOpen(false);
                  setItemToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
