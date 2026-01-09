import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, ListTodo, CalendarCheck, Euro, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CalendarCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weddingId: string;
  selectedDate?: Date;
  defaultType?: "task" | "appointment" | "payment";
}

const PURPOSE_OPTIONS = [
  "Sopralluogo",
  "Degustazione",
  "Prova",
  "Incontro conoscitivo",
  "Firma contratto",
  "Altro",
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Bassa" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

export function CalendarCreateDialog({
  open,
  onOpenChange,
  weddingId,
  selectedDate,
  defaultType = "task",
}: CalendarCreateDialogProps) {
  const queryClient = useQueryClient();
  
  // Form state
  const [type, setType] = useState<"task" | "appointment" | "payment">(defaultType);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("entrambi");
  const [createReminder, setCreateReminder] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);
  
  // Payment specific
  const [vendorId, setVendorId] = useState<string>("");
  const [expenseItemId, setExpenseItemId] = useState<string>("");
  const [amount, setAmount] = useState("");

  // Fetch wedding for partner names
  const { data: wedding } = useQuery({
    queryKey: ["wedding-for-calendar", weddingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weddings")
        .select("partner1_name, partner2_name")
        .eq("id", weddingId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!weddingId,
  });

  // Fetch vendors
  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors-for-calendar", weddingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("wedding_id", weddingId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId,
  });

  // Fetch expense items for selected vendor
  const { data: expenseItems = [] } = useQuery({
    queryKey: ["expense-items-for-calendar", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      const { data, error } = await supabase
        .from("expense_items")
        .select("id, description")
        .eq("vendor_id", vendorId)
        .order("description");
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendorId,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setType(defaultType);
      setTitle("");
      setDate(selectedDate);
      setTime("");
      setLocation("");
      setPurpose("");
      setNotes("");
      setPriority("medium");
      setAssignedTo("entrambi");
      setCreateReminder(true);
      setReminderDaysBefore(1);
      setVendorId("");
      setExpenseItemId("");
      setAmount("");
    }
  }, [open, defaultType, selectedDate]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (type === "task") {
        const { error } = await supabase.from("checklist_tasks").insert({
          wedding_id: weddingId,
          vendor_id: vendorId || null,
          title,
          description: notes || null,
          due_date: date ? format(date, "yyyy-MM-dd") : null,
          priority,
          assigned_to: getAssignedName(),
          status: "pending",
        });
        if (error) throw error;
      } else if (type === "appointment") {
        if (!vendorId) {
          throw new Error("Seleziona un fornitore per l'appuntamento");
        }
        
        let linkedTaskId: string | null = null;

        // Create reminder task if requested
        if (createReminder && date) {
          const vendorName = vendors.find(v => v.id === vendorId)?.name || "Fornitore";
          const reminderDate = addDays(date, -reminderDaysBefore);
          const { data: taskData, error: taskError } = await supabase
            .from("checklist_tasks")
            .insert({
              wedding_id: weddingId,
              vendor_id: vendorId,
              title: `📅 Appuntamento: ${title}`,
              description: `Reminder: ${reminderDaysBefore === 0 ? "Oggi" : `tra ${reminderDaysBefore} giorno/i`} hai un appuntamento con ${vendorName}${location ? ` presso ${location}` : ""}`,
              due_date: format(reminderDate, "yyyy-MM-dd"),
              priority: "high",
              assigned_to: getAssignedName(),
              status: "pending",
              category: "Fornitori",
            })
            .select("id")
            .single();

          if (taskError) throw taskError;
          linkedTaskId = taskData.id;
        }

        const { error: appointmentError } = await supabase
          .from("vendor_appointments")
          .insert({
            wedding_id: weddingId,
            vendor_id: vendorId,
            title,
            appointment_date: format(date!, "yyyy-MM-dd"),
            appointment_time: time || null,
            location: location || null,
            purpose: purpose || null,
            notes_before: notes || null,
            linked_task_id: linkedTaskId,
            status: "scheduled",
          });

        if (appointmentError) throw appointmentError;
      } else if (type === "payment") {
        if (!expenseItemId) {
          throw new Error("Seleziona una voce di spesa per il pagamento");
        }
        
        const { error } = await supabase.from("payments").insert({
          expense_item_id: expenseItemId,
          description: title,
          amount: parseFloat(amount) || 0,
          due_date: format(date!, "yyyy-MM-dd"),
          status: "Da Pagare",
          tax_inclusive: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-payments"] });
      queryClient.invalidateQueries({ queryKey: ["checklist-tasks"] });
      
      const messages = {
        task: "Task creato!",
        appointment: "Appuntamento pianificato!",
        payment: "Pagamento aggiunto!",
      };
      toast.success(messages[type]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error creating:", error);
      toast.error(error.message || "Errore nella creazione");
    },
  });

  const getAssignedName = () => {
    if (!wedding) return assignedTo;
    if (assignedTo === "partner1") return wedding.partner1_name;
    if (assignedTo === "partner2") return wedding.partner2_name;
    return "Entrambi";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Inserisci un titolo");
      return;
    }
    
    if ((type === "appointment" || type === "payment") && !date) {
      toast.error("Seleziona una data");
      return;
    }

    if (type === "appointment" && !vendorId) {
      toast.error("Seleziona un fornitore");
      return;
    }

    if (type === "payment" && !expenseItemId) {
      toast.error("Seleziona una voce di spesa");
      return;
    }

    if (type === "payment" && (!amount || parseFloat(amount) <= 0)) {
      toast.error("Inserisci un importo valido");
      return;
    }

    createMutation.mutate();
  };

  const assignedOptions = wedding
    ? [
        { value: "partner1", label: wedding.partner1_name },
        { value: "partner2", label: wedding.partner2_name },
        { value: "entrambi", label: "Entrambi" },
      ]
    : [
        { value: "partner1", label: "Partner 1" },
        { value: "partner2", label: "Partner 2" },
        { value: "entrambi", label: "Entrambi" },
      ];

  const getTypeIcon = () => {
    switch (type) {
      case "task": return <ListTodo className="w-5 h-5 text-blue-600" />;
      case "appointment": return <CalendarCheck className="w-5 h-5 text-violet-600" />;
      case "payment": return <Euro className="w-5 h-5 text-amber-600" />;
    }
  };

  const getTypeTitle = () => {
    switch (type) {
      case "task": return "Nuovo Task";
      case "appointment": return "Nuovo Appuntamento";
      case "payment": return "Nuovo Pagamento";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            <span>{getTypeTitle()}</span>
            {date && (
              <span className="text-sm font-normal text-muted-foreground">
                - {format(date, "d MMMM yyyy", { locale: it })}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Selector */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => {
                setType(v as "task" | "appointment" | "payment");
                setVendorId("");
                setExpenseItemId("");
              }}
              className="flex flex-wrap gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="task" id="type-task" />
                <Label htmlFor="type-task" className="cursor-pointer flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-blue-600" />
                  Task
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="appointment" id="type-appointment" />
                <Label htmlFor="type-appointment" className="cursor-pointer flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-violet-600" />
                  Appuntamento
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="payment" id="type-payment" />
                <Label htmlFor="type-payment" className="cursor-pointer flex items-center gap-1.5">
                  <Euro className="w-4 h-4 text-amber-600" />
                  Pagamento
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {type === "payment" ? "Descrizione rata *" : "Titolo *"}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "task" 
                  ? "Es: Richiedere preventivo aggiornato" 
                  : type === "appointment"
                  ? "Es: Sopralluogo location"
                  : "Es: Acconto 30%"
              }
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Data {(type === "appointment" || type === "payment") && "*"}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? format(date, "d MMM yyyy", { locale: it }) : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={it}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Vendor selector for appointments and payments */}
          {(type === "appointment" || type === "payment") && (
            <div className="space-y-2">
              <Label>Fornitore {type === "appointment" && "*"}</Label>
              <Select value={vendorId} onValueChange={(v) => {
                setVendorId(v);
                setExpenseItemId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona fornitore..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Expense item selector for payments */}
          {type === "payment" && vendorId && (
            <div className="space-y-2">
              <Label>Voce di spesa *</Label>
              <Select value={expenseItemId} onValueChange={setExpenseItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona voce di spesa..." />
                </SelectTrigger>
                <SelectContent>
                  {expenseItems.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Nessuna voce di spesa per questo fornitore
                    </div>
                  ) : (
                    expenseItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.description}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount for payments */}
          {type === "payment" && (
            <div className="space-y-2">
              <Label htmlFor="amount">Importo (€) *</Label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {/* Time for appointments */}
          {type === "appointment" && (
            <div className="space-y-2">
              <Label htmlFor="time">Ora</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {/* Appointment-specific fields */}
          {type === "appointment" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="location">Luogo</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Es: Via Roma 123, Milano"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Motivo</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona motivo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Checkbox
                  id="create-reminder"
                  checked={createReminder}
                  onCheckedChange={(c) => setCreateReminder(!!c)}
                />
                <div className="flex-1">
                  <Label htmlFor="create-reminder" className="cursor-pointer">
                    Crea reminder in checklist
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Aggiungerà un task promemoria
                  </p>
                </div>
                {createReminder && (
                  <Select
                    value={reminderDaysBefore.toString()}
                    onValueChange={(v) => setReminderDaysBefore(parseInt(v))}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Lo stesso giorno</SelectItem>
                      <SelectItem value="1">1 giorno prima</SelectItem>
                      <SelectItem value="2">2 giorni prima</SelectItem>
                      <SelectItem value="3">3 giorni prima</SelectItem>
                      <SelectItem value="7">1 settimana prima</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </>
          )}

          {/* Notes - for task and appointment */}
          {type !== "payment" && (
            <div className="space-y-2">
              <Label htmlFor="notes">
                {type === "appointment" ? "Note preparazione" : "Descrizione"}
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  type === "appointment"
                    ? "Cosa chiedere, cosa portare..."
                    : "Dettagli aggiuntivi..."
                }
                rows={3}
              />
            </div>
          )}

          {/* Priority and Assignment - for task and appointment */}
          {type !== "payment" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priorità</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assegnato a</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {type === "task" ? "Crea Task" : type === "appointment" ? "Pianifica" : "Aggiungi Pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
