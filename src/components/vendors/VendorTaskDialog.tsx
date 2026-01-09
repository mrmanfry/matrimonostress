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
import { Calendar, Clock, ListTodo, CalendarCheck, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface VendorTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  weddingId: string;
  defaultType?: "task" | "appointment";
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

const ASSIGNED_OPTIONS = [
  { value: "partner1", label: "Partner 1" },
  { value: "partner2", label: "Partner 2" },
  { value: "entrambi", label: "Entrambi" },
];

export function VendorTaskDialog({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  weddingId,
  defaultType = "task",
}: VendorTaskDialogProps) {
  const queryClient = useQueryClient();
  
  // Form state
  const [type, setType] = useState<"task" | "appointment">(defaultType);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("entrambi");
  const [createReminder, setCreateReminder] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);

  // Fetch wedding for partner names
  const { data: wedding } = useQuery({
    queryKey: ["wedding-for-task", weddingId],
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setType(defaultType);
      setTitle("");
      setDate(undefined);
      setTime("");
      setEndTime("");
      setLocation("");
      setPurpose("");
      setNotes("");
      setPriority("medium");
      setAssignedTo("entrambi");
      setCreateReminder(true);
      setReminderDaysBefore(1);
    }
  }, [open, defaultType]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (type === "task") {
        // Create a regular checklist task
        const { error } = await supabase.from("checklist_tasks").insert({
          wedding_id: weddingId,
          vendor_id: vendorId,
          title,
          description: notes || null,
          due_date: date ? format(date, "yyyy-MM-dd") : null,
          priority,
          assigned_to: getAssignedName(),
          status: "pending",
        });
        if (error) throw error;
      } else {
        // Create an appointment
        let linkedTaskId: string | null = null;

        // First create the reminder task if requested
        if (createReminder && date) {
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

        // Then create the appointment
        const { error: appointmentError } = await supabase
          .from("vendor_appointments")
          .insert({
            wedding_id: weddingId,
            vendor_id: vendorId,
            title,
            appointment_date: format(date!, "yyyy-MM-dd"),
            appointment_time: time || null,
            end_time: endTime || null,
            location: location || null,
            purpose: purpose || null,
            notes_before: notes || null,
            linked_task_id: linkedTaskId,
            status: "scheduled",
          });

        if (appointmentError) throw appointmentError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-checklist", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-appointments", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["checklist-tasks"] });
      toast.success(type === "task" ? "Task creato!" : "Appuntamento pianificato!");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error creating:", error);
      toast.error("Errore nella creazione");
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
    
    if (type === "appointment" && !date) {
      toast.error("Seleziona una data per l'appuntamento");
      return;
    }

    createTaskMutation.mutate();
  };

  const assignedOptions = wedding
    ? [
        { value: "partner1", label: wedding.partner1_name },
        { value: "partner2", label: wedding.partner2_name },
        { value: "entrambi", label: "Entrambi" },
      ]
    : ASSIGNED_OPTIONS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "task" ? (
              <ListTodo className="w-5 h-5 text-indigo-600" />
            ) : (
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
            )}
            <span>
              {type === "task" ? "Nuovo Task" : "Nuovo Appuntamento"} per{" "}
              <span className="text-primary">"{vendorName}"</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Selector */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as "task" | "appointment")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="task" id="type-task" />
                <Label htmlFor="type-task" className="cursor-pointer flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4" />
                  Task generico
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="appointment" id="type-appointment" />
                <Label htmlFor="type-appointment" className="cursor-pointer flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4" />
                  Appuntamento
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titolo *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "task" ? "Es: Richiedere preventivo aggiornato" : "Es: Sopralluogo location"}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data {type === "appointment" && "*"}</Label>
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
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>

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
          </div>

          {/* Appointment-specific fields */}
          {type === "appointment" && (
            <>
              {/* Location */}
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

              {/* Purpose */}
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

              {/* Reminder checkbox */}
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

          {/* Notes */}
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

          {/* Priority and Assignment */}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {type === "task" ? "Crea Task" : "Pianifica Appuntamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}