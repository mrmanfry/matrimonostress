import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  MapPin,
  CalendarCheck,
  Plus,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

interface VendorAppointment {
  id: string;
  title: string;
  appointment_date: string;
  appointment_time: string | null;
  end_time: string | null;
  location: string | null;
  purpose: string | null;
  notes_before: string | null;
  notes_after: string | null;
  status: string;
  linked_task_id: string | null;
  created_at: string;
}

interface VendorAppointmentsWidgetProps {
  vendorId: string;
  vendorName: string;
  weddingId: string;
  onCreateAppointment: () => void;
}

const statusConfig = {
  scheduled: { label: "Schedulato", icon: Calendar, color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed: { label: "Completato", icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200" },
  cancelled: { label: "Annullato", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" },
  rescheduled: { label: "Riprogrammato", icon: Calendar, color: "text-amber-600 bg-amber-50 border-amber-200" },
};

export function VendorAppointmentsWidget({
  vendorId,
  vendorName,
  weddingId,
  onCreateAppointment,
}: VendorAppointmentsWidgetProps) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesAfterText, setNotesAfterText] = useState("");
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["vendor-appointments", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_appointments")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      return data as VendorAppointment[];
    },
  });

  // Update appointment mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<VendorAppointment>;
    }) => {
      const { error } = await supabase
        .from("vendor_appointments")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-appointments", vendorId] });
      toast.success("Appuntamento aggiornato");
      setEditingNotesId(null);
      setConfirmCompleteId(null);
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Errore nell'aggiornamento");
    },
  });

  const handleMarkComplete = (appointment: VendorAppointment) => {
    // If no notes after, ask for them
    if (!appointment.notes_after && !notesAfterText) {
      setConfirmCompleteId(appointment.id);
      return;
    }

    updateMutation.mutate({
      id: appointment.id,
      updates: {
        status: "completed",
        notes_after: notesAfterText || appointment.notes_after,
      },
    });
  };

  const handleSaveNotes = (id: string) => {
    updateMutation.mutate({
      id,
      updates: { notes_after: notesAfterText },
    });
  };

  const handleStartEditNotes = (appointment: VendorAppointment) => {
    setEditingNotesId(appointment.id);
    setNotesAfterText(appointment.notes_after || "");
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Oggi";
    if (isTomorrow(date)) return "Domani";
    return format(date, "EEEE d MMMM yyyy", { locale: it });
  };

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "scheduled" && !isPast(new Date(a.appointment_date + "T23:59:59"))
  );
  const pastAppointments = appointments.filter(
    (a) => a.status !== "scheduled" || isPast(new Date(a.appointment_date + "T23:59:59"))
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="h-24 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
              Appuntamenti
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Incontri e sopralluoghi con questo fornitore
            </p>
          </div>
          <Button size="sm" onClick={onCreateAppointment} className="gap-2">
            <Plus className="w-4 h-4" />
            Pianifica
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {appointments.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CalendarCheck className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
              <div>
                <p className="text-muted-foreground font-medium">
                  Nessun appuntamento pianificato
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pianifica sopralluoghi, degustazioni e incontri
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onCreateAppointment}>
                <Plus className="w-4 h-4 mr-2" />
                Pianifica Appuntamento
              </Button>
            </div>
          ) : (
            <>
              {/* Upcoming Appointments */}
              {upcomingAppointments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Prossimi Appuntamenti
                  </h4>
                  {upcomingAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      isExpanded={expandedId === appointment.id}
                      onToggleExpand={() =>
                        setExpandedId(expandedId === appointment.id ? null : appointment.id)
                      }
                      isEditingNotes={editingNotesId === appointment.id}
                      notesAfterText={notesAfterText}
                      onNotesChange={setNotesAfterText}
                      onStartEditNotes={() => handleStartEditNotes(appointment)}
                      onSaveNotes={() => handleSaveNotes(appointment.id)}
                      onCancelEditNotes={() => setEditingNotesId(null)}
                      onMarkComplete={() => handleMarkComplete(appointment)}
                      onCancel={() =>
                        updateMutation.mutate({
                          id: appointment.id,
                          updates: { status: "cancelled" },
                        })
                      }
                      isPending={updateMutation.isPending}
                    />
                  ))}
                </div>
              )}

              {/* Past/Completed Appointments */}
              {pastAppointments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Storico Appuntamenti
                  </h4>
                  {pastAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      isExpanded={expandedId === appointment.id}
                      onToggleExpand={() =>
                        setExpandedId(expandedId === appointment.id ? null : appointment.id)
                      }
                      isEditingNotes={editingNotesId === appointment.id}
                      notesAfterText={notesAfterText}
                      onNotesChange={setNotesAfterText}
                      onStartEditNotes={() => handleStartEditNotes(appointment)}
                      onSaveNotes={() => handleSaveNotes(appointment.id)}
                      onCancelEditNotes={() => setEditingNotesId(null)}
                      onMarkComplete={() => handleMarkComplete(appointment)}
                      onCancel={() =>
                        updateMutation.mutate({
                          id: appointment.id,
                          updates: { status: "cancelled" },
                        })
                      }
                      isPending={updateMutation.isPending}
                      isPast
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm Complete Dialog */}
      <AlertDialog
        open={!!confirmCompleteId}
        onOpenChange={() => setConfirmCompleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Segna come completato?</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi aggiungere delle note su cosa vi siete detti durante l'appuntamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Es: Confermata disponibilità, discusso menù bambini, prossimo step firma contratto..."
            value={notesAfterText}
            onChange={(e) => setNotesAfterText(e.target.value)}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNotesAfterText("")}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmCompleteId) {
                  updateMutation.mutate({
                    id: confirmCompleteId,
                    updates: {
                      status: "completed",
                      notes_after: notesAfterText || null,
                    },
                  });
                }
              }}
            >
              Completa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Individual Appointment Card Component
interface AppointmentCardProps {
  appointment: VendorAppointment;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isEditingNotes: boolean;
  notesAfterText: string;
  onNotesChange: (text: string) => void;
  onStartEditNotes: () => void;
  onSaveNotes: () => void;
  onCancelEditNotes: () => void;
  onMarkComplete: () => void;
  onCancel: () => void;
  isPending: boolean;
  isPast?: boolean;
}

function AppointmentCard({
  appointment,
  isExpanded,
  onToggleExpand,
  isEditingNotes,
  notesAfterText,
  onNotesChange,
  onStartEditNotes,
  onSaveNotes,
  onCancelEditNotes,
  onMarkComplete,
  onCancel,
  isPending,
  isPast,
}: AppointmentCardProps) {
  const status = appointment.status as keyof typeof statusConfig;
  const statusInfo = statusConfig[status] || statusConfig.scheduled;
  const StatusIcon = statusInfo.icon;
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";
  const dateLabel = format(new Date(appointment.appointment_date), "EEE d MMM", {
    locale: it,
  });

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        className={cn(
          "rounded-lg border transition-all",
          isExpanded ? "border-primary/30 shadow-sm" : "hover:border-primary/20",
          isPast && !isCompleted && !isCancelled && "border-amber-200 bg-amber-50/50"
        )}
      >
        {/* Header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-start gap-3 p-4 cursor-pointer">
            <div
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                statusInfo.color
              )}
            >
              <StatusIcon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{appointment.title}</p>
                {appointment.purpose && (
                  <Badge variant="secondary" className="text-xs">
                    {appointment.purpose}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {dateLabel}
                </span>
                {appointment.appointment_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {appointment.appointment_time.substring(0, 5)}
                  </span>
                )}
                {appointment.location && (
                  <span className="flex items-center gap-1 truncate max-w-[150px]">
                    <MapPin className="w-3 h-3" />
                    {appointment.location}
                  </span>
                )}
              </div>
            </div>

            <Badge className={cn("border text-xs", statusInfo.color)}>
              {statusInfo.label}
            </Badge>

            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        {/* Expanded Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            {/* Notes Before */}
            {appointment.notes_before && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Note preparazione
                </p>
                <p className="text-sm bg-muted/50 p-2 rounded">
                  {appointment.notes_before}
                </p>
              </div>
            )}

            {/* Notes After */}
            {(appointment.notes_after || isCompleted) && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Note post-appuntamento
                </p>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <Textarea
                      value={notesAfterText}
                      onChange={(e) => onNotesChange(e.target.value)}
                      placeholder="Cosa vi siete detti..."
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={onCancelEditNotes}>
                        Annulla
                      </Button>
                      <Button size="sm" onClick={onSaveNotes} disabled={isPending}>
                        Salva
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="text-sm bg-muted/50 p-2 rounded flex-1">
                      {appointment.notes_after || (
                        <span className="text-muted-foreground italic">
                          Nessuna nota aggiunta
                        </span>
                      )}
                    </p>
                    <Button size="icon" variant="ghost" onClick={onStartEditNotes}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {!isCancelled && (
              <div className="flex justify-end gap-2 pt-2">
                {!isCompleted && (
                  <>
                    <Button size="sm" variant="outline" onClick={onCancel}>
                      <XCircle className="w-4 h-4 mr-1" />
                      Annulla
                    </Button>
                    <Button size="sm" onClick={onMarkComplete} disabled={isPending}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Segna Completato
                    </Button>
                  </>
                )}
                {isCompleted && !appointment.notes_after && (
                  <Button size="sm" variant="outline" onClick={onStartEditNotes}>
                    <Pencil className="w-4 h-4 mr-1" />
                    Aggiungi Note
                  </Button>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}