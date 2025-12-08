import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, ArrowRight, Search, X, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CalculationModeToggle } from "@/components/ui/calculation-mode-toggle";
import { calculateExpenseAmount, ExpenseItem as ExpenseItemCalc, ExpenseLineItem, GuestCounts } from "@/lib/expenseCalculations";
import { isDeclined, isConfirmed, isPending } from "@/lib/rsvpHelpers";
import { toast } from "sonner";
import { BudgetSpreadsheet } from "@/components/budget/BudgetSpreadsheet";
import { BudgetScenarioBar } from "@/components/budget/BudgetScenarioBar";

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
  expense_type?: string | null;
  fixed_amount?: number | null;
  planned_adults?: number | null;
  planned_children?: number | null;
  planned_staff?: number | null;
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
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [globalMode, setGlobalMode] = useState<'planned' | 'expected' | 'confirmed'>('planned');
  const [guestBreakdown, setGuestBreakdown] = useState({ confirmed: 0, pending: 0, declined: 0 });
  const [guestCounts, setGuestCounts] = useState<GuestCounts | null>(null);
  const [lineItemsMap, setLineItemsMap] = useState<Record<string, ExpenseLineItem[]>>({});

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
      // Load wedding with calculation mode and targets
      const { data: wedding } = await supabase
        .from("weddings")
        .select("total_budget, calculation_mode, target_adults, target_children, target_staff")
        .eq("id", authState.weddingId)
        .single();

      setTotalBudget(wedding?.total_budget || 0);
      setGlobalMode((wedding?.calculation_mode as any) || 'planned');

      // Load expense items with vendor categories
      const { data: items } = await supabase
        .from("expense_items")
        .select("*, vendors(name, expense_categories(name)), expense_categories(name)")
        .eq("wedding_id", authState.weddingId);

      setExpenseItems(items || []);

      // Load expense line items for all expenses
      const itemIds = (items || []).map((i) => i.id);
      const lineItemsData: Record<string, ExpenseLineItem[]> = {};
      
      if (itemIds.length > 0) {
        const { data: lineItems } = await supabase
          .from("expense_line_items")
          .select("*")
          .in("expense_item_id", itemIds);

        // Group line items by expense_item_id
        (lineItems || []).forEach((lineItem) => {
          if (!lineItemsData[lineItem.expense_item_id]) {
            lineItemsData[lineItem.expense_item_id] = [];
          }
          lineItemsData[lineItem.expense_item_id].push(lineItem as ExpenseLineItem);
        });

        // Load payments
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .in("expense_item_id", itemIds);

        setPayments(paymentsData || []);
      }

      setLineItemsMap(lineItemsData);

      // Load guests for expected/confirmed counts
      const { data: guests } = await supabase
        .from("guests")
        .select("rsvp_status, is_child, is_staff")
        .eq("wedding_id", authState.weddingId);

      // Use consistent RSVP status helpers
      const confirmedGuests = (guests || []).filter(g => isConfirmed(g.rsvp_status));
      const declinedGuests = (guests || []).filter(g => isDeclined(g.rsvp_status));
      const pendingGuests = (guests || []).filter(g => isPending(g.rsvp_status));
      // Expected = all guests except declined
      const expectedGuests = (guests || []).filter(g => !isDeclined(g.rsvp_status));

      setGuestBreakdown({
        confirmed: confirmedGuests.length,
        pending: pendingGuests.length,
        declined: declinedGuests.length
      });
      
      const countAdults = (guestList: any[]) => guestList.filter(g => !g.is_child && !g.is_staff).length;
      const countChildren = (guestList: any[]) => guestList.filter(g => g.is_child).length;
      const countStaff = (guestList: any[]) => guestList.filter(g => g.is_staff).length;

      const counts: GuestCounts = {
        planned: {
          adults: wedding?.target_adults || 100,
          children: wedding?.target_children || 0,
          staff: wedding?.target_staff || 0
        },
        expected: {
          adults: countAdults(expectedGuests),
          children: countChildren(expectedGuests),
          staff: countStaff(expectedGuests)
        },
        confirmed: {
          adults: countAdults(confirmedGuests),
          children: countChildren(confirmedGuests),
          staff: countStaff(confirmedGuests)
        }
      };

      setGuestCounts(counts);

      // Generate category breakdown with current mode
      generateCategoryData(items || [], (wedding?.calculation_mode as any) || 'planned');
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

  const calculateDynamicAmount = (item: ExpenseItem, mode: 'planned' | 'expected' | 'confirmed') => {
    if (!guestCounts) return Number(item.total_amount || 0);
    
    const itemLineItems = lineItemsMap[item.id] || [];
    const expenseItemCalc: ExpenseItemCalc = {
      id: item.id,
      expense_type: (item.expense_type || 'fixed') as 'fixed' | 'variable' | 'mixed',
      fixed_amount: item.fixed_amount || null,
      planned_adults: item.planned_adults || 0,
      planned_children: item.planned_children || 0,
      planned_staff: item.planned_staff || 0,
      tax_rate: null,
      amount_is_tax_inclusive: true
    };
    
    return calculateExpenseAmount(expenseItemCalc, itemLineItems, mode, guestCounts);
  };

  const getTotalCommitment = () => {
    // Sum of all expense_items using dynamic calculation based on globalMode
    return expenseItems.reduce((sum, item) => sum + calculateDynamicAmount(item, globalMode), 0);
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

  const generateCategoryData = (items: ExpenseItem[], mode: 'planned' | 'expected' | 'confirmed') => {
    const colors = [
      "hsl(221.2 83.2% 53.3%)", // blue
      "hsl(142.1 76.2% 36.3%)", // green
      "hsl(24.6 95% 53.1%)",    // orange
      "hsl(280.4 89.9% 61.8%)", // purple
      "hsl(346.8 77.2% 49.8%)"  // red
    ];
    
    // Group by category
    const categoryAmounts: Record<string, number> = {};
    
    items.forEach((item) => {
      const categoryName = 
        item.vendors?.expense_categories?.name || 
        item.expense_categories?.name || 
        "Senza Categoria";
      
      // Use dynamic calculation based on mode
      const amount = calculateDynamicAmount(item, mode);
      categoryAmounts[categoryName] = (categoryAmounts[categoryName] || 0) + amount;
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

  const handleModeChange = async (newMode: 'planned' | 'expected' | 'confirmed') => {
    setGlobalMode(newMode);
    
    if (authState.status !== "authenticated" || !authState.weddingId) return;
    
    // Save to DB for synchronization with other pages
    await supabase
      .from("weddings")
      .update({ calculation_mode: newMode })
      .eq("id", authState.weddingId);
    
    // Regenerate category data with new mode
    generateCategoryData(expenseItems, newMode);
    
    toast.success(`Modalità cambiata a: ${
      newMode === 'planned' ? 'Pianificato' :
      newMode === 'expected' ? 'Previsti' : 'Confermati'
    }`);
  };

  const getGuestCountLabel = () => {
    if (!guestCounts) return '';
    const totalPlanned = guestCounts.planned.adults + guestCounts.planned.children + guestCounts.planned.staff;
    
    switch (globalMode) {
      case 'planned': return `su ${totalPlanned} pianificati`;
      case 'expected': return `su ${guestBreakdown.confirmed + guestBreakdown.pending} previsti`;
      case 'confirmed': return `su ${guestBreakdown.confirmed} confermati`;
    }
  };

  const getFilteredExpenseItems = () => {
    return expenseItems.filter((item) => {
      const categoryName = 
        item.vendors?.expense_categories?.name || 
        item.expense_categories?.name || 
        "Senza Categoria";
      
      const vendorName = item.vendors?.name || "";
      const description = item.description || "";
      
      // Category filter
      if (categoryFilter !== "all" && categoryName !== categoryFilter) {
        return false;
      }
      
      // Search filter (searches in voce, fornitore)
      if (searchFilter) {
        const searchLower = searchFilter.toLowerCase();
        const matchesDescription = description.toLowerCase().includes(searchLower);
        const matchesVendor = vendorName.toLowerCase().includes(searchLower);
        if (!matchesDescription && !matchesVendor) {
          return false;
        }
      }
      
      return true;
    });
  };

  const getUniqueCategories = () => {
    const categories = new Set<string>();
    expenseItems.forEach((item) => {
      const categoryName = 
        item.vendors?.expense_categories?.name || 
        item.expense_categories?.name || 
        "Senza Categoria";
      categories.add(categoryName);
    });
    return Array.from(categories).sort();
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

  const totalCurrentModeGuests = guestCounts 
    ? (globalMode === 'planned' 
        ? guestCounts.planned.adults + guestCounts.planned.children + guestCounts.planned.staff
        : globalMode === 'expected'
          ? guestBreakdown.confirmed + guestBreakdown.pending
          : guestBreakdown.confirmed)
    : 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Conto Economico</h1>
          <p className="text-sm md:text-base text-muted-foreground">Vista strategica del budget e degli impegni finanziari</p>
        </div>
        <CalculationModeToggle 
          value={globalMode}
          onValueChange={handleModeChange}
          breakdown={guestBreakdown}
          plannedCounts={guestCounts?.planned}
        />
      </div>

      {/* Scenario Bar - Solo in modalità Pianificato */}
      {globalMode === 'planned' && guestCounts && (
        <BudgetScenarioBar 
          currentMode={globalMode}
          guestCounts={guestCounts}
        />
      )}

      {/* Zero Paradox Warning */}
      {globalMode !== 'planned' && totalCurrentModeGuests === 0 && (
        <Alert variant="destructive" className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Non hai ancora {globalMode === 'confirmed' ? 'ospiti confermati' : 'risposte RSVP'}. 
            Le spese variabili mostrano €0,00. 
            Passa a "Pianificato" per vedere i costi stimati.
          </AlertDescription>
        </Alert>
      )}

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
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
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
            <p className="text-xs text-muted-foreground mt-1">{getGuestCountLabel()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">💰 Margine Rimanente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(getRemainingBudget())}</div>
            <p className="text-xs text-muted-foreground mt-1">{getGuestCountLabel()}</p>
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs md:text-sm font-medium">Da Pagare</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(getTotalCommitment() - getTotalPaid())}</div>
            <p className="text-xs text-muted-foreground mt-1">Residuo da saldare</p>
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
                      // Nascondi label se la percentuale è troppo bassa per evitare sovrapposizioni
                      if (percentValue < 0.05) return null;
                      return `${name}: ${(percentValue * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any) => [formatCurrency(Number(value)), name]}
                  />
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

      {/* Budget Spreadsheet - Smart Excel-like View */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Foglio di Calcolo Budget</h2>
          <p className="text-sm text-muted-foreground">
            Vista dettagliata con budget stimato, costi effettivi e stato pagamenti. Clicca sulla colonna "Stimato" per modificare il budget target.
          </p>
        </div>
        <BudgetSpreadsheet />
      </div>

      {/* Riepilogo Impegni per Fornitore (Legacy View) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Vista Classica - Riepilogo Impegni</CardTitle>
          <CardDescription>
            Vista aggregata dei contratti stipulati. Per il dettaglio delle singole rate e scadenze, vai alla Tesoreria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtri */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per voce o fornitore..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtra per categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                {getUniqueCategories().map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                  {getFilteredExpenseItems().map((item) => {
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
