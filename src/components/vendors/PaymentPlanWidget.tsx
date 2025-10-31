import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, CalendarIcon, Percent, CheckCircle2, LightbulbIcon } from "lucide-react";
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
}

interface PaymentPlanWidgetProps {
  vendorId: string | null;
  expenseItemId: string | null;
  categoryId: string | null;
}

export function PaymentPlanWidget({ vendorId, expenseItemId, categoryId }: PaymentPlanWidgetProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [contributors, setContributors] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (expenseItemId) {
      loadPayments();
      loadWeddingDate();
      loadContributors();
    } else {
      setPayments([]);
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

  const loadContributors = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: weddingData } = await supabase
        .from("weddings")
        .select("id")
        .eq("created_by", userData.user.id)
        .maybeSingle();

      if (!weddingData) return;

      const { data, error } = await supabase
        .from("financial_contributors")
        .select("*")
        .eq("wedding_id", weddingData.id)
        .order("is_default", { ascending: false });

      if (error) throw error;

      setContributors(data || []);
    } catch (error) {
      console.error("Error loading contributors:", error);
    }
  };

  const loadPayments = async () => {
    if (!expenseItemId) return;

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
    setPayments([
      ...payments,
      {
        description: "",
        amount: "",
        amount_type: "fixed",
        percentage_value: "",
        due_date: null,
        due_date_type: "absolute",
        days_before_wedding: "",
        status: "Da Pagare",
        tax_inclusive: true,
        tax_rate: "22",
      },
    ]);
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

  const handleSavePayment = async (index: number) => {
    const payment = payments[index];

    if (!payment.description || !expenseItemId) {
      toast({
        title: "Campi mancanti",
        description: "Compila almeno la descrizione della rata",
        variant: "destructive",
      });
      return;
    }

    // Validazione per pagamenti completati
    if (payment.status === 'Pagato') {
      if (!payment.paid_by || payment.paid_by.trim() === '') {
        toast({
          title: "Chi ha pagato?",
          description: "Specifica chi ha effettuato il pagamento",
          variant: "destructive",
        });
        return;
      }
      if (!payment.paid_on_date) {
        toast({
          title: "Data pagamento mancante",
          description: "Specifica la data di pagamento effettivo",
          variant: "destructive",
        });
        return;
      }
    }

    // Validazione in base al tipo di importo
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

    // Validazione in base al tipo di scadenza
    if (payment.due_date_type === 'absolute' && !payment.due_date) {
      toast({
        title: "Data mancante",
        description: "Seleziona una data di scadenza",
        variant: "destructive",
      });
      return;
    }

    if (payment.due_date_type === 'days_before' && !payment.days_before_wedding) {
      toast({
        title: "Giorni mancanti",
        description: "Inserisci il numero di giorni prima del matrimonio",
        variant: "destructive",
      });
      return;
    }

    try {
      const calculatedDate = calculateDueDate(payment);
      
      const paymentData = {
        expense_item_id: expenseItemId,
        description: payment.description,
        amount: payment.amount_type === 'fixed' ? parseFloat(payment.amount) : 0,
        amount_type: payment.amount_type,
        percentage_value: payment.amount_type === 'percentage' ? parseFloat(payment.percentage_value) : null,
        due_date: calculatedDate ? format(calculatedDate, "yyyy-MM-dd") : null,
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

  const totalAmount = payments.reduce((sum, p) => {
    if (p.amount_type === 'fixed' && p.amount) {
      const baseAmount = parseFloat(p.amount);
      if (isNaN(baseAmount)) return sum;
      
      // Se IVA non inclusa, aggiungi IVA al totale
      if (!p.tax_inclusive && p.tax_rate) {
        const taxRate = parseFloat(p.tax_rate) / 100;
        return sum + baseAmount * (1 + taxRate);
      }
      return sum + baseAmount;
    }
    return sum;
  }, 0);

  const getCategoryAdvice = async (categoryId: string | null) => {
    if (!categoryId) {
      return "Verifica sempre che i costi siano inclusivi di IVA e che non ci siano costi nascosti.";
    }

    try {
      const { data } = await supabase
        .from("expense_categories")
        .select("name")
        .eq("id", categoryId)
        .single();
      
      const categoryName = data?.name || "";
      
      const adviceMap: Record<string, string> = {
        "Musica": "🔔 Non dimenticare la SIAE! Considera anche amplificazione extra o prove.",
        "Location": "🔔 Verifica costi di pulizia finale, allestimento e extra time.",
        "Foto & Video": "🔔 Includi trasferta, pasti, album/USB extra.",
        "Fiori": "🔔 Aggiungi allestimento, consegna e smontaggio.",
        "Catering": "🔔 Verifica coperto, tovagliato, personale extra e pulizia.",
        "Trasporti": "🔔 Considera pedaggi, parcheggi, e tempi di attesa.",
        "Abiti": "🔔 Includi modifiche sartoriali, accessori e pulizia post-evento.",
        "Partecipazioni": "🔔 Aggiungi costi di spedizione, buste e segnaposto.",
        "Bomboniere": "🔔 Considera scatoline, nastri e confetti.",
        "Animazione": "🔔 Verifica costi attrezzatura, prove e eventuale amplificazione.",
      };
      
      return adviceMap[categoryName] || "Verifica sempre che i costi siano inclusivi di IVA e che non ci siano costi nascosti.";
    } catch (error) {
      return "Verifica sempre che i costi siano inclusivi di IVA e che non ci siano costi nascosti.";
    }
  };

  const [categoryAdvice, setCategoryAdvice] = useState<string>("");

  useEffect(() => {
    const loadAdvice = async () => {
      const advice = await getCategoryAdvice(categoryId);
      setCategoryAdvice(advice);
    };
    loadAdvice();
  }, [categoryId]);

  if (!expenseItemId) {
    return (
      <Alert>
        <AlertDescription>
          Salva prima il fornitore per poter aggiungere un piano di pagamento.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Piano di Pagamento
        </CardTitle>
        <CardDescription>
          Definisci le rate di pagamento per questo fornitore. Puoi usare cifre fisse o percentuali, date specifiche o giorni prima del matrimonio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {payments.map((payment, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Descrizione *</Label>
                <Input
                  placeholder="Es: Acconto alla firma, Saldo finale..."
                  value={payment.description}
                  onChange={(e) => updatePayment(index, "description", e.target.value)}
                />
              </div>

              {/* Tipo Importo */}
              <div className="space-y-2">
                <Label>Tipo Importo</Label>
                <RadioGroup
                  value={payment.amount_type}
                  onValueChange={(value) => updatePayment(index, "amount_type", value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id={`fixed-${index}`} />
                    <Label htmlFor={`fixed-${index}`} className="font-normal cursor-pointer">
                      Cifra Fissa
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id={`percentage-${index}`} />
                    <Label htmlFor={`percentage-${index}`} className="font-normal cursor-pointer">
                      Percentuale
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Campo Importo o Percentuale */}
              <div className="grid grid-cols-2 gap-3">
                {payment.amount_type === 'fixed' ? (
                  <div className="space-y-2">
                    <Label>Importo (€) *</Label>
                    <Input
                      type="number"
                      placeholder="2000"
                      value={payment.amount}
                      onChange={(e) => updatePayment(index, "amount", e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Percentuale (%) *</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="50"
                        value={payment.percentage_value}
                        onChange={(e) => updatePayment(index, "percentage_value", e.target.value)}
                      />
                      <Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Stato</Label>
                  <Select
                    value={payment.status}
                    onValueChange={(value) => updatePayment(index, "status", value)}
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

              {/* Sezione IVA */}
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium">Gestione IVA</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`tax-inclusive-${index}`}
                    checked={payment.tax_inclusive !== false}
                    onCheckedChange={(checked) => 
                      updatePayment(index, 'tax_inclusive', checked === true)
                    }
                  />
                  <label 
                    htmlFor={`tax-inclusive-${index}`}
                    className="text-sm cursor-pointer"
                  >
                    IVA inclusa nel prezzo
                  </label>
                </div>
                
                {payment.tax_inclusive === false && (
                  <div>
                    <Label htmlFor={`tax-rate-${index}`} className="text-xs">
                      Aliquota IVA (%)
                    </Label>
                    <Input
                      id={`tax-rate-${index}`}
                      type="number"
                      value={payment.tax_rate || '22'}
                      onChange={(e) => updatePayment(index, 'tax_rate', e.target.value)}
                      placeholder="22"
                      className="mt-1"
                    />
                    {payment.amount && payment.amount_type === 'fixed' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        IVA: €{((parseFloat(payment.amount) * (parseFloat(payment.tax_rate || '22') / 100))).toFixed(2)} → 
                        Totale: €{(parseFloat(payment.amount) * (1 + (parseFloat(payment.tax_rate || '22') / 100))).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Campi per "Chi ha pagato" - mostrati solo se status = "Pagato" */}
              {payment.status === 'Pagato' && (
                <div className="space-y-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <Label className="text-sm font-medium text-green-700 dark:text-green-400">
                      Pagamento Completato
                    </Label>
                  </div>
                  
                  <div>
                    <Label htmlFor={`paid-by-${index}`} className="text-sm">
                      Pagato da *
                    </Label>
                    <Select
                      value={payment.paid_by || ''}
                      onValueChange={(value) => updatePayment(index, 'paid_by', value)}
                    >
                      <SelectTrigger id={`paid-by-${index}`} className="mt-1">
                        <SelectValue placeholder="Seleziona chi ha pagato" />
                      </SelectTrigger>
                      <SelectContent>
                        {contributors.map((contributor) => (
                          <SelectItem key={contributor.id} value={contributor.name}>
                            {contributor.name}
                            {contributor.user_id && " 👤"}
                          </SelectItem>
                        ))}
                        {contributors.length === 0 && (
                          <SelectItem value="Io">Io</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`paid-on-date-${index}`} className="text-sm">
                      Data pagamento effettivo *
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id={`paid-on-date-${index}`}
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !payment.paid_on_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {payment.paid_on_date ? (
                            format(payment.paid_on_date, "dd/MM/yyyy")
                          ) : (
                            <span>Seleziona data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={payment.paid_on_date}
                          onSelect={(date) => updatePayment(index, 'paid_on_date', date)}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
              </div>

              {/* Tipo Scadenza - nascosto se già pagato */}
              {payment.status !== 'Pagato' && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo Scadenza</Label>
                    <RadioGroup
                      value={payment.due_date_type}
                      onValueChange={(value) => updatePayment(index, "due_date_type", value)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="absolute" id={`absolute-${index}`} />
                        <Label htmlFor={`absolute-${index}`} className="font-normal cursor-pointer">
                          Data Specifica
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="days_before" id={`days_before-${index}`} />
                        <Label htmlFor={`days_before-${index}`} className="font-normal cursor-pointer">
                          Giorni Prima Matrimonio
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Campo Data o Giorni Prima */}
                  {payment.due_date_type === 'absolute' ? (
                    <div className="space-y-2">
                      <Label>Data Scadenza *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !payment.due_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {payment.due_date ? format(payment.due_date, "dd MMM yyyy", { locale: it }) : "Seleziona data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={payment.due_date || undefined}
                            onSelect={(date) => updatePayment(index, "due_date", date || null)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Giorni Prima del Matrimonio *</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="30"
                        value={payment.days_before_wedding}
                        onChange={(e) => updatePayment(index, "days_before_wedding", e.target.value)}
                      />
                      {payment.days_before_wedding && weddingDate && (() => {
                        const days = parseInt(payment.days_before_wedding);
                        if (!isNaN(days)) {
                          const targetDate = new Date(weddingDate);
                          targetDate.setDate(targetDate.getDate() - days);
                          return (
                            <p className="text-xs text-muted-foreground">
                              Scadenza: {format(targetDate, "dd MMM yyyy", { locale: it })}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => handleSavePayment(index)}
              >
                Salva Rata
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => handleRemovePayment(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddPayment}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Rata
        </Button>

        {payments.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center font-semibold text-lg">
              <span>TOTALE IMPORTI FISSI:</span>
              <span className="text-primary">
                {new Intl.NumberFormat("it-IT", {
                  style: "currency",
                  currency: "EUR",
                }).format(totalAmount)}
              </span>
            </div>
            {payments.some(p => p.amount_type === 'percentage') && (
              <p className="text-xs text-muted-foreground mt-2">
                * Il totale non include le rate in percentuale. Saranno calcolate sul totale finale.
              </p>
            )}
          </div>
        )}

        {categoryAdvice && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <LightbulbIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              {categoryAdvice}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}