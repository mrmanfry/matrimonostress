import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronUp, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ExpenseItemDialog } from "./ExpenseItemDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ExpenseItem {
  id: string;
  description: string;
  category_id: string | null;
  vendor_id: string;
  total_amount: number | null;
  amount_is_tax_inclusive: boolean;
  tax_rate: number | null;
}

interface Payment {
  id: string;
  description: string;
  amount: number;
  amount_type: 'fixed' | 'percentage';
  percentage_value: number | null;
  due_date: string;
  status: 'Da Pagare' | 'Pagato';
}

interface ExpenseItemsManagerProps {
  vendorId: string;
  categoryId: string | null;
}

export function ExpenseItemsManager({ vendorId, categoryId }: ExpenseItemsManagerProps) {
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExpenseItem, setSelectedExpenseItem] = useState<ExpenseItem | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (vendorId) {
      loadExpenseItems();
    }
  }, [vendorId]);

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
      setExpenseItems(items);

      // Load payments for each item
      if (items.length > 0) {
        const itemIds = items.map(item => item.id);
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
    setSelectedExpenseItem(null);
    setDialogOpen(true);
  };

  const handleEditExpenseItem = (item: ExpenseItem) => {
    setSelectedExpenseItem(item);
    setDialogOpen(true);
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

  const calculateItemTotal = (itemId: string): number => {
    const itemPayments = payments[itemId] || [];
    return itemPayments.reduce((sum, p) => {
      if (p.amount_type === 'fixed') {
        return sum + Number(p.amount);
      }
      return sum;
    }, 0);
  };

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

  const totalVendorAmount = expenseItems.reduce((sum, item) => {
    return sum + (item.total_amount || calculateItemTotal(item.id));
  }, 0);

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
              {expenseItems.map((item) => {
                const itemPayments = payments[item.id] || [];
                const itemTotal = item.total_amount || calculateItemTotal(item.id);
                const isExpanded = expandedItems.has(item.id);

                return (
                  <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleExpanded(item.id)}>
                    <div className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.description}</h4>
                            <span className="text-lg font-semibold text-primary">
                              {formatCurrency(itemTotal)}
                            </span>
                          </div>
                          {itemPayments.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {itemPayments.length} {itemPayments.length === 1 ? 'rata' : 'rate'}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExpenseItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {itemPayments.length > 0 && (
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                      </div>

                      <CollapsibleContent className="space-y-2 pt-2">
                        {itemPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="ml-4 pl-4 border-l-2 flex items-center justify-between text-sm"
                          >
                            <div>
                              <span className="font-medium">{payment.description}</span>
                              {payment.amount_type === 'percentage' && payment.percentage_value && (
                                <span className="text-muted-foreground ml-2">
                                  ({payment.percentage_value}%)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {payment.amount_type === 'fixed' && (
                                <span className="font-semibold">
                                  {formatCurrency(Number(payment.amount))}
                                </span>
                              )}
                              <span className="text-muted-foreground">
                                📅 {formatDate(payment.due_date)}
                              </span>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  payment.status === 'Pagato'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                }`}
                              >
                                {payment.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">TOTALE FORNITORE:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalVendorAmount)}
                  </span>
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

      <ExpenseItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vendorId={vendorId}
        categoryId={categoryId}
        expenseItem={selectedExpenseItem}
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
