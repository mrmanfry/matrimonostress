import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { TrendingUp, AlertCircle, Calendar, Euro, ExternalLink, Check, ChevronDown } from "lucide-react";
import { LockedCard } from "@/components/ui/locked-card";
import { format, parseISO, addDays, isBefore, isAfter } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { MarkPaymentDialog } from "@/components/treasury/MarkPaymentDialog";
import { UnallocatedExpensesWidget } from "@/components/treasury/UnallocatedExpensesWidget";
import { CalculationModeToggle } from "@/components/ui/calculation-mode-toggle";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { calculateExpenseAmount } from "@/lib/expenseCalculations";
import { calculateExpectedCounts, calculateTotalVendorStaff, type Guest, type ExpectedResult } from "@/lib/expectedCalculator";

interface Payment {
  id: string;
  description: string;
  amount: number;
  amount_type?: 'fixed' | 'percentage' | 'balance';
  percentage_value?: number | null;
  percentage_base?: 'planned' | 'actual' | null;
  balance_base?: 'planned' | 'actual' | null;
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
  expense_type: 'fixed' | 'variable' | 'mixed' | null;
  planned_adults: number | null;
  planned_children: number | null;
  planned_staff: number | null;
  fixed_amount: number | null;
  tax_rate: number | null;
  amount_is_tax_inclusive: boolean | null;
  vendors?: {
    id: string;
    name: string;
  } | null;
}

interface ExpenseLineItem {
  id: string;
  expense_item_id: string;
  description: string;
  quantity_type: 'adults' | 'children' | 'staff' | 'total_guests' | 'fixed';
  quantity_fixed: number | null;
  quantity_range: 'all' | 'up_to' | 'over' | null;
  quantity_limit: number | null;
  unit_price: number;
  discount_percentage: number | null;
  tax_rate: number | null;
}

interface ChartDataPoint {
  date: string;
  amount: number;
  dateLabel: string;
  payments: string[];
}

export default function Treasury() {
  const { authState, isPlanner, isCollaborator } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [expenseLineItems, setExpenseLineItems] = useState<ExpenseLineItem[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [weddingTargets, setWeddingTargets] = useState<{ adults: number; children: number; staff: number }>({
    adults: 100,
    children: 0,
    staff: 0
  });
  const [timeFilter, setTimeFilter] = useState<"all" | "30" | "90" | "7">("all");
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [paymentToMark, setPaymentToMark] = useState<Payment | null>(null);
  const [contributors, setContributors] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [globalMode, setGlobalMode] = useState<'planned' | 'expected' | 'confirmed'>('planned');
  const [guestBreakdown, setGuestBreakdown] = useState<{
    confirmed: { adults: number; children: number; staff: number };
    pending: { adults: number; children: number; staff: number };
    declined: { adults: number; children: number; staff: number };
  }>({
    confirmed: { adults: 0, children: 0, staff: 0 },
    pending: { adults: 0, children: 0, staff: 0 },
    declined: { adults: 0, children: 0, staff: 0 }
  });
  const [expectedDetails, setExpectedDetails] = useState<ExpectedResult | null>(null);
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

  // FR-DB-4.1.B - Intercetta parametri URL per deep linking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('payment_id');
    const action = urlParams.get('action');
    
    if (paymentId && action === 'pay' && !loading && payments.length > 0) {
      // Trova il pagamento nella lista
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        // Scrolla fino alla tabella
        const timer = setTimeout(() => {
          document.getElementById('payments-list')?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
          
          // Apri immediatamente il dialog
          setTimeout(() => {
            setPaymentToMark(payment);
          }, 500);
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [loading, payments]);

  const loadData = async () => {
    if (authState.status !== "authenticated" || !authState.activeWeddingId) return;
    const weddingId = authState.activeWeddingId;

    setLoading(true);
    try {
      // Load wedding data to get global calculation_mode
      const { data: weddingData, error: weddingError } = await supabase
        .from("weddings")
        .select("calculation_mode")
        .eq("id", weddingId)
        .single();

      if (weddingError) throw weddingError;
      if (weddingData?.calculation_mode) {
        setGlobalMode(weddingData.calculation_mode as 'planned' | 'expected' | 'confirmed');
      }

      // Load guests with STD data, nucleus fields, and +1 fields for expected calculation
      const { data: allGuests } = await supabase
        .from("guests")
        .select("id, is_child, is_staff, rsvp_status, save_the_date_sent_at, std_response, party_id, phone, allow_plus_one, plus_one_name")
        .eq("wedding_id", weddingId);

      // Load all vendors to get total staff
      const { data: allVendors } = await supabase
        .from("vendors")
        .select("staff_meals_count")
        .eq("wedding_id", weddingId);

      const breakdown = {
        confirmed: {
          adults: allGuests?.filter(g => !g.is_child && !g.is_staff && g.rsvp_status === 'confirmed').length || 0,
          children: allGuests?.filter(g => g.is_child && g.rsvp_status === 'confirmed').length || 0,
          staff: allGuests?.filter(g => g.is_staff && g.rsvp_status === 'confirmed').length || 0
        },
        pending: {
          adults: allGuests?.filter(g => !g.is_child && !g.is_staff && g.rsvp_status === 'pending').length || 0,
          children: allGuests?.filter(g => g.is_child && g.rsvp_status === 'pending').length || 0,
          staff: allGuests?.filter(g => g.is_staff && g.rsvp_status === 'pending').length || 0
        },
        declined: {
          adults: allGuests?.filter(g => !g.is_child && !g.is_staff && g.rsvp_status === 'declined').length || 0,
          children: allGuests?.filter(g => g.is_child && g.rsvp_status === 'declined').length || 0,
          staff: allGuests?.filter(g => g.is_staff && g.rsvp_status === 'declined').length || 0
        }
      };
      setGuestBreakdown(breakdown);

      // Calculate expected counts with new STD-based logic (nucleus-aware) + +1
      const vendorStaffTotal = calculateTotalVendorStaff(allVendors || []);
      const allGuestsForCalc: Guest[] = (allGuests || []).map(g => ({
        id: g.id,
        is_child: g.is_child,
        is_staff: g.is_staff || false,
        save_the_date_sent_at: g.save_the_date_sent_at,
        std_response: g.std_response,
        rsvp_status: g.rsvp_status,
        party_id: g.party_id,
        phone: g.phone,
        allow_plus_one: g.allow_plus_one || false,
        plus_one_name: g.plus_one_name
      }));
      
      const expectedResult = calculateExpectedCounts(allGuestsForCalc, allGuestsForCalc, vendorStaffTotal);
      setExpectedDetails(expectedResult);

      // Load expense items with vendor info
      const { data: itemsData, error: itemsError } = await supabase
        .from("expense_items")
        .select("*, vendors(id, name)")
        .eq("wedding_id", weddingId);

      if (itemsError) throw itemsError;

      const items = (itemsData || []).map(item => ({
        ...item,
        expense_type: item.expense_type as 'fixed' | 'variable' | 'mixed' | null
      }));
      setExpenseItems(items);

      // Load line items for all expense items
      const itemIds = items.map(item => item.id);
      let lineItems: ExpenseLineItem[] = [];
      if (itemIds.length > 0) {
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from("expense_line_items")
          .select("*")
          .in("expense_item_id", itemIds);

        if (lineItemsError) throw lineItemsError;
        lineItems = (lineItemsData || []).map(li => ({
          ...li,
          quantity_type: li.quantity_type as 'adults' | 'children' | 'staff' | 'total_guests' | 'fixed',
          quantity_range: li.quantity_range as 'all' | 'up_to' | 'over' | null
        }));
      }
      setExpenseLineItems(lineItems);

      // Load wedding targets for planned mode
      const { data: weddingTargetsData } = await supabase
        .from("weddings")
        .select("target_adults, target_children, target_staff")
        .eq("id", weddingId)
        .single();

      const targets = {
        adults: weddingTargetsData?.target_adults || 100,
        children: weddingTargetsData?.target_children || 0,
        staff: weddingTargetsData?.target_staff || 0
      };
      setWeddingTargets(targets);

      // Get the current mode to use for calculations
      const currentMode = weddingData?.calculation_mode as 'planned' | 'expected' | 'confirmed' || 'planned';

      // Load payments
      if (itemIds.length === 0) {
        setPayments([]);
        setChartData([]);
        setContributors([]);
        setAllocations([]);
        calculateKPIs([], items, lineItems, targets, breakdown, currentMode);
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
        status: p.status as 'Da Pagare' | 'Pagato',
        amount_type: (p.amount_type || 'fixed') as 'fixed' | 'percentage' | 'balance',
        percentage_base: p.percentage_base as 'planned' | 'actual' | null,
        balance_base: p.balance_base as 'planned' | 'actual' | null,
      }));
      setPayments(allPayments);

      // Load contributors
      const { data: contributorsData, error: contributorsError } = await supabase
        .from("financial_contributors")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("is_default", { ascending: false });

      if (contributorsError) throw contributorsError;
      setContributors(contributorsData || []);

      // Load allocations for paid payments with detailed info
      const paidPaymentIds = allPayments.filter(p => p.status === 'Pagato').map(p => p.id);
      if (paidPaymentIds.length > 0) {
        const { data: allocationsData, error: allocationsError } = await supabase
          .from("payment_allocations")
          .select(`
            id,
            amount,
            payment_id,
            contributor_id,
            payments (
              id,
              description,
              paid_on_date,
              expense_item_id
            )
          `)
          .in("payment_id", paidPaymentIds);

        if (allocationsError) throw allocationsError;
        
        // Enrich with expense item and vendor info
        const enrichedAllocations = (allocationsData || []).map(alloc => {
          const payment = alloc.payments as any;
          const expenseItem = items.find(ei => ei.id === payment?.expense_item_id);
          return {
            ...alloc,
            paymentDescription: payment?.description || '',
            paidOnDate: payment?.paid_on_date || null,
            expenseDescription: expenseItem?.description || '',
            vendorName: expenseItem?.vendors?.name || null,
            vendorId: expenseItem?.vendor_id || null,
          };
        });
        
        setAllocations(enrichedAllocations);
      } else {
        setAllocations([]);
      }

      // Generate chart data with explicit mode
      generateChartData(allPayments, items, lineItems, targets, breakdown, currentMode, expectedResult);

      // Calculate KPIs with explicit mode
      calculateKPIs(allPayments, items, lineItems, targets, breakdown, currentMode, expectedResult);
    } catch (error) {
      console.error("Error loading treasury data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (
    allPayments: Payment[], 
    items: ExpenseItem[], 
    lineItems: ExpenseLineItem[],
    targets: { adults: number; children: number; staff: number },
    breakdown: typeof guestBreakdown,
    mode: 'planned' | 'expected' | 'confirmed',
    expectedResult?: ExpectedResult
  ) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build guest counts for current mode - use expectedResult for expected mode
    const guestCounts = {
      planned: targets,
      expected: expectedResult 
        ? { adults: expectedResult.adults, children: expectedResult.children, staff: expectedResult.staff }
        : {
            adults: breakdown.confirmed.adults + breakdown.pending.adults,
            children: breakdown.confirmed.children + breakdown.pending.children,
            staff: breakdown.confirmed.staff + breakdown.pending.staff
          },
      confirmed: breakdown.confirmed
    };

    // Calculate "Già Pagato"
    const alreadyPaid = allPayments
      .filter((p) => p.status === "Pagato")
      .reduce((sum, p) => sum + calculatePaymentTotalDynamic(p, items, lineItems, guestCounts, mode), 0);

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
      paymentsByDate[dateKey].amount += calculatePaymentTotalDynamic(payment, items, lineItems, guestCounts, mode);
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

  const calculateKPIs = (
    allPayments: Payment[], 
    items: ExpenseItem[], 
    lineItems: ExpenseLineItem[],
    targets: { adults: number; children: number; staff: number },
    breakdown: typeof guestBreakdown,
    mode: 'planned' | 'expected' | 'confirmed',
    expectedResult?: ExpectedResult
  ) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build guest counts for current mode - use expectedResult for expected mode
    const guestCounts = {
      planned: targets,
      expected: expectedResult 
        ? { adults: expectedResult.adults, children: expectedResult.children, staff: expectedResult.staff }
        : {
            adults: breakdown.confirmed.adults + breakdown.pending.adults,
            children: breakdown.confirmed.children + breakdown.pending.children,
            staff: breakdown.confirmed.staff + breakdown.pending.staff
          },
      confirmed: breakdown.confirmed
    };

    // Total Commitment (Only unpaid)
    const totalCommitment = allPayments
      .filter((p) => p.status === "Da Pagare")
      .reduce((sum, p) => sum + calculatePaymentTotalDynamic(p, items, lineItems, guestCounts, mode), 0);

    // Already Paid
    const alreadyPaid = allPayments
      .filter((p) => p.status === "Pagato")
      .reduce((sum, p) => sum + calculatePaymentTotalDynamic(p, items, lineItems, guestCounts, mode), 0);

    // Next 7 Days Amount
    const next7Days = addDays(today, 7);
    const next7DaysAmount = allPayments
      .filter((p) => {
        if (p.status !== "Da Pagare") return false;
        const dueDate = new Date(p.due_date);
        return dueDate >= today && dueDate <= next7Days;
      })
      .reduce((sum, p) => sum + calculatePaymentTotalDynamic(p, items, lineItems, guestCounts, mode), 0);

    // Busiest Month
    const futurePayments = allPayments.filter(
      (p) => p.status === "Da Pagare" && new Date(p.due_date) >= today
    );
    const monthlyAmounts: Record<string, number> = {};
    futurePayments.forEach((p) => {
      const monthKey = format(parseISO(p.due_date), "MMMM yyyy", { locale: it });
      monthlyAmounts[monthKey] = (monthlyAmounts[monthKey] || 0) + calculatePaymentTotalDynamic(p, items, lineItems, guestCounts, mode);
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
      nextPaymentAmount = calculatePaymentTotalDynamic(nextPayment, items, lineItems, guestCounts, mode);
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

  // Calcola l'importo del pagamento in base al tipo e alla modalità globale
  const calculatePaymentTotalDynamic = (
    payment: Payment,
    items: ExpenseItem[],
    lineItems: ExpenseLineItem[],
    guestCounts: {
      planned: { adults: number; children: number; staff: number };
      expected: { adults: number; children: number; staff: number };
      confirmed: { adults: number; children: number; staff: number };
    },
    mode: 'planned' | 'expected' | 'confirmed'
  ) => {
    let baseAmount = 0;

    // Trova l'expense item associato
    const expenseItem = items.find(item => item.id === payment.expense_item_id);
    
    if (!expenseItem) {
      console.warn(`⚠️ Payment ${payment.id} (${payment.description}) non ha un expense_item associato`);
      return Number(payment.amount || 0);
    }

    // Calcola il totale dell'expense in base alla modalità passata esplicitamente
    const expenseLineItemsForItem = lineItems.filter(li => li.expense_item_id === expenseItem.id);
    const expenseTotal = calculateExpenseAmount(
      expenseItem,
      expenseLineItemsForItem,
      mode,
      guestCounts
    );

    // Calcola baseAmount in base al tipo di pagamento
    if (payment.amount_type === 'fixed') {
      baseAmount = Number(payment.amount || 0);
    } else if (payment.amount_type === 'percentage') {
      // Ricalcola in base alla percentuale sul totale dell'expense
      const percentage = Number(payment.percentage_value || 0);
      baseAmount = (expenseTotal * percentage) / 100;
    } else if (payment.amount_type === 'balance') {
      // Il saldo è il totale meno tutti i pagamenti precedenti
      const allPaymentsForItem = payments.filter(p => p.expense_item_id === payment.expense_item_id);
      const previousPayments = allPaymentsForItem
        .filter(p => p.id !== payment.id && p.amount_type !== 'balance')
        .reduce((sum, p) => {
          if (p.amount_type === 'fixed') {
            return sum + Number(p.amount || 0);
          } else if (p.amount_type === 'percentage') {
            const pct = Number(p.percentage_value || 0);
            return sum + (expenseTotal * pct) / 100;
          }
          return sum;
        }, 0);
      
      baseAmount = Math.max(0, expenseTotal - previousPayments);
    }

    // Applica IVA se necessario
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

  const handlePaymentSuccess = async () => {
    await loadData();
    setPaymentToMark(null);
  };

  // Filter future payments based on time filter and date filter
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredFuturePayments = payments
    .filter((p) => {
      if (p.status !== "Da Pagare") return false;
      const dueDate = new Date(p.due_date);
      if (dueDate < today) return false;

      // If date filter is active, filter by that date
      if (dateFilter) {
        return p.due_date === dateFilter;
      }

      if (timeFilter === "7") {
        return dueDate <= addDays(today, 7);
      } else if (timeFilter === "30") {
        return dueDate <= addDays(today, 30);
      } else if (timeFilter === "90") {
        return dueDate <= addDays(today, 90);
      }
      return true;
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  // Locked state for planners without budget access
  const activePermissions = authState.status === 'authenticated' ? authState.activePermissions : null;
  if (isCollaborator && !activePermissions?.budget_visible) {
    return (
      <LockedCard
        variant="full-page"
        title="Sezione riservata agli sposi"
        subtitle="Non hai accesso alla Tesoreria"
        message="Questa sezione è gestita direttamente dagli sposi. Per visualizzarla, chiedi agli sposi di abilitare l'accesso."
      />
    );
  }

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

  const handleModeChange = async (newMode: 'planned' | 'expected' | 'confirmed') => {
    if (authState.status !== 'authenticated' || !authState.activeWeddingId) return;
    
    try {
      const { error } = await supabase
        .from('weddings')
        .update({ calculation_mode: newMode })
        .eq('id', authState.activeWeddingId);
      
      if (error) throw error;
      
      setGlobalMode(newMode);
      
      const modeLabels = {
        planned: 'pianificati (target contrattuali)',
        expected: 'previsti (lista invitati - rifiutati)',
        confirmed: 'confermati (solo RSVP confermati)'
      };
      
      toast({
        title: 'Modalità aggiornata',
        description: `Ora stai visualizzando i dati ${modeLabels[newMode]}`
      });
      
      // Reload data to reflect new calculations
      await loadData();
    } catch (error) {
      console.error('Error updating calculation mode:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare la modalità',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header with Global Toggle */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Orizzonte Liquidità</h1>
          <p className="text-muted-foreground">
            Monitora i tuoi impegni di pagamento e la disponibilità futura
          </p>
        </div>
        
        {/* Global Calculation Mode Toggle */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <Label className="text-base font-semibold">Modalità di Calcolo Globale</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {globalMode === 'planned' && 'Stai visualizzando i dati pianificati (target contrattuali)'}
                  {globalMode === 'expected' && expectedDetails && `Stai visualizzando i previsti: ${expectedDetails.details}`}
                  {globalMode === 'expected' && !expectedDetails && 'Stai visualizzando i previsti (lista invitati - rifiutati)'}
                  {globalMode === 'confirmed' && 'Stai visualizzando solo gli invitati confermati'}
                </p>
              </div>
              <CalculationModeToggle
                value={globalMode}
                onValueChange={handleModeChange}
                breakdown={{
                  confirmed: guestBreakdown.confirmed.adults + guestBreakdown.confirmed.children + guestBreakdown.confirmed.staff,
                  pending: guestBreakdown.pending.adults + guestBreakdown.pending.children + guestBreakdown.pending.staff,
                  declined: guestBreakdown.declined.adults + guestBreakdown.declined.children + guestBreakdown.declined.staff
                }}
                plannedCounts={weddingTargets}
                expectedDetails={expectedDetails || undefined}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unallocated Expenses Widget */}
      {authState.status === "authenticated" && authState.activeWeddingId && (
        <UnallocatedExpensesWidget weddingId={authState.activeWeddingId} globalMode={globalMode} />
      )}

      {/* KPI Cards - INTERACTIVE */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setTimeFilter("all");
            setDateFilter(null);
            document.getElementById("payments-list")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impegno Totale</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400 truncate">{formatCurrency(kpis.totalCommitment)}</div>
            <p className="text-xs text-muted-foreground">Da pagare · Clicca per dettagli</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Già Pagato</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600 truncate">{formatCurrency(kpis.alreadyPaid)}</div>
            <p className="text-xs text-muted-foreground">Pagamenti completati</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setTimeFilter("7");
            setDateFilter(null);
            document.getElementById("payments-list")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prossimi 7 Giorni</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate">
              {formatCurrency(kpis.next7DaysAmount)}
            </div>
            <p className="text-xs text-muted-foreground">In scadenza · Clicca per dettagli</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setTimeFilter("all");
            setDateFilter(null);
            document.getElementById("payments-list")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mese Più Intenso</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(kpis.busiestMonth.amount)}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.busiestMonth.month || "Nessun mese"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cruscotto Fondi di Progetto */}
      {(() => {
        // Calculate contributions from allocations with detailed breakdown
        const contributionsByContributor = contributors.reduce((acc, contributor) => {
          const contributorAllocations = allocations.filter(a => a.contributor_id === contributor.id);
          const totalPaid = contributorAllocations.reduce((sum, a) => sum + Number(a.amount), 0);
          
          acc[contributor.id] = {
            name: contributor.name,
            paid: totalPaid,
            target: contributor.contribution_target || null,
            allocations: contributorAllocations.map(a => ({
              id: a.id,
              amount: Number(a.amount),
              paymentDescription: a.paymentDescription || '',
              paidOnDate: a.paidOnDate || null,
              expenseDescription: a.expenseDescription || '',
              vendorName: a.vendorName || null,
              vendorId: a.vendorId || null,
            })),
          };
          return acc;
        }, {} as Record<string, { 
          name: string; 
          paid: number; 
          target: number | null;
          allocations: Array<{
            id: string;
            amount: number;
            paymentDescription: string;
            paidOnDate: string | null;
            expenseDescription: string;
            vendorName: string | null;
            vendorId: string | null;
          }>;
        }>);

        const hasContributors = contributors.length > 0;
        if (!hasContributors) return null;

        type ContributorData = { 
          name: string; 
          paid: number; 
          target: number | null;
          allocations: Array<{
            id: string;
            amount: number;
            paymentDescription: string;
            paidOnDate: string | null;
            expenseDescription: string;
            vendorName: string | null;
            vendorId: string | null;
          }>;
        };
        const contributionsArray = Object.values(contributionsByContributor) as ContributorData[];
        const totalPaid = contributionsArray.reduce((sum: number, c: ContributorData) => sum + c.paid, 0);

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                💰 Cruscotto Fondi di Progetto
              </CardTitle>
              <CardDescription>
                Monitora i contributi di ciascun fondo rispetto ai target previsti. Clicca su un contributore per vedere i dettagli.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contributors.map((contributor) => {
                  const contrib = contributionsByContributor[contributor.id];
                  if (!contrib) return null;
                  
                  const percentage = contrib.target 
                    ? Math.min(100, (contrib.paid / contrib.target) * 100)
                    : 0;

                  const hasAllocations = contrib.allocations.length > 0;

                  return (
                    <Collapsible key={contributor.id}>
                      <CollapsibleTrigger className="w-full" disabled={!hasAllocations}>
                        <div className="space-y-2 text-left">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium flex items-center gap-2">
                              {hasAllocations && (
                                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                              )}
                              {contrib.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(contrib.paid)}
                              {contrib.target && ` / ${formatCurrency(contrib.target)}`}
                            </span>
                          </div>
                          {contrib.target ? (
                            <div className="w-full bg-muted rounded-full h-2.5">
                              <div
                                className="bg-primary h-2.5 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Nessun target impostato · <a href="/app/settings" className="underline">Imposta in Settings</a>
                            </p>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {hasAllocations && (
                          <div className="mt-3 ml-6 space-y-2 border-l-2 border-muted pl-4">
                            {contrib.allocations
                              .sort((a, b) => {
                                if (!a.paidOnDate && !b.paidOnDate) return 0;
                                if (!a.paidOnDate) return 1;
                                if (!b.paidOnDate) return -1;
                                return new Date(b.paidOnDate).getTime() - new Date(a.paidOnDate).getTime();
                              })
                              .map((alloc) => (
                                <div 
                                  key={alloc.id} 
                                  className={`flex justify-between items-start text-sm py-1.5 ${alloc.vendorId ? 'cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2' : ''}`}
                                  onClick={() => {
                                    if (alloc.vendorId) {
                                      navigate(`/app/vendors/${alloc.vendorId}`);
                                    }
                                  }}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      <span className="text-xs">
                                        {alloc.paidOnDate 
                                          ? format(parseISO(alloc.paidOnDate), "dd/MM/yyyy", { locale: it })
                                          : "Data N/D"}
                                      </span>
                                      {alloc.vendorName && (
                                        <>
                                          <span>·</span>
                                          <span className="text-xs font-medium text-foreground">
                                            {alloc.vendorName}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {alloc.expenseDescription}
                                      {alloc.paymentDescription && ` · ${alloc.paymentDescription}`}
                                    </div>
                                  </div>
                                  <span className="font-medium text-right ml-4">
                                    {formatCurrency(alloc.amount)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">TOTALE PAGATO</span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(totalPaid)}
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
            <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 250 : 400} minWidth={0}>
              <ComposedChart 
                data={chartData}
              >
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
                  activeDot={{ 
                    r: 6,
                    onClick: (_e: any, payload: any) => {
                      if (payload && payload.payload) {
                        const clickedData = payload.payload as ChartDataPoint;
                        setDateFilter(clickedData.date);
                        setTimeFilter("all");
                        document.getElementById("payments-list")?.scrollIntoView({ behavior: "smooth" });
                      }
                    }
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Future Cash Flows List */}
      <Card id="payments-list">
        <CardHeader>
          <CardTitle>Dettaglio Pagamenti Futuri</CardTitle>
          <CardDescription>
            Lista azionabile dei pagamenti in scadenza. Clicca su un fornitore per vedere i dettagli.
          </CardDescription>
          <div className="flex gap-2 mt-3 sm:mt-4 flex-wrap">
            {dateFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateFilter(null)}
              >
                Rimuovi filtro data ({format(parseISO(dateFilter), "dd MMM yyyy", { locale: it })})
              </Button>
            )}
            <Button
              variant={timeFilter === "all" && !dateFilter ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTimeFilter("all");
                setDateFilter(null);
              }}
            >
              Tutti
            </Button>
            <Button
              variant={timeFilter === "7" && !dateFilter ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTimeFilter("7");
                setDateFilter(null);
              }}
            >
              Prossimi 7gg
            </Button>
            <Button
              variant={timeFilter === "30" && !dateFilter ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTimeFilter("30");
                setDateFilter(null);
              }}
            >
              Prossimi 30gg
            </Button>
            <Button
              variant={timeFilter === "90" && !dateFilter ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setTimeFilter("90");
                setDateFilter(null);
              }}
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
            <>
              {/* Desktop Table */}
              <div className="rounded-md border hidden sm:block">
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
                            {formatCurrency(calculatePaymentTotalDynamic(
                              payment,
                              expenseItems,
                              expenseLineItems,
                              {
                                planned: weddingTargets,
                                expected: { 
                                  adults: guestBreakdown.confirmed.adults + guestBreakdown.pending.adults,
                                  children: guestBreakdown.confirmed.children + guestBreakdown.pending.children,
                                  staff: guestBreakdown.confirmed.staff + guestBreakdown.pending.staff
                                },
                                confirmed: guestBreakdown.confirmed
                              },
                              globalMode
                            ))}
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

              {/* Mobile Card Layout */}
              <div className="sm:hidden space-y-3">
                {filteredFuturePayments.map((payment) => {
                  const vendorId = getVendorId(payment.expense_item_id);
                  const vendorName = getVendorName(payment.expense_item_id);
                  const amount = calculatePaymentTotalDynamic(
                    payment,
                    expenseItems,
                    expenseLineItems,
                    {
                      planned: weddingTargets,
                      expected: { 
                        adults: guestBreakdown.confirmed.adults + guestBreakdown.pending.adults,
                        children: guestBreakdown.confirmed.children + guestBreakdown.pending.children,
                        staff: guestBreakdown.confirmed.staff + guestBreakdown.pending.staff
                      },
                      confirmed: guestBreakdown.confirmed
                    },
                    globalMode
                  );
                  return (
                    <div key={payment.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{payment.description}</p>
                          {vendorId ? (
                            <button
                              onClick={() => navigate(`/app/vendors?vendor=${vendorId}`)}
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                            >
                              {vendorName}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-0.5">{vendorName}</p>
                          )}
                        </div>
                        <span className="text-base font-bold ml-2 shrink-0">{formatCurrency(amount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(payment.due_date), "dd MMM yyyy", { locale: it })}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPaymentToMark(payment)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 h-7 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Pagato
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mark as Paid Dialog */}
      <MarkPaymentDialog
        payment={paymentToMark}
        vendorName={paymentToMark ? getVendorName(paymentToMark.expense_item_id) : ""}
        totalAmount={paymentToMark ? calculatePaymentTotalDynamic(
          paymentToMark,
          expenseItems,
          expenseLineItems,
          {
            planned: weddingTargets,
            expected: { 
              adults: guestBreakdown.confirmed.adults + guestBreakdown.pending.adults,
              children: guestBreakdown.confirmed.children + guestBreakdown.pending.children,
              staff: guestBreakdown.confirmed.staff + guestBreakdown.pending.staff
            },
            confirmed: guestBreakdown.confirmed
          },
          globalMode
        ) : 0}
        contributors={contributors}
        open={!!paymentToMark}
        onOpenChange={(open) => !open && setPaymentToMark(null)}
        onSuccess={handlePaymentSuccess}
      />

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
