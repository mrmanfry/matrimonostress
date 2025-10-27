import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { TrendingUp, AlertCircle, Calendar, Euro } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

interface Payment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'Da Pagare' | 'Pagato';
  paid_on_date: string | null;
  expense_item_id: string;
}

interface ExpenseItem {
  id: string;
  description: string;
  vendor_id: string | null;
}

interface ChartDataPoint {
  date: string;
  amount: number;
  dateLabel: string;
  payments: string[];
}

export default function Treasury() {
  const { authState } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [kpis, setKpis] = useState({
    totalCommitment: 0,
    alreadyPaid: 0,
    nextPaymentAmount: 0,
    nextPaymentDaysUntil: null as number | null,
    nextPaymentDescription: "",
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

    // Total Commitment
    const totalCommitment = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Already Paid
    const alreadyPaid = allPayments
      .filter((p) => p.status === "Pagato")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Next Payment
    const futurePayments = allPayments
      .filter((p) => p.status === "Da Pagare" && new Date(p.due_date) >= today)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    let nextPaymentAmount = 0;
    let nextPaymentDaysUntil: number | null = null;
    let nextPaymentDescription = "";

    if (futurePayments.length > 0) {
      const nextPayment = futurePayments[0];
      nextPaymentAmount = Number(nextPayment.amount);
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
    });
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impegno Totale</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalCommitment)}</div>
            <p className="text-xs text-muted-foreground">Totale da pagare (incluso già pagato)</p>
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
            <CardTitle className="text-sm font-medium">Prossima Scadenza</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.nextPaymentAmount > 0 ? formatCurrency(kpis.nextPaymentAmount) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {kpis.nextPaymentDaysUntil !== null
                ? `${kpis.nextPaymentDescription} - tra ${kpis.nextPaymentDaysUntil} giorni`
                : "Nessuna scadenza imminente"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              {payments.filter((p) => p.status === "Da Pagare").length} da pagare
            </p>
          </CardContent>
        </Card>
      </div>

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
