import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Clock, 
  Euro, 
  CheckSquare, 
  MapPin, 
  Pencil, 
  Trash2, 
  X,
  CalendarIcon,
  Building2,
  Save
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: "appointment" | "task" | "payment";
  status: string;
  amount?: number;
  location?: string;
  vendorId?: string;
  vendorName?: string;
  priority?: string;
}

interface EventDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  weddingId: string;
}

export const EventDetailDialog = ({
  open,
  onOpenChange,
  event,
  weddingId,
}: EventDetailDialogProps) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(event.date);
      setTime(event.time || "");
      setLocation(event.location || "");
      setStatus(event.status);
      setPriority(event.priority || "");
      setAmount(event.amount?.toString() || "");
      setIsEditing(false);
    }
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!event) return;

      if (event.type === "appointment") {
        const { error } = await supabase
          .from("vendor_appointments")
          .update({
            title,
            appointment_date: date ? format(date, "yyyy-MM-dd") : undefined,
            appointment_time: time || null,
            location: location || null,
            status,
          })
          .eq("id", event.id);
        if (error) throw error;
      } else if (event.type === "task") {
        const { error } = await supabase
          .from("checklist_tasks")
          .update({
            title,
            due_date: date ? format(date, "yyyy-MM-dd") : null,
            status,
            priority: priority || null,
          })
          .eq("id", event.id);
        if (error) throw error;
      } else if (event.type === "payment") {
        const { error } = await supabase
          .from("payments")
          .update({
            description: title,
            due_date: date ? format(date, "yyyy-MM-dd") : undefined,
            status,
            amount: parseFloat(amount) || 0,
          })
          .eq("id", event.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-payments"] });
      toast.success("Evento aggiornato");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Errore durante l'aggiornamento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!event) return;

      if (event.type === "appointment") {
        const { error } = await supabase
          .from("vendor_appointments")
          .delete()
          .eq("id", event.id);
        if (error) throw error;
      } else if (event.type === "task") {
        const { error } = await supabase
          .from("checklist_tasks")
          .delete()
          .eq("id", event.id);
        if (error) throw error;
      } else if (event.type === "payment") {
        const { error } = await supabase
          .from("payments")
          .delete()
          .eq("id", event.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-payments"] });
      toast.success("Evento eliminato");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Errore durante l'eliminazione");
    },
  });

  if (!event) return null;

  const getEventColor = () => {
    if (event.type === "appointment") return "bg-violet-500";
    if (event.type === "payment") {
      if (event.status === "Pagato") return "bg-green-500";
      return "bg-amber-500";
    }
    if (event.type === "task") {
      if (event.status === "completed") return "bg-green-500";
      return "bg-blue-500";
    }
    return "bg-muted";
  };

  const getEventIcon = () => {
    switch (event.type) {
      case "appointment": return <Clock className="w-5 h-5" />;
      case "payment": return <Euro className="w-5 h-5" />;
      case "task": return <CheckSquare className="w-5 h-5" />;
    }
  };

  const getEventTypeName = () => {
    switch (event.type) {
      case "appointment": return "Appuntamento";
      case "payment": return "Pagamento";
      case "task": return "Task";
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount);

  const getStatusOptions = () => {
    if (event.type === "appointment") {
      return [
        { value: "scheduled", label: "Programmato" },
        { value: "completed", label: "Completato" },
        { value: "cancelled", label: "Annullato" },
      ];
    }
    if (event.type === "task") {
      return [
        { value: "pending", label: "Da fare" },
        { value: "in_progress", label: "In corso" },
        { value: "completed", label: "Completato" },
      ];
    }
    if (event.type === "payment") {
      return [
        { value: "Da Pagare", label: "Da Pagare" },
        { value: "Pagato", label: "Pagato" },
      ];
    }
    return [];
  };

  const handleSave = () => {
    updateMutation.mutate();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className={`p-2 rounded-lg text-white ${getEventColor()}`}>
                  {getEventIcon()}
                </div>
                {getEventTypeName()}
              </DialogTitle>
              {!isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Titolo</Label>
              {isEditing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titolo evento"
                />
              ) : (
                <p className="text-lg font-semibold">{event.title}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Data</Label>
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="w-4 h-4" />
                  {format(event.date, "EEEE d MMMM yyyy", { locale: it })}
                </p>
              )}
            </div>

            {/* Time (for appointments) */}
            {(event.type === "appointment" || isEditing) && event.type === "appointment" && (
              <div className="space-y-2">
                <Label>Orario</Label>
                {isEditing ? (
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                ) : event.time ? (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {event.time}
                  </p>
                ) : null}
              </div>
            )}

            {/* Location (for appointments) */}
            {(event.type === "appointment" || isEditing) && event.type === "appointment" && (
              <div className="space-y-2">
                <Label>Luogo</Label>
                {isEditing ? (
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Luogo appuntamento"
                  />
                ) : event.location ? (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {event.location}
                  </p>
                ) : null}
              </div>
            )}

            {/* Amount (for payments) */}
            {event.type === "payment" && (
              <div className="space-y-2">
                <Label>Importo</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                ) : event.amount ? (
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(event.amount)}
                  </p>
                ) : null}
              </div>
            )}

            {/* Priority (for tasks) */}
            {event.type === "task" && (
              <div className="space-y-2">
                <Label>Priorità</Label>
                {isEditing ? (
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona priorità" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="must">Must - Critico</SelectItem>
                      <SelectItem value="should">Should - Importante</SelectItem>
                      <SelectItem value="could">Could - Opzionale</SelectItem>
                    </SelectContent>
                  </Select>
                ) : event.priority ? (
                  <Badge
                    variant={
                      event.priority === "must" ? "destructive" :
                      event.priority === "should" ? "default" : "secondary"
                    }
                  >
                    {event.priority.toUpperCase()}
                  </Badge>
                ) : null}
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <Label>Stato</Label>
              {isEditing ? (
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona stato" />
                  </SelectTrigger>
                  <SelectContent>
                    {getStatusOptions().map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline">{event.status}</Badge>
              )}
            </div>

            {/* Vendor */}
            {event.vendorName && (
              <div className="space-y-2">
                <Label>Fornitore</Label>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  {event.vendorName}
                </p>
              </div>
            )}
          </div>

          {isEditing && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4 mr-1" />
                Annulla
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-1" />
                {updateMutation.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{event.title}". Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
