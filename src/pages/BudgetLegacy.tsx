import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ArrowRight, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExpenseItem {
  id: string;
  description: string;
  vendor_id: string | null;
  vendors?: { 
    name: string;
    expense_categories?: { name: string } | null;
  } | null;
  expense_categories?: { name: string } | null;
}

interface Payment {
  id: string;
  expense_item_id: string;
  amount: number;
  status: string;
}

export default function BudgetLegacy() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);

  useEffect(() => {
    if (authState.status === "authenticated") {
      loadData();
    }
  }, [authState]);

  // Reload data when the page becomes visible again (e.g., when navigating back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && authState.status === "authenticated") {
        loadData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authState]);

  const loadData = async () => {
    if (authState.status !== "authenticated" || !authState.weddingId) return;

    setLoading(true);
    try {
      // Load wedding budget
      const { data: wedding } = await supabase
        .from("weddings")
        .select("total_budget")
        .eq("id", authState.weddingId)
        .single();

      setTotalBudget(wedding?.total_budget || 0);

      // Load expense items with vendor categories
      const { data: items } = await supabase
        .from("expense_items")
        .select("*, vendors(name, expense_categories(name)), expense_categories(name)")
        .eq("wedding_id", authState.weddingId);

      setExpenseItems(items || []);

      // Load payments
      const itemIds = (items || []).map((i) => i.id);
      if (itemIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .in("expense_item_id", itemIds);

        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getExpenseTotal = (expenseItemId: string) => {
    return payments
      .filter((p) => p.expense_item_id === expenseItemId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const getTotalCommitment = () => {
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const getTotalPaid = () => {
    return payments
      .filter((p) => p.status === "Pagato")
      .reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Budget (Legacy)</h1>
        <p className="text-muted-foreground">Vista semplificata delle spese</p>
      </div>

      {/* Alert for new Treasury */}
      <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800">
        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong className="text-lg">✨ Novità: Orizzonte Liquidità</strong>
            <p className="text-sm mt-1">
              Passa alla nuova vista "Tesoreria" per visualizzazioni avanzate con grafico di esborso cumulativo,
              analisi delle scadenze e molto altro!
            </p>
          </div>
          <Button onClick={() => navigate("/app/treasury")} className="ml-4 shrink-0">
            Vai alla Tesoreria <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Budget Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Impegno Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(getTotalCommitment())}</div>
            <p className="text-xs text-muted-foreground mt-1">Somma di tutte le rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Già Pagato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(getTotalPaid())}</div>
            <p className="text-xs text-muted-foreground mt-1">Rate completate</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Elenco Spese</CardTitle>
          <CardDescription>
            Questa è una vista semplificata. Per gestire i piani di pagamento, vai su "Fornitori" o consulta "Tesoreria".
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenseItems.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nessuna spesa registrata. Vai su "Fornitori" per aggiungere fornitori e definire i loro piani di pagamento.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {expenseItems.map((item) => {
                const total = getExpenseTotal(item.id);
                const paymentsForItem = payments.filter((p) => p.expense_item_id === item.id);
                const paidCount = paymentsForItem.filter((p) => p.status === "Pagato").length;

                return (
                  <div key={item.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.description}</h3>
                        <div className="flex gap-2 mt-1">
                          {item.vendors && (
                            <Badge variant="outline" className="text-xs">
                              {item.vendors.name}
                              {item.vendors.expense_categories && (
                                <span className="ml-1 opacity-70">
                                  • {item.vendors.expense_categories.name}
                                </span>
                              )}
                            </Badge>
                          )}
                          {item.expense_categories && (
                            <Badge variant="secondary" className="text-xs">
                              {item.expense_categories.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(total)}</div>
                        <div className="text-xs text-muted-foreground">
                          {paidCount} / {paymentsForItem.length} rate pagate
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
