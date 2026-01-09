import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, CalendarIcon, Edit, X, Check } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Payment {
  id?: string;
  description: string;
  amount: string;
  amount_type: 'fixed' | 'percentage' | 'balance';
  percentage_value: string;
  percentage_base?: 'planned' | 'actual';
  balance_base?: 'planned' | 'actual';
  due_date: Date | null;
  due_date_type: 'absolute' | 'days_before';
  days_before_wedding: string;
  status: 'Da Pagare' | 'Pagato';
  tax_rate?: string;
  tax_inclusive?: boolean;
  paid_by?: string;
  paid_on_date?: Date | null;
}

interface PaymentPlanTabProps {
  vendorId: string;
  expenseItemId: string;
  categoryId: string | null;
  totalPlanned: number;
  totalActual: number;
  calculationMode?: 'planned' | 'expected' | 'confirmed';
}

export function PaymentPlanTab({
  vendorId,
  expenseItemId,
  categoryId,
  totalPlanned: propTotalPlanned,
  totalActual: propTotalActual,
  calculationMode = 'planned',
}: PaymentPlanTabProps) {
  const [internalTotalPlanned, setInternalTotalPlanned] = useState(propTotalPlanned);
  const [internalTotalActual, setInternalTotalActual] = useState(propTotalActual);
  
  // Usa i totali interni (che vengono aggiornati dal fallback se i props sono 0)
  const totalPlanned = internalTotalPlanned || propTotalPlanned;
  const totalActual = internalTotalActual || propTotalActual;
  
  // Determina automaticamente il totale da usare in base alla modalità globale
  const activeTotal = calculationMode === 'planned' ? totalPlanned : totalActual;
  const activeModeLabel = calculationMode === 'planned' ? 'ospiti pianificati' : 
                          calculationMode === 'expected' ? 'ospiti previsti' : 'ospiti confermati';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [contributors, setContributors] = useState<any[]>([]);
  const [paymentAllocations, setPaymentAllocations] = useState<Record<string, any[]>>({});
  const [editingAllocations, setEditingAllocations] = useState<Array<{contributor_id: string, amount: string}>>([]);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [originalPaymentData, setOriginalPaymentData] = useState<Payment | null>(null);
  const { toast } = useToast();

  // Sincronizza i totali interni quando cambiano i props
  useEffect(() => {
    if (propTotalPlanned > 0) setInternalTotalPlanned(propTotalPlanned);
    if (propTotalActual > 0) setInternalTotalActual(propTotalActual);
  }, [propTotalPlanned, propTotalActual]);

  // Fallback: se i totali sono 0, ricalcola dal database
  useEffect(() => {
    if (expenseItemId && propTotalPlanned === 0) {
      recalculateTotalsFromDB();
    }
  }, [expenseItemId, propTotalPlanned]);

  const recalculateTotalsFromDB = async () => {
    try {
      // Importa dinamicamente per evitare dipendenze circolari
      const { calculateExpenseAmount, resolveGuestCounts, inferExpenseType } = await import('@/lib/expenseCalculations');
      
      // Carica expense item
      const { data: expenseData, error: expenseError } = await supabase
        .from("expense_items")
        .select("*")
        .eq("id", expenseItemId)
        .single();

      if (expenseError || !expenseData) return;

      // Carica line items
      const { data: lineItemsData } = await supabase
        .from("expense_line_items")
        .select("*")
        .eq("expense_item_id", expenseItemId)
        .order("order_index");

      // Carica wedding data
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

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

      // Carica conteggi ospiti
      const { data: guestsData } = await supabase
        .from("guests")
        .select("rsvp_status, is_child, is_staff, adults_count, children_count")
        .eq("wedding_id", weddingId);

      const guests = guestsData || [];
      
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

      const guestCounts = {
        planned: plannedCounts,
        expected: plannedCounts, // Simplified
        confirmed: { adults: confirmedAdults, children: confirmedChildren, staff: confirmedStaff }
      };

      const expenseType = inferExpenseType(
        { 
          expense_type: expenseData.expense_type as 'fixed' | 'variable' | 'mixed' | undefined,
          fixed_amount: expenseData.fixed_amount,
          total_amount: expenseData.total_amount
        }, 
        (lineItemsData || []).length > 0
      );
      
      const calcExpenseItem = {
        id: expenseData.id,
        expense_type: expenseType,
        fixed_amount: expenseData.fixed_amount || expenseData.total_amount || 0,
        planned_adults: plannedCounts.adults,
        planned_children: plannedCounts.children,
        planned_staff: plannedCounts.staff,
        tax_rate: expenseData.tax_rate || 0,
        amount_is_tax_inclusive: expenseData.amount_is_tax_inclusive !== false,
      };

      const calcLineItems = (lineItemsData || []).map(line => ({
        id: line.id,
        unit_price: line.unit_price || 0,
        quantity_type: line.quantity_type || 'fixed',
        quantity_fixed: line.quantity_fixed,
        quantity_limit: line.quantity_limit,
        quantity_range: line.quantity_range || 'all',
        discount_percentage: line.discount_percentage || 0,
        tax_rate: line.tax_rate || 0,
      }));

      const planned = calculateExpenseAmount(calcExpenseItem as any, calcLineItems as any, 'planned', guestCounts as any);
      const confirmed = calculateExpenseAmount(calcExpenseItem as any, calcLineItems as any, 'confirmed', guestCounts as any);

      console.log('📊 PaymentPlanTab: Totali ricalcolati dal DB:', { planned, confirmed });
      
      setInternalTotalPlanned(planned);
      setInternalTotalActual(confirmed);
    } catch (error) {
      console.error("Error recalculating totals:", error);
    }
  };

  useEffect(() => {
    if (expenseItemId) {
      loadPayments();
      loadWeddingDate();
      loadContributors();
    }
  }, [expenseItemId]);

  const loadWeddingDate = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Try to get wedding via user_roles first (covers co_planners)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("wedding_id")
        .eq("user_id", userData.user.id)
        .limit(1)
        .maybeSingle();

      let weddingId = roleData?.wedding_id;

      // Fallback to created_by if no role found
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
        .select("wedding_date")
        .eq("id", weddingId)
        .single();

      if (weddingData?.wedding_date) {
        setWeddingDate(new Date(weddingData.wedding_date));
      }
    } catch (error) {
      console.error("Error loading wedding date:", error);
    }
  };

  const loadContributors = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Try to get wedding via user_roles first (covers co_planners)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("wedding_id")
        .eq("user_id", userData.user.id)
        .limit(1)
        .maybeSingle();

      let weddingId = roleData?.wedding_id;

      // Fallback to created_by if no role found
      if (!weddingId) {
        const { data: weddingData } = await supabase
          .from("weddings")
          .select("id")
          .eq("created_by", userData.user.id)
          .maybeSingle();
        weddingId = weddingData?.id;
      }

      if (!weddingId) return;

      const { data, error } = await supabase
        .from("financial_contributors")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("is_default", { ascending: false });

      if (error) throw error;
      setContributors(data || []);
    } catch (error) {
      console.error("Error loading contributors:", error);
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("expense_item_id", expenseItemId)
        .order("due_date", { ascending: true });

      if (error) throw error;

      const paymentsData = (data || []).map((p) => ({
        id: p.id,
        description: p.description,
        amount: String(p.amount),
        amount_type: (p.amount_type || 'fixed') as 'fixed' | 'percentage' | 'balance',
        percentage_value: String(p.percentage_value || ''),
        percentage_base: p.percentage_base as 'planned' | 'actual' | undefined,
        balance_base: p.balance_base as 'planned' | 'actual' | undefined,
        due_date: p.due_date ? new Date(p.due_date) : null,
        due_date_type: (p.due_date_type || 'absolute') as 'absolute' | 'days_before',
        days_before_wedding: String(p.days_before_wedding || ''),
        status: p.status as 'Da Pagare' | 'Pagato',
        tax_rate: String(p.tax_rate || '22'),
        tax_inclusive: p.tax_inclusive !== false,
        paid_by: p.paid_by || undefined,
        paid_on_date: p.paid_on_date ? new Date(p.paid_on_date) : null,
      }));

      setPayments(paymentsData);

      // Load allocations for paid payments
      const paidPaymentIds = paymentsData.filter(p => p.id && p.status === 'Pagato').map(p => p.id!);
      if (paidPaymentIds.length > 0) {
        const { data: allocationsData, error: allocationsError } = await supabase
          .from("payment_allocations")
          .select("*")
          .in("payment_id", paidPaymentIds);

        if (allocationsError) throw allocationsError;

        const allocationsByPayment = (allocationsData || []).reduce((acc, alloc) => {
          if (!acc[alloc.payment_id]) {
            acc[alloc.payment_id] = [];
          }
          acc[alloc.payment_id].push(alloc);
          return acc;
        }, {} as Record<string, any[]>);

        setPaymentAllocations(allocationsByPayment);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare il piano di pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = () => {
    const newPayment = {
      description: "",
      amount: "",
      amount_type: "fixed" as const,
      percentage_value: "",
      percentage_base: "planned" as const,
      balance_base: "planned" as const,
      due_date: null,
      due_date_type: "absolute" as const,
      days_before_wedding: "",
      status: "Da Pagare" as const,
      tax_inclusive: true,
      tax_rate: "22",
    };
    setPayments([...payments, newPayment]);
    setEditingPaymentIndex(payments.length);
    setOriginalPaymentData(newPayment);
  };

  const handleStartEdit = (index: number) => {
    setEditingPaymentIndex(index);
    setOriginalPaymentData({ ...payments[index] });
    
    // Carica le allocazioni esistenti se il pagamento è già salvato e pagato
    const payment = payments[index];
    if (payment.id && payment.status === 'Pagato' && paymentAllocations[payment.id]) {
      setEditingAllocations(
        paymentAllocations[payment.id].map(alloc => ({
          contributor_id: alloc.contributor_id,
          amount: String(alloc.amount)
        }))
      );
    } else {
      setEditingAllocations([]);
    }
  };

  const handleCancelEdit = () => {
    if (editingPaymentIndex !== null) {
      const payment = payments[editingPaymentIndex];
      
      if (!payment.id) {
        setPayments(payments.filter((_, i) => i !== editingPaymentIndex));
      } else if (originalPaymentData) {
        const updated = [...payments];
        updated[editingPaymentIndex] = originalPaymentData;
        setPayments(updated);
      }
    }
    
    setEditingPaymentIndex(null);
    setOriginalPaymentData(null);
    setEditingAllocations([]);
  };

  const handleRemovePayment = async (index: number) => {
    const payment = payments[index];
    if (payment.id) {
      try {
        const { error } = await supabase.from("payments").delete().eq("id", payment.id);
        if (error) throw error;

        toast({
          title: "Rata eliminata",
          description: "La rata è stata rimossa con successo",
        });
      } catch (error) {
        console.error("Error deleting payment:", error);
        toast({
          title: "Errore",
          description: "Impossibile eliminare la rata",
          variant: "destructive",
        });
        return;
      }
    }

    if (editingPaymentIndex === index) {
      setEditingPaymentIndex(null);
      setOriginalPaymentData(null);
    } else if (editingPaymentIndex !== null && editingPaymentIndex > index) {
      setEditingPaymentIndex(editingPaymentIndex - 1);
    }

    setPayments(payments.filter((_, i) => i !== index));
  };

  const calculateDueDate = (payment: Payment): Date | null => {
    if (payment.due_date_type === 'absolute') {
      return payment.due_date;
    } else if (payment.due_date_type === 'days_before' && weddingDate && payment.days_before_wedding) {
      const days = parseInt(payment.days_before_wedding);
      if (!isNaN(days) && weddingDate) {
        const result = new Date(weddingDate);
        result.setDate(result.getDate() - days);
        return result;
      }
    }
    return null;
  };

  const calculateBalanceAmount = (
    paymentIndex: number
  ): number => {
    // Usa sempre il totale attivo basato sulla modalità globale
    const baseTotal = activeTotal;
    
    // Somma tutti gli acconti (pagamenti precedenti a questo, esclusi altri balance)
    const previousPayments = payments
      .slice(0, paymentIndex)
      .filter(p => p.amount_type !== 'balance')
      .reduce((sum, p) => {
        if (p.amount_type === 'fixed') {
          return sum + parseFloat(p.amount || '0');
        } else if (p.amount_type === 'percentage') {
          // Usa sempre activeTotal anche per le percentuali
          return sum + (activeTotal * parseFloat(p.percentage_value || '0') / 100);
        }
        return sum;
      }, 0);
    
    return Math.max(0, baseTotal - previousPayments);
  };

  const calculatePaymentAmount = (payment: Payment, previousPayments: number, paymentIndex?: number): number => {
    let baseAmount = 0;
    
    // Scenario 1: Importo Fisso
    if (payment.amount_type === 'fixed' && payment.amount) {
      baseAmount = parseFloat(payment.amount);
    }
    // Scenario 2: Percentuale - usa sempre activeTotal
    else if (payment.amount_type === 'percentage' && payment.percentage_value) {
      const pct = parseFloat(payment.percentage_value);
      baseAmount = (activeTotal * pct) / 100;
    }
    // Scenario 3: Saldo (Chiudi Conti) - usa sempre activeTotal
    else if (payment.amount_type === 'balance') {
      if (paymentIndex !== undefined) {
        baseAmount = calculateBalanceAmount(paymentIndex);
      } else {
        // Fallback
        baseAmount = Math.max(0, activeTotal - previousPayments);
      }
    }
    
    // Se l'importo è IVA esclusa, aggiungi l'IVA
    if (payment.tax_inclusive === false && payment.tax_rate) {
      const taxRate = parseFloat(payment.tax_rate);
      return baseAmount * (1 + taxRate / 100);
    }
    
    return baseAmount;
  };

  const handleSavePayment = async (index: number) => {
    const payment = payments[index];

    if (!payment.description) {
      toast({
        title: "Campi mancanti",
        description: "Compila la descrizione della rata",
        variant: "destructive",
      });
      return;
    }

    if (payment.amount_type === 'fixed' && !payment.amount) {
      toast({
        title: "Importo mancante",
        description: "Inserisci l'importo della rata",
        variant: "destructive",
      });
      return;
    }

    if (payment.amount_type === 'percentage' && !payment.percentage_value) {
      toast({
        title: "Percentuale mancante",
        description: "Inserisci la percentuale della rata",
        variant: "destructive",
      });
      return;
    }

    // Nota: non serve più validare percentage_base e balance_base perché
    // usiamo sempre automaticamente la modalità globale (calculationMode)

    try {
      const calculatedDate = calculateDueDate(payment);
      const finalDueDate = calculatedDate ? format(calculatedDate, "yyyy-MM-dd") : null;

      if (!finalDueDate && payment.status !== 'Pagato') {
        toast({
          title: "Data mancante",
          description: "Seleziona una data di scadenza",
          variant: "destructive",
        });
        return;
      }

      // Calcola l'importo corretto in base al tipo
      let calculatedAmount = 0;
      if (payment.amount_type === 'fixed') {
        calculatedAmount = parseFloat(payment.amount);
      } else if (payment.amount_type === 'percentage') {
        // Usa sempre activeTotal
        calculatedAmount = (activeTotal * parseFloat(payment.percentage_value || '0') / 100);
      } else if (payment.amount_type === 'balance') {
        calculatedAmount = calculateBalanceAmount(index);
      }

      const paymentData = {
        expense_item_id: expenseItemId,
        description: payment.description,
        amount: calculatedAmount,
        amount_type: payment.amount_type,
        percentage_value: payment.amount_type === 'percentage' ? parseFloat(payment.percentage_value) : null,
        // percentage_base e balance_base non più usati - la modalità è determinata globalmente
        percentage_base: null,
        balance_base: null,
        due_date: finalDueDate || format(new Date(), "yyyy-MM-dd"),
        due_date_type: payment.due_date_type,
        days_before_wedding: payment.due_date_type === 'days_before' ? parseInt(payment.days_before_wedding) : null,
        status: payment.status,
        tax_rate: payment.tax_rate ? parseFloat(payment.tax_rate) : null,
        tax_inclusive: payment.tax_inclusive !== false,
        paid_by: payment.status === 'Pagato' ? payment.paid_by : null,
        paid_on_date: payment.status === 'Pagato' && payment.paid_on_date 
          ? format(payment.paid_on_date, "yyyy-MM-dd") 
          : null,
      };

      let paymentId: string;

      if (payment.id) {
        const { error } = await supabase.from("payments").update(paymentData).eq("id", payment.id);
        if (error) throw error;
        paymentId = payment.id;
      } else {
        const { data, error } = await supabase.from("payments").insert(paymentData).select().single();
        if (error) throw error;

        const updatedPayments = [...payments];
        updatedPayments[index].id = data.id;
        setPayments(updatedPayments);
        paymentId = data.id;
      }

      // Gestione allocazioni di pagamento
      if (payment.status === 'Pagato' && editingAllocations.length > 0) {
        // Elimina allocazioni esistenti
        await supabase
          .from("payment_allocations")
          .delete()
          .eq("payment_id", paymentId);

        // Inserisci le nuove allocazioni
        const allocationsToInsert = editingAllocations.map(alloc => ({
          payment_id: paymentId,
          contributor_id: alloc.contributor_id,
          amount: parseFloat(alloc.amount),
        }));

        const { error: allocError } = await supabase
          .from("payment_allocations")
          .insert(allocationsToInsert);

        if (allocError) throw allocError;

        // Aggiorna lo state locale delle allocazioni
        const newPaymentAllocations = { ...paymentAllocations };
        newPaymentAllocations[paymentId] = allocationsToInsert;
        setPaymentAllocations(newPaymentAllocations);
      } else if (payment.status !== 'Pagato') {
        // Se il pagamento non è più "Pagato", elimina le allocazioni
        await supabase
          .from("payment_allocations")
          .delete()
          .eq("payment_id", paymentId);

        // Rimuovi dallo state locale
        const newPaymentAllocations = { ...paymentAllocations };
        delete newPaymentAllocations[paymentId];
        setPaymentAllocations(newPaymentAllocations);
      }

      toast({
        title: "Rata salvata",
        description: "La rata è stata salvata con successo",
      });

      setEditingPaymentIndex(null);
      setOriginalPaymentData(null);
      setEditingAllocations([]);
    } catch (error) {
      console.error("Error saving payment:", error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la rata",
        variant: "destructive",
      });
    }
  };

  const updatePayment = (index: number, field: keyof Payment, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Piano di Pagamento</CardTitle>
        <CardDescription>
          Definisci le rate e le scadenze per questa spesa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Lista Rate */}
        <div className="space-y-3">
          {payments.map((payment, index) => {
            const isEditing = editingPaymentIndex === index;
            const previousPaid = payments
              .slice(0, index)
              .filter(p => p.status === 'Pagato')
              .reduce((sum, p) => sum + calculatePaymentAmount(p, 0), 0);
            
            const amount = calculatePaymentAmount(payment, previousPaid, index);

            return (
              <Card key={index} className={isEditing ? "border-primary" : ""}>
                <CardContent className="pt-6 space-y-3">
                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label>Descrizione</Label>
                        <Input
                          value={payment.description}
                          onChange={(e) => updatePayment(index, 'description', e.target.value)}
                          placeholder="Es: Acconto 20%"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Tipo Importo</Label>
                          <RadioGroup
                            name={`payment-type-${index}`}
                            value={payment.amount_type}
                            onValueChange={(val) => {
                              console.log('🎯 Tipo Importo selezionato:', val);
                              // ✅ Fare UN SOLO update invece di chiamate multiple
                              const updated = [...payments];
                              const newType = val as 'fixed' | 'percentage' | 'balance';
                              if (val === 'balance') {
                                updated[index] = {
                                  ...updated[index],
                                  amount_type: newType,
                                  amount: '',
                                  percentage_value: '',
                                  balance_base: updated[index].balance_base || 'planned'
                                };
                              } else {
                                updated[index] = {
                                  ...updated[index],
                                  amount_type: newType
                                };
                              }
                              setPayments(updated);
                            }}
                            className="flex flex-col gap-3"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fixed" id={`fixed-${index}`} />
                              <Label htmlFor={`fixed-${index}`} className="font-normal cursor-pointer">
                                Importo Fisso
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="percentage" id={`percentage-${index}`} />
                              <Label htmlFor={`percentage-${index}`} className="font-normal cursor-pointer">
                                Percentuale
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="balance" id={`balance-${index}`} />
                              <Label htmlFor={`balance-${index}`} className="font-normal cursor-pointer">
                                Saldo (Chiudi Conti)
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Scenario A: Importo Fisso */}
                        {payment.amount_type === 'fixed' && (
                          <div className="space-y-2">
                            <Label>Importo (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={payment.amount}
                              onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                              placeholder="3000"
                            />
                          </div>
                        )}

                        {/* Scenario B: Percentuale */}
                        {payment.amount_type === 'percentage' && (
                          <>
                            <div className="space-y-2">
                              <Label>Valore (%)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={payment.percentage_value}
                                onChange={(e) => updatePayment(index, 'percentage_value', e.target.value)}
                                placeholder="20"
                              />
                            </div>
                            {payment.percentage_value && (
                              <Alert>
                                <AlertDescription>
                                  <span className="text-muted-foreground">
                                    {payment.percentage_value}% di {formatCurrency(activeTotal)} ({activeModeLabel})
                                  </span>
                                  <br />
                                  <strong className="text-primary">
                                    = {formatCurrency(activeTotal * parseFloat(payment.percentage_value || '0') / 100)}
                                  </strong>
                                </AlertDescription>
                              </Alert>
                            )}
                          </>
                        )}

                        {/* Scenario C: Saldo (Chiudi Conti) */}
                        {payment.amount_type === 'balance' && (
                          <Alert>
                            <AlertDescription>
                              <span className="text-muted-foreground">
                                Saldo = {formatCurrency(activeTotal)} ({activeModeLabel}) − acconti già inseriti
                              </span>
                              <br />
                              <strong className="text-primary">
                                Importo calcolato: {formatCurrency(calculateBalanceAmount(index))}
                              </strong>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Gestione IVA */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Aliquota IVA (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="22"
                            value={payment.tax_rate}
                            onChange={(e) => updatePayment(index, "tax_rate", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>L'importo inserito è...</Label>
                          <RadioGroup
                            value={payment.tax_inclusive ? "inclusive" : "exclusive"}
                            onValueChange={(value) => updatePayment(index, "tax_inclusive", value === "inclusive")}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="inclusive" id={`tax-inc-${index}`} />
                              <Label htmlFor={`tax-inc-${index}`} className="font-normal cursor-pointer">IVA Inclusa</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="exclusive" id={`tax-exc-${index}`} />
                              <Label htmlFor={`tax-exc-${index}`} className="font-normal cursor-pointer">IVA Esclusa</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>

                      {/* Preview importo con IVA se esclusa */}
                      {!payment.tax_inclusive && payment.tax_rate && amount > 0 && (
                        <Alert>
                          <AlertDescription>
                            <div className="text-sm">
                              <div>Importo: {formatCurrency(amount)} (IVA Esclusa {payment.tax_rate}%)</div>
                              <div className="font-semibold text-primary mt-1">
                                → Totale con IVA: {formatCurrency(amount * (1 + parseFloat(payment.tax_rate) / 100))}
                              </div>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        <Label>Scadenza</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {payment.due_date ? format(payment.due_date, "PPP", { locale: it }) : "Seleziona data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={payment.due_date || undefined}
                              onSelect={(date) => updatePayment(index, 'due_date', date)}
                              locale={it}
                              className="pointer-events-auto"
                            />
                            {payment.due_date && (
                              <div className="p-2 border-t">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="w-full text-destructive hover:text-destructive"
                                  onClick={() => updatePayment(index, 'due_date', null)}
                                >
                                  Rimuovi data
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Stato del Pagamento */}
                      <div className="space-y-2">
                        <Label>Stato</Label>
                        <Select
                          value={payment.status}
                          onValueChange={(value) => updatePayment(index, 'status', value as 'Da Pagare' | 'Pagato')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Da Pagare">Da Pagare</SelectItem>
                            <SelectItem value="Pagato">Pagato</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campi aggiuntivi se Pagato */}
                      {payment.status === 'Pagato' && (
                        <>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Allocazione Pagamento</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (contributors.length > 0) {
                                    setEditingAllocations([...editingAllocations, { contributor_id: contributors[0].id, amount: '' }]);
                                  }
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Aggiungi Contributore
                              </Button>
                            </div>

                            {editingAllocations.length === 0 && (
                              <Alert>
                                <AlertDescription>
                                  Aggiungi almeno un contributore per specificare chi ha pagato e quanto.
                                </AlertDescription>
                              </Alert>
                            )}

                            {editingAllocations.map((allocation, allocIndex) => (
                              <Card key={allocIndex} className="p-3">
                                <div className="flex gap-2 items-end">
                                  <div className="flex-1 space-y-2">
                                    <Label>Contributore</Label>
                                    <Select
                                      value={allocation.contributor_id}
                                      onValueChange={(value) => {
                                        const updated = [...editingAllocations];
                                        updated[allocIndex].contributor_id = value;
                                        setEditingAllocations(updated);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleziona contributore" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {contributors.map((contributor) => (
                                          <SelectItem key={contributor.id} value={contributor.id}>
                                            {contributor.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <Label>Importo (€)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={allocation.amount}
                                      onChange={(e) => {
                                        const updated = [...editingAllocations];
                                        updated[allocIndex].amount = e.target.value;
                                        setEditingAllocations(updated);
                                      }}
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingAllocations(editingAllocations.filter((_, i) => i !== allocIndex));
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </Card>
                            ))}

                            {editingAllocations.length > 0 && (() => {
                              const totalAllocated = editingAllocations.reduce((sum, alloc) => sum + (parseFloat(alloc.amount) || 0), 0);
                              const paymentAmount = calculatePaymentAmount(payment, 0, index);
                              const difference = paymentAmount - totalAllocated;
                              const isComplete = Math.abs(difference) < 0.01;

                              return (
                                <Alert variant={isComplete ? "default" : "destructive"}>
                                  <AlertDescription>
                                    <div className="space-y-1">
                                      <div>Importo rata: {formatCurrency(paymentAmount)}</div>
                                      <div>Totale allocato: {formatCurrency(totalAllocated)}</div>
                                      {!isComplete && (
                                        <div className="font-semibold">
                                          {difference > 0 ? `Mancano: ${formatCurrency(difference)}` : `Eccesso: ${formatCurrency(Math.abs(difference))}`}
                                        </div>
                                      )}
                                      {isComplete && <div className="text-green-600 font-semibold">✓ Allocazione completa</div>}
                                    </div>
                                  </AlertDescription>
                                </Alert>
                              );
                            })()}
                          </div>

                          <div className="space-y-2">
                            <Label>Data di Pagamento</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {payment.paid_on_date ? format(payment.paid_on_date, "PPP", { locale: it }) : "Seleziona data"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={payment.paid_on_date || undefined}
                                  onSelect={(date) => updatePayment(index, 'paid_on_date', date)}
                                  locale={it}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </>
                      )}

                      <div className="flex gap-2">
                        <Button onClick={() => handleSavePayment(index)} size="sm">
                          <Check className="h-4 w-4 mr-2" />
                          Salva
                        </Button>
                        <Button onClick={handleCancelEdit} variant="outline" size="sm">
                          <X className="h-4 w-4 mr-2" />
                          Annulla
                        </Button>
                        <Button 
                          onClick={() => handleRemovePayment(index)} 
                          variant="destructive" 
                          size="sm"
                          className="ml-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{payment.description}</h4>
                          <Badge variant={payment.status === 'Pagato' ? 'default' : 'secondary'}>
                            {payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(amount)}
                          {payment.amount_type === 'fixed' && ' (Importo fisso)'}
                          {payment.amount_type === 'percentage' && (
                            ` (${payment.percentage_value}% del ${payment.percentage_base === 'actual' ? 'Totale Effettivo' : 'Totale Pianificato'})`
                          )}
                          {payment.amount_type === 'balance' && (
                            ` (Saldo sul ${payment.balance_base === 'actual' ? 'Totale Effettivo' : 'Totale Pianificato'})`
                          )}
                        </p>
                        {payment.status === 'Pagato' && payment.id && paymentAllocations[payment.id] && paymentAllocations[payment.id].length > 0 && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="font-medium">Pagato da:</div>
                            {paymentAllocations[payment.id].map((alloc, i) => {
                              const contributor = contributors.find(c => c.id === alloc.contributor_id);
                              return (
                                <div key={i}>
                                  • {contributor?.name || 'N/A'}: {formatCurrency(alloc.amount)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {payment.status === 'Pagato' && payment.paid_on_date && (
                          <p className="text-xs text-muted-foreground">
                            Data pagamento: {format(payment.paid_on_date, "dd/MM/yyyy")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Scadenza: {payment.due_date && format(payment.due_date, "dd/MM/yyyy")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button onClick={handleAddPayment} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Rata
        </Button>

        {payments.length > 0 && totalActual < totalPlanned && (
          <Alert>
            <AlertDescription>
              ℹ️ Il Totale Effettivo ({formatCurrency(totalActual)}) è inferiore al Totale Pianificato ({formatCurrency(totalPlanned)}). 
              Hai risparmiato {formatCurrency(totalPlanned - totalActual)}!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
