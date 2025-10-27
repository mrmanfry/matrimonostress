import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, CalendarIcon, Percent } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LightbulbIcon } from "lucide-react";

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
  const { toast } = useToast();
  const { authState } = useAuth();

  useEffect(() => {
    loadWeddingDate();
  }, [authState]);

  useEffect(() => {
    if (expenseItemId) {
      loadPayments();
    } else {
      setPayments([]);
    }
  }, [expenseItemId]);

  const loadWeddingDate = async () => {
    if (authState.status !== 'authenticated' || !authState.weddingId) return;

    try {
      const { data, error } = await supabase
        .from("weddings")
        .select("wedding_date")
        .eq("id", authState.weddingId)
        .single();

      if (error) throw error;
      if (data?.wedding_date) {
        setWeddingDate(new Date(data.wedding_date));
      }
    } catch (error) {
      console.error("Error loading wedding date:", error);
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
      if (!isNaN(days)) {
        return subDays(weddingDate, days);
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
    if (p.amount_type === 'fixed') {
      const amount = parseFloat(p.amount);
      return sum + (isNaN(amount) ? 0 : amount);
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
        "Musica": "🔔 Non dimenticare la SIAE! Considera anche costi per amplificazione extra o prove.",
        "Location": "🔔 I costi delle location spesso escludono pulizia finale, allestimento e smontaggio. L'hai verificato?",
        "Foto & Video": "🔔 Ricorda di includere costi per trasferta, pasti del fotografo e album/USB extra.",
        "Fiori": "🔔 Considera il costo dell'allestimento, consegna e eventuale smontaggio decorazioni.",
        "Catering": "🔔 Verifica se il servizio include coperto, tovagliato, personale extra e pulizia finale.",
        "Wedding Planner": "🔔 Chiarisci se include coordinamento giorno del matrimonio e gestione emergenze.",
        "Abiti": "🔔 Considera costi per ritocchi, pulizia post-evento e accessori (velo, scarpe, gioielli).",
        "Inviti": "🔔 Aggiungi costi per buste, francobolli, coordinati (menu, tableau, segnaposto).",
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
              </div>

              {/* Tipo Scadenza */}
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
                  {payment.days_before_wedding && weddingDate && (
                    <p className="text-xs text-muted-foreground">
                      Scadenza: {format(subDays(weddingDate, parseInt(payment.days_before_wedding)), "dd MMM yyyy", { locale: it })}
                    </p>
                  )}
                </div>
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