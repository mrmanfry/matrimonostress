import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LightbulbIcon } from "lucide-react";

interface Payment {
  id?: string;
  description: string;
  amount: string;
  due_date: Date | null;
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
  const { toast } = useToast();

  useEffect(() => {
    if (expenseItemId) {
      loadPayments();
    } else {
      setPayments([]);
    }
  }, [expenseItemId]);

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
          due_date: p.due_date ? new Date(p.due_date) : null,
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
        due_date: null,
        status: "Da Pagare",
      },
    ]);
  };

  const handleRemovePayment = async (index: number) => {
    const payment = payments[index];
    if (payment.id) {
      // Delete from DB
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

  const handleSavePayment = async (index: number) => {
    const payment = payments[index];

    if (!payment.description || !payment.amount || !payment.due_date || !expenseItemId) {
      toast({
        title: "Campi mancanti",
        description: "Compila tutti i campi della rata prima di salvare",
        variant: "destructive",
      });
      return;
    }

    try {
      const paymentData = {
        expense_item_id: expenseItemId,
        description: payment.description,
        amount: parseFloat(payment.amount),
        due_date: format(payment.due_date, "yyyy-MM-dd"),
        status: payment.status,
      };

      if (payment.id) {
        // Update
        const { error } = await supabase.from("payments").update(paymentData).eq("id", payment.id);
        if (error) throw error;
      } else {
        // Insert
        const { data, error } = await supabase.from("payments").insert(paymentData).select().single();
        if (error) throw error;

        // Update local state with new ID
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
    const amount = parseFloat(p.amount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const getCategoryAdvice = async (categoryId: string | null) => {
    if (!categoryId) {
      return "Verifica sempre che i costi siano inclusivi di IVA e che non ci siano costi nascosti.";
    }

    // Carica il nome della categoria dal DB
    try {
      const { data } = await supabase
        .from("expense_categories")
        .select("name")
        .eq("id", categoryId)
        .single();
      
      const categoryName = data?.name || "";
      
      // Suggerimenti specifici per categoria
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
          Definisci le rate di pagamento per questo fornitore. I dati popoleranno automaticamente il grafico "Orizzonte Liquidità".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {payments.map((payment, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Descrizione *</Label>
                <Input
                  placeholder="Es: Acconto alla firma"
                  value={payment.description}
                  onChange={(e) => updatePayment(index, "description", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Importo (€) *</Label>
                <Input
                  type="number"
                  placeholder="2000"
                  value={payment.amount}
                  onChange={(e) => updatePayment(index, "amount", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Scadenza *</Label>
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
              <span>TOTALE IMPEGNATO:</span>
              <span className="text-primary">
                {new Intl.NumberFormat("it-IT", {
                  style: "currency",
                  currency: "EUR",
                }).format(totalAmount)}
              </span>
            </div>
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
