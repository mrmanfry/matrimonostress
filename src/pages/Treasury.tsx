import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { TrendingUp, AlertCircle, Calendar, Euro, ExternalLink, Check } from "lucide-react";
import { format, parseISO, addDays, isBefore, isAfter } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'Da Pagare' | 'Pagato';
  paid_on_date: string | null;
  paid_by: string | null;
  expense_item_id: string;
  tax_inclusive: boolean;
  tax_rate: number | null;
}

interface ExpenseItem {
  id: string;
  description: string;
  vendor_id: string | null;
  vendors?: {
    id: string;
    name: string;
  } | null;
}

interface ChartDataPoint {
  date: string;
  amount: number;
  dateLabel: string;
  payments: string[];
}

export default function Treasury() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [timeFilter, setTimeFilter] = useState<"all" | "30" | "90" | "month">("all");
  const [paymentToMark, setPaymentToMark] = useState<Payment | null>(null);
  const [kpis, setKpis] = useState({
    totalCommitment: 0,
    alreadyPaid: 0,
    nextPaymentAmount: 0,
    nextPaymentDaysUntil: null as number | null,
    nextPaymentDescription: "",
    next7DaysAmount: 0,
    busiestMonth: { month: "", amount: 0 },
  });

  useEffect(() => {
    if (authState.status === "authenticated") {
      loadData();
    }
  }, [authState]);

  const loadData = async () => {
    if (authState.status !== "authenticated" || !authState.weddingId) return;
    const weddingId = authState.weddingId;

    setLoading(true);
    try {
      // Load expense items
      const { data: itemsData, error: itemsError } = await supabase
        .from("expense_items")
        .select("*")
        .eq("wedding_id", weddingId);

      if (itemsError) throw itemsError;

      const items = itemsData || [];
      setExpenseItems(items);

      // Load payments
      const itemIds = items.map((item) => item.id);
      if (itemIds.length === 0) {
        setPayments([]);
        setChartData([]);
        calculateKPIs([], items);
        setLoading(false);
        return;
      }

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .in("expense_item_id", itemIds)
        .order("due_date", { ascending: true });

      if (paymentsError) throw paymentsError;

      const allPayments = (paymentsData || []).map(p => ({
        ...p,
        status: p.status as 'Da Pagare' | 'Pagato'
      }));
      setPayments(allPayments);

      // Generate chart data
      generateChartData(allPayments, items);

      // Calculate KPIs
      calculateKPIs(allPayments, items);
    } catch (error) {
      console.error("Error loading treasury data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (allPayments: Payment[], items: ExpenseItem[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate "Già Pagato"
    const alreadyPaid = allPayments
      .filter((p) => p.status === "Pagato")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Filter future payments (Da Pagare)
    const futurePayments = allPayments
      .filter((p) => p.status === "Da Pagare" && new Date(p.due_date) >= today)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    // Group by date
    const paymentsByDate: Record<string, { amount: number; payments: string[] }> = {};
    futurePayments.forEach((payment) => {
      const dateKey = payment.due_date;
      if (!paymentsByDate[dateKey]) {
        paymentsByDate[dateKey] = { amount: 0, payments: [] };
      }
      paymentsByDate[dateKey].amount += Number(payment.amount);
      paymentsByDate[dateKey].payments.push(payment.description);
    });

    // Build cumulative chart data
    let cumulative = alreadyPaid;
    const data: ChartDataPoint[] = [
      {
        date: format(today, "yyyy-MM-dd"),
        amount: cumulative,
        dateLabel: "Oggi",
        payments: [],
      },
    ];

    Object.keys(paymentsByDate)
      .sort()
      .forEach((dateKey) => {
        cumulative += paymentsByDate[dateKey].amount;
        data.push({
          date: dateKey,
          amount: cumulative,
          dateLabel: format(parseISO(dateKey), "dd MMM yyyy", { locale: it }),
          payments: paymentsByDate[dateKey].payments,
        });
      });

    setChartData(data);
  };

  const calculateKPIs = (allPayments: Payment[], items: ExpenseItem[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total Commitment (Only unpaid)
    const totalCommitment = allPayments
      .filter((p) => p.status === "Da Pagare")
      .reduce((sum, p) => sum + calculatePaymentTotal(p), 0);

    // Already Paid
    const alreadyPaid = allPayments
      .filter((p) => p.status === "Pagato")
      .reduce((sum, p) => sum + calculatePaymentTotal(p), 0);

    // Next 7 Days Amount
    const next7Days = addDays(today, 7);
    const next7DaysAmount = allPayments
      .filter((p) => {
        if (p.status !== "Da Pagare") return false;
        const dueDate = new Date(p.due_date);
        return dueDate >= today && dueDate <= next7Days;
      })
      .reduce((sum, p) => sum + calculatePaymentTotal(p), 0);

    // Busiest Month
    const futurePayments = allPayments.filter(
      (p) => p.status === "Da Pagare" && new Date(p.due_date) >= today
    );
    const monthlyAmounts: Record<string, number> = {};
    futurePayments.forEach((p) => {
      const monthKey = format(parseISO(p.due_date), "MMMM yyyy", { locale: it });
      monthlyAmounts[monthKey] = (monthlyAmounts[monthKey] || 0) + calculatePaymentTotal(p);
    });
    let busiestMonth = { month: "", amount: 0 };
    Object.entries(monthlyAmounts).forEach(([month, amount]) => {
      if (amount > busiestMonth.amount) {
        busiestMonth = { month, amount };
      }
    });

    // Next Payment
    const nextPayments = allPayments
      .filter((p) => p.status === "Da Pagare" && new Date(p.due_date) >= today)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    let nextPaymentAmount = 0;
    let nextPaymentDaysUntil: number | null = null;
    let nextPaymentDescription = "";

    if (nextPayments.length > 0) {
      const nextPayment = nextPayments[0];
      nextPaymentAmount = calculatePaymentTotal(nextPayment);
      const dueDate = new Date(nextPayment.due_date);
      const diffTime = dueDate.getTime() - today.getTime();
      nextPaymentDaysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      nextPaymentDescription = nextPayment.description;
    }

    setKpis({
      totalCommitment,
      alreadyPaid,
      nextPaymentAmount,
      nextPaymentDaysUntil,
      nextPaymentDescription,
      next7DaysAmount,
      busiestMonth,
    });
  };

  const calculatePaymentTotal = (payment: Payment) => {
    const baseAmount = Number(payment.amount || 0);
    if (!payment.tax_inclusive && payment.tax_rate) {
      const taxAmount = baseAmount * (Number(payment.tax_rate) / 100);
      return baseAmount + taxAmount;
    }
    return baseAmount;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const getVendorName = (expenseItemId: string) => {
    const item = expenseItems.find((i) => i.id === expenseItemId);
    return item?.vendors?.name || "N/A";
  };

  const getVendorId = (expenseItemId: string) => {
    const item = expenseItems.find((i) => i.id === expenseItemId);
    return item?.vendor_id || null;
  };

  const handleMarkAsPaid = async () => {
    if (!paymentToMark) return;

    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "Pagato",
          paid_on_date: format(new Date(), "yyyy-MM-dd"),
        })
        .eq("id", paymentToMark.id);

      if (error) throw error;

      toast({
        title: "Pagamento registrato",
        description: `€${formatCurrency(calculatePaymentTotal(paymentToMark))} a ${getVendorName(paymentToMark.expense_item_id)}`,
      });

      // Reload data
      await loadData();
      setPaymentToMark(null);
    } catch (error) {
      console.error("Error marking payment as paid:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il pagamento",
        variant: "destructive",
      });
    }
  };

  // Filter future payments based on time filter
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredFuturePayments = payments
    .filter((p) => {
      if (p.status !== "Da Pagare") return false;
      const dueDate = new Date(p.due_date);
      if (dueDate < today) return false;

      if (timeFilter === "30") {
        return dueDate <= addDays(today, 30);
      } else if (timeFilter === "90") {
        return dueDate <= addDays(today, 90);
      }
      return true;
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Orizzonte Liquidità</h1>
        <p className="text-muted-foreground">
          Monitora i tuoi impegni di pagamento e la disponibilità futura
        </p>
      </div>

      {/* KPI Cards - Enhanced */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impegno Totale</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(kpis.totalCommitment)}</div>
            <p className="text-xs text-muted-foreground">Da pagare</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Già Pagato</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(kpis.alreadyPaid)}</div>
            <p className="text-xs text-muted-foreground">Pagamenti completati</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prossimi 7 Giorni</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(kpis.next7DaysAmount)}
            </div>
            <p className="text-xs text-muted-foreground">In scadenza</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mese Più Intenso</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.busiestMonth.amount)}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.busiestMonth.month || "Nessun mese"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card Riepilogo Contributi */}
      {(() => {
        const contributionsByPayer = payments
          .filter(p => p.status === 'Pagato' && p.paid_by)
          .reduce((acc, p) => {
            const payer = p.paid_by || 'Non specificato';
            acc[payer] = (acc[payer] || 0) + calculatePaymentTotal(p);
            return acc;
          }, {} as Record<string, number>);

        const hasContributions = Object.keys(contributionsByPayer).length > 0;

        if (!hasContributions) return null;

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chi Ha Pagato Cosa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(contributionsByPayer)
                  .sort(([, a], [, b]) => b - a)
                  .map(([payer, amount]) => (
                    <div key={payer} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{payer}</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">TOTALE PAGATO</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(
                        Object.values(contributionsByPayer).reduce((sum, val) => sum + val, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Grafico di Esborso Cumulativo</CardTitle>
          <CardDescription>
            Visualizza l'andamento dei pagamenti nel tempo. Il grafico parte dal totale già pagato e sale a "gradini" ad ogni scadenza futura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Non ci sono pagamenti programmati. Aggiungi un "Piano di Pagamento" ai tuoi fornitori per vedere il grafico.
              </AlertDescription>
            </Alert>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Data: ${label}`}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartDataPoint;
                      return (
                        <div className="bg-card border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.dateLabel}</p>
                          <p className="text-sm text-muted-foreground">
                            Totale cumulativo: <span className="font-bold text-foreground">{formatCurrency(data.amount)}</span>
                          </p>
                          {data.payments.length > 0 && (
                            <div className="mt-2 border-t pt-2">
                              <p className="text-xs font-semibold mb-1">Pagamenti in scadenza:</p>
                              <ul className="text-xs space-y-1">
                                {data.payments.map((p, idx) => (
                                  <li key={idx}>• {p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="stepAfter"
                  dataKey="amount"
                  fill="hsl(var(--primary) / 0.1)"
                  stroke="none"
                />
                <Line
                  type="stepAfter"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Future Cash Flows List */}
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio Pagamenti Futuri</CardTitle>
          <CardDescription>
            Lista azionabile dei pagamenti in scadenza. Clicca su un fornitore per vedere i dettagli.
          </CardDescription>
          <div className="flex gap-2 mt-4">
            <Button
              variant={timeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("all")}
            >
              Tutti
            </Button>
            <Button
              variant={timeFilter === "30" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("30")}
            >
              Prossimi 30gg
            </Button>
            <Button
              variant={timeFilter === "90" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("90")}
            >
              Prossimi 90gg
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFuturePayments.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nessun pagamento futuro nel periodo selezionato.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Scadenza</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead>Fornitore</TableHead>
                    <TableHead className="text-right">Importo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFuturePayments.map((payment) => {
                    const vendorId = getVendorId(payment.expense_item_id);
                    const vendorName = getVendorName(payment.expense_item_id);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(parseISO(payment.due_date), "dd MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>
                          {vendorId ? (
                            <button
                              onClick={() => navigate(`/app/vendors?vendor=${vendorId}`)}
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              {vendorName}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-muted-foreground">{vendorName}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(calculatePaymentTotal(payment))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPaymentToMark(payment)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Segna Pagato
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark as Paid Dialog */}
      <AlertDialog open={!!paymentToMark} onOpenChange={() => setPaymentToMark(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Confermi di aver pagato{" "}
              <strong className="text-foreground">
                {paymentToMark && formatCurrency(calculatePaymentTotal(paymentToMark))}
              </strong>{" "}
              a{" "}
              <strong className="text-foreground">
                {paymentToMark && getVendorName(paymentToMark.expense_item_id)}
              </strong>
              ?
              <br />
              <br />
              Questa azione aggiornerà automaticamente il grafico e i KPI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid}>Conferma Pagamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info Banner */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Come funziona:</strong> Vai nella scheda di un fornitore e aggiungi il suo "Piano di Pagamento" (rate e scadenze). 
          Il sistema popolerà automaticamente questo grafico per mostrarti quando dovrai avere i soldi pronti.
        </AlertDescription>
      </Alert>
    </div>
  );
}
