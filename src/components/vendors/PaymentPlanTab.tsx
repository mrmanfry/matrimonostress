import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  amount_type: 'fixed' | 'percentage';
  percentage_value: string;
  due_date: Date | null;
  due_date_type: 'absolute' | 'days_before';
  days_before_wedding: string;
  status: 'Da Pagare' | 'Pagato';
  tax_rate?: string;
  tax_inclusive?: boolean;
  paid_by?: string;
  paid_on_date?: Date | null;
  recalculate_on_actual?: boolean;
}

interface PaymentPlanTabProps {
  vendorId: string;
  expenseItemId: string;
  categoryId: string | null;
  totalPlanned: number;
  totalActual: number;
}

export function PaymentPlanTab({
  vendorId,
  expenseItemId,
  categoryId,
  totalPlanned,
  totalActual,
}: PaymentPlanTabProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [originalPaymentData, setOriginalPaymentData] = useState<Payment | null>(null);
  const [calculationBase, setCalculationBase] = useState<'planned' | 'actual'>('planned');
  const { toast } = useToast();

  const totalInvoice = calculationBase === 'planned' ? totalPlanned : totalActual;

  useEffect(() => {
    if (expenseItemId) {
      loadPayments();
      loadWeddingDate();
    }
  }, [expenseItemId]);

  const loadWeddingDate = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("wedding_date")
        .eq("created_by", userData.user.id)
        .maybeSingle();

      if (weddingData?.wedding_date) {
        setWeddingDate(new Date(weddingData.wedding_date));
      }
    } catch (error) {
      console.error("Error loading wedding date:", error);
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

      setPayments(
        (data || []).map((p) => ({
          id: p.id,
          description: p.description,
          amount: String(p.amount),
          amount_type: (p.amount_type || 'fixed') as 'fixed' | 'percentage',
          percentage_value: String(p.percentage_value || ''),
          due_date: p.due_date ? new Date(p.due_date) : null,
          due_date_type: (p.due_date_type || 'absolute') as 'absolute' | 'days_before',
          days_before_wedding: String(p.days_before_wedding || ''),
          status: p.status as 'Da Pagare' | 'Pagato',
          tax_rate: String(p.tax_rate || '22'),
          tax_inclusive: p.tax_inclusive !== false,
          paid_by: p.paid_by || undefined,
          paid_on_date: p.paid_on_date ? new Date(p.paid_on_date) : null,
          recalculate_on_actual: p.recalculate_on_actual || false,
        }))
      );
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
      amount_type: "percentage" as const,
      percentage_value: "",
      due_date: null,
      due_date_type: "absolute" as const,
      days_before_wedding: "",
      status: "Da Pagare" as const,
      tax_inclusive: true,
      tax_rate: "22",
      recalculate_on_actual: false,
    };
    setPayments([...payments, newPayment]);
    setEditingPaymentIndex(payments.length);
    setOriginalPaymentData(newPayment);
  };

  const handleStartEdit = (index: number) => {
    setEditingPaymentIndex(index);
    setOriginalPaymentData({ ...payments[index] });
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

  const calculatePaymentAmount = (payment: Payment, previousPayments: number): number => {
    // Se è l'ultima rata con ricalcolo automatico
    if (payment.recalculate_on_actual && payment.status === 'Da Pagare') {
      return totalActual - previousPayments;
    }

    // Calcolo standard
    if (payment.amount_type === 'fixed' && payment.amount) {
      return parseFloat(payment.amount);
    } else if (payment.amount_type === 'percentage' && payment.percentage_value) {
      const pct = parseFloat(payment.percentage_value);
      return (totalInvoice * pct) / 100;
    }

    return 0;
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

      const paymentData = {
        expense_item_id: expenseItemId,
        description: payment.description,
        amount: payment.amount_type === 'fixed' ? parseFloat(payment.amount) : 0,
        amount_type: payment.amount_type,
        percentage_value: payment.amount_type === 'percentage' ? parseFloat(payment.percentage_value) : null,
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
        recalculate_on_actual: payment.recalculate_on_actual || false,
      };

      if (payment.id) {
        const { error } = await supabase.from("payments").update(paymentData).eq("id", payment.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("payments").insert(paymentData).select().single();
        if (error) throw error;

        const updatedPayments = [...payments];
        updatedPayments[index].id = data.id;
        setPayments(updatedPayments);
      }

      toast({
        title: "Rata salvata",
        description: "La rata è stata salvata con successo",
      });

      setEditingPaymentIndex(null);
      setOriginalPaymentData(null);
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
        {/* Selezione Base di Calcolo */}
        <div className="space-y-3">
          <Label>Base di Calcolo per le Rate</Label>
          <Select
            value={calculationBase}
            onValueChange={(val) => setCalculationBase(val as 'planned' | 'actual')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">
                Totale Pianificato ({formatCurrency(totalPlanned)})
              </SelectItem>
              <SelectItem value="actual">
                Totale Effettivo ({formatCurrency(totalActual)})
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Le percentuali delle rate saranno calcolate su questa base
          </p>
        </div>

        {/* Lista Rate */}
        <div className="space-y-3">
          {payments.map((payment, index) => {
            const isEditing = editingPaymentIndex === index;
            const previousPaid = payments
              .slice(0, index)
              .filter(p => p.status === 'Pagato')
              .reduce((sum, p) => sum + calculatePaymentAmount(p, 0), 0);
            
            const amount = calculatePaymentAmount(payment, previousPaid);

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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo Importo</Label>
                          <RadioGroup
                            value={payment.amount_type}
                            onValueChange={(val) => updatePayment(index, 'amount_type', val)}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="percentage" id={`percentage-${index}`} />
                              <Label htmlFor={`percentage-${index}`} className="font-normal">
                                Percentuale
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fixed" id={`fixed-${index}`} />
                              <Label htmlFor={`fixed-${index}`} className="font-normal">
                                Importo Fisso
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {payment.amount_type === 'percentage' ? (
                          <div className="space-y-2">
                            <Label>Percentuale (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={payment.percentage_value}
                              onChange={(e) => updatePayment(index, 'percentage_value', e.target.value)}
                              placeholder="20"
                            />
                          </div>
                        ) : (
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
                      </div>

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
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`recalculate-${index}`}
                          checked={payment.recalculate_on_actual}
                          onCheckedChange={(checked) => updatePayment(index, 'recalculate_on_actual', checked)}
                        />
                        <Label htmlFor={`recalculate-${index}`} className="text-sm font-normal">
                          ✔ Ricalcola questa rata in base al Totale Effettivo (Saldo Intelligente)
                        </Label>
                      </div>

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
                      <div className="flex-1">
                        <h4 className="font-medium">{payment.description}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(amount)}
                          {payment.amount_type === 'percentage' && ` (${payment.percentage_value}%)`}
                          {payment.recalculate_on_actual && " 🎯 Saldo Intelligente"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {payment.due_date && format(payment.due_date, "dd/MM/yyyy")}
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
              ℹ️ Hai risparmiato {formatCurrency(totalPlanned - totalActual)}! 
              Ricorda di ricalcolare il saldo finale usando il "Saldo Intelligente".
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
