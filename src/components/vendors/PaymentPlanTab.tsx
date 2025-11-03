import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { toast } = useToast();

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
    // Scenario 1: Importo Fisso
    if (payment.amount_type === 'fixed' && payment.amount) {
      return parseFloat(payment.amount);
    }
    
    // Scenario 2: Percentuale
    if (payment.amount_type === 'percentage' && payment.percentage_value) {
      const pct = parseFloat(payment.percentage_value);
      const base = payment.percentage_base === 'actual' ? totalActual : totalPlanned;
      return (base * pct) / 100;
    }
    
    // Scenario 3: Saldo (Chiudi Conti)
    if (payment.amount_type === 'balance') {
      const targetTotal = payment.balance_base === 'actual' ? totalActual : totalPlanned;
      return Math.max(0, targetTotal - previousPayments);
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

    if (payment.amount_type === 'percentage') {
      if (!payment.percentage_value) {
        toast({
          title: "Percentuale mancante",
          description: "Inserisci la percentuale della rata",
          variant: "destructive",
        });
        return;
      }
      if (!payment.percentage_base) {
        toast({
          title: "Base di calcolo mancante",
          description: "Seleziona su quale totale calcolare la percentuale",
          variant: "destructive",
        });
        return;
      }
    }

    if (payment.amount_type === 'balance' && !payment.balance_base) {
      toast({
        title: "Base di calcolo mancante",
        description: "Seleziona quale totale saldare",
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
        percentage_base: payment.amount_type === 'percentage' ? payment.percentage_base : null,
        balance_base: payment.amount_type === 'balance' ? payment.balance_base : null,
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

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Tipo Importo</Label>
                          <RadioGroup
                            value={payment.amount_type}
                            onValueChange={(val) => {
                              updatePayment(index, 'amount_type', val);
                              // Reset dei campi quando si cambia tipo
                              if (val === 'balance') {
                                updatePayment(index, 'amount', '');
                                updatePayment(index, 'percentage_value', '');
                              }
                            }}
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
                            <div className="space-y-2">
                              <Label>Calcolato su:</Label>
                              <RadioGroup
                                value={payment.percentage_base || 'planned'}
                                onValueChange={(val) => updatePayment(index, 'percentage_base', val)}
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="planned" id={`pct-planned-${index}`} />
                                  <Label htmlFor={`pct-planned-${index}`} className="font-normal cursor-pointer">
                                    Totale Pianificato ({formatCurrency(totalPlanned)})
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="actual" id={`pct-actual-${index}`} />
                                  <Label htmlFor={`pct-actual-${index}`} className="font-normal cursor-pointer">
                                    Totale Effettivo (da RSVP)
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                          </>
                        )}

                        {/* Scenario C: Saldo (Chiudi Conti) */}
                        {payment.amount_type === 'balance' && (
                          <>
                            <div className="space-y-2">
                              <Label>Base di Calcolo per il Saldo:</Label>
                              <RadioGroup
                                value={payment.balance_base || 'planned'}
                                onValueChange={(val) => updatePayment(index, 'balance_base', val)}
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="planned" id={`bal-planned-${index}`} />
                                  <Label htmlFor={`bal-planned-${index}`} className="font-normal cursor-pointer">
                                    Salda il Totale Pianificato ({formatCurrency(totalPlanned)})
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="actual" id={`bal-actual-${index}`} />
                                  <Label htmlFor={`bal-actual-${index}`} className="font-normal cursor-pointer">
                                    Salda il Totale Effettivo (da RSVP)
                                  </Label>
                                </div>
                              </RadioGroup>
                            </div>
                            
                            <Alert>
                              <AlertDescription>
                                {payment.balance_base === 'actual'
                                  ? `Questa rata salderà il Totale Effettivo (${formatCurrency(totalActual)}) meno gli acconti già inseriti.`
                                  : `Questa rata salderà il Totale Pianificato (${formatCurrency(totalPlanned)}) meno gli acconti già inseriti.`
                                }
                              </AlertDescription>
                            </Alert>
                          </>
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
                          {payment.amount_type === 'fixed' && ' (Importo fisso)'}
                          {payment.amount_type === 'percentage' && (
                            ` (${payment.percentage_value}% del ${payment.percentage_base === 'actual' ? 'Totale Effettivo' : 'Totale Pianificato'})`
                          )}
                          {payment.amount_type === 'balance' && (
                            ` (Saldo sul ${payment.balance_base === 'actual' ? 'Totale Effettivo' : 'Totale Pianificato'})`
                          )}
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
              ℹ️ Il Totale Effettivo ({formatCurrency(totalActual)}) è inferiore al Totale Pianificato ({formatCurrency(totalPlanned)}). 
              Hai risparmiato {formatCurrency(totalPlanned - totalActual)}!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
