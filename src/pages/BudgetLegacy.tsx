import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ExpenseItem {
  id: string;
  description: string;
  total_amount: number | null;
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
  tax_inclusive: boolean;
  tax_rate: number | null;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Index signature for recharts compatibility
}

export default function BudgetLegacy() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

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

      // Generate category breakdown
      generateCategoryData(items || []);
    } catch (error) {
      console.error("Error loading budget data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentTotal = (payment: Payment) => {
    const baseAmount = Number(payment.amount || 0);
    if (!payment.tax_inclusive && payment.tax_rate) {
      const taxAmount = baseAmount * (Number(payment.tax_rate) / 100);
      return baseAmount + taxAmount;
    }
    return baseAmount;
  };

  const getTotalCommitment = () => {
    // Sum of all expense_items total_amount (this is the REAL commitment)
    return expenseItems.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  };

  const getTotalPaid = () => {
    return payments
      .filter((p) => p.status === "Pagato")
      .reduce((sum, p) => sum + calculatePaymentTotal(p), 0);
  };

  const getRemainingBudget = () => {
    return totalBudget - getTotalCommitment();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const generateCategoryData = (items: ExpenseItem[]) => {
    const colors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
    
    // Group by category
    const categoryAmounts: Record<string, number> = {};
    
    items.forEach((item) => {
      const categoryName = 
        item.vendors?.expense_categories?.name || 
        item.expense_categories?.name || 
        "Senza Categoria";
      
      categoryAmounts[categoryName] = (categoryAmounts[categoryName] || 0) + Number(item.total_amount || 0);
    });

    // Convert to chart data
    const data: CategoryData[] = Object.entries(categoryAmounts)
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);

    setCategoryData(data);
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
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Conto Economico</h1>
        <p className="text-sm md:text-base text-muted-foreground">Vista strategica del budget e degli impegni finanziari</p>
      </div>

      {/* Alert for Treasury */}
      <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-2 border-blue-200 dark:border-blue-800">
        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <strong className="text-base md:text-lg">📊 Per il dettaglio delle scadenze</strong>
            <p className="text-xs md:text-sm mt-1">
              Vai alla Tesoreria per gestire i pagamenti, visualizzare il grafico di esborso e monitorare le scadenze future.
            </p>
          </div>
          <Button onClick={() => navigate("/app/treasury")} className="shrink-0 w-full md:w-auto">
            Vai alla Tesoreria <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Budget Totale Prefissato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">Il tuo tetto massimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Impegno Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(getTotalCommitment())}</div>
            <p className="text-xs text-muted-foreground mt-1">Somma contratti</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">💰 Margine Rimanente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(getRemainingBudget())}</div>
            <p className="text-xs text-muted-foreground mt-1">Ancora da spendere</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Già Pagato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(getTotalPaid())}</div>
            <p className="text-xs text-muted-foreground mt-1">Pagamenti effettuati</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Allocazione Budget per Categoria</CardTitle>
          <CardDescription>
            Visualizza come i tuoi impegni sono distribuiti tra le varie categorie di spesa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nessuna spesa registrata. Vai su "Fornitori" per aggiungere fornitori e iniziare a tracciare i tuoi impegni.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const percentValue = typeof percent === 'number' ? percent : 0;
                      return `${name}: ${(percentValue * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {categoryData.map((category, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(category.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Riepilogo Impegni per Fornitore */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Riepilogo Impegni per Fornitore</CardTitle>
          <CardDescription>
            Vista aggregata dei contratti stipulati. Per il dettaglio delle singole rate e scadenze, vai alla Tesoreria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenseItems.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nessun impegno registrato. Vai su "Fornitori" per aggiungere fornitori e definire i loro contratti.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-sm">Fornitore / Voce</th>
                    <th className="text-left py-3 px-2 font-medium text-sm hidden md:table-cell">Categoria</th>
                    <th className="text-right py-3 px-2 font-medium text-sm">Impegno Totale</th>
                    <th className="text-right py-3 px-2 font-medium text-sm hidden sm:table-cell">Già Pagato</th>
                    <th className="text-center py-3 px-2 font-medium text-sm hidden lg:table-cell">Stato Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseItems.map((item) => {
                    const itemPayments = payments.filter((p) => p.expense_item_id === item.id);
                    const paidPayments = itemPayments.filter((p) => p.status === "Pagato");
                    const totalPaid = paidPayments.reduce((sum, p) => sum + calculatePaymentTotal(p), 0);
                    const totalCommitment = Number(item.total_amount || 0);
                    const categoryName = 
                      item.vendors?.expense_categories?.name || 
                      item.expense_categories?.name || 
                      "Senza Categoria";

                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-sm">{item.description}</p>
                            {item.vendors && (
                              <p className="text-xs text-muted-foreground">{item.vendors.name}</p>
                            )}
                            <p className="text-xs text-muted-foreground md:hidden">{categoryName}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">{categoryName}</span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <p className="font-semibold text-sm">{formatCurrency(totalCommitment)}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            Pagato: {formatCurrency(totalPaid)}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-right hidden sm:table-cell">
                          <p className={`font-medium text-sm ${totalPaid > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {formatCurrency(totalPaid)}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-center hidden lg:table-cell">
                          {itemPayments.length > 0 ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm font-medium">
                                {paidPayments.length}/{itemPayments.length} rate
                              </span>
                              <div className="w-full max-w-[100px] h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 transition-all"
                                  style={{
                                    width: `${(paidPayments.length / itemPayments.length) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Nessuna rata</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
