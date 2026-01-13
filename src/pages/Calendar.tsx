import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Euro,
  CheckSquare,
  MapPin,
  Plus,
  X
} from "lucide-react";
import { CalendarCreateDialog } from "@/components/calendar/CalendarCreateDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  addWeeks,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useNavigate } from "react-router-dom";

type ViewMode = "month" | "week";

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

const Calendar = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dayPreviewOpen, setDayPreviewOpen] = useState(false);
  const [previewDate, setPreviewDate] = useState<Date | null>(null);

  const weddingId = authState.status === "authenticated" ? authState.weddingId : null;

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ["calendar-appointments", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      const { data, error } = await supabase
        .from("vendor_appointments")
        .select(`
          id, title, appointment_date, appointment_time, location, status,
          vendor_id,
          vendors(name)
        `)
        .eq("wedding_id", weddingId)
        .neq("status", "cancelled");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId,
  });

  // Fetch tasks with due dates
  const { data: tasks = [] } = useQuery({
    queryKey: ["calendar-tasks", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      const { data, error } = await supabase
        .from("checklist_tasks")
        .select(`
          id, title, due_date, status, priority,
          vendor_id,
          vendors(name)
        `)
        .eq("wedding_id", weddingId)
        .not("due_date", "is", null);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId,
  });

  // Fetch payments
  const { data: payments = [] } = useQuery({
    queryKey: ["calendar-payments", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      
      const { data: expenseItems } = await supabase
        .from("expense_items")
        .select("id, vendor_id, vendors(name)")
        .eq("wedding_id", weddingId);
      
      if (!expenseItems?.length) return [];
      
      const expenseIds = expenseItems.map(e => e.id);
      const { data, error } = await supabase
        .from("payments")
        .select("id, description, amount, due_date, status, expense_item_id")
        .in("expense_item_id", expenseIds);
      
      if (error) throw error;
      
      // Map vendor info to payments
      return (data || []).map(p => {
        const expense = expenseItems.find(e => e.id === p.expense_item_id);
        return {
          ...p,
          vendor_id: expense?.vendor_id,
          vendor_name: (expense?.vendors as any)?.name,
        };
      });
    },
    enabled: !!weddingId,
  });

  // Combine all events
  const events: CalendarEvent[] = useMemo(() => {
    const allEvents: CalendarEvent[] = [];

    // Appointments
    appointments.forEach((apt: any) => {
      allEvents.push({
        id: apt.id,
        title: apt.title,
        date: parseISO(apt.appointment_date),
        time: apt.appointment_time?.slice(0, 5),
        type: "appointment",
        status: apt.status,
        location: apt.location,
        vendorId: apt.vendor_id,
        vendorName: apt.vendors?.name,
      });
    });

    // Tasks
    tasks.forEach((task: any) => {
      if (task.due_date) {
        allEvents.push({
          id: task.id,
          title: task.title,
          date: parseISO(task.due_date),
          type: "task",
          status: task.status,
          priority: task.priority,
          vendorId: task.vendor_id,
          vendorName: task.vendors?.name,
        });
      }
    });

    // Payments
    payments.forEach((payment: any) => {
      allEvents.push({
        id: payment.id,
        title: payment.description,
        date: parseISO(payment.due_date),
        type: "payment",
        status: payment.status,
        amount: payment.amount,
        vendorId: payment.vendor_id,
        vendorName: payment.vendor_name,
      });
    });

    return allEvents;
  }, [appointments, tasks, payments]);

  // Navigation
  const goToPrev = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, -1));
    } else {
      setCurrentDate(addWeeks(currentDate, -1));
    }
  };

  const goToNext = () => {
    if (viewMode === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // Get calendar days
  const calendarDays = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      const days: Date[] = [];
      let day = calendarStart;
      while (day <= calendarEnd) {
        days.push(day);
        day = addDays(day, 1);
      }
      return days;
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }
      return days;
    }
  }, [currentDate, viewMode]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.date, day));
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === "appointment") return "bg-violet-500";
    if (event.type === "payment") {
      if (event.status === "Pagato") return "bg-green-500";
      if (event.date < new Date()) return "bg-red-500";
      return "bg-amber-500";
    }
    if (event.type === "task") {
      if (event.status === "completed") return "bg-green-500";
      if (event.date < new Date() && event.status === "pending") return "bg-red-500";
      return "bg-blue-500";
    }
    return "bg-muted";
  };

  const getEventIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "appointment": return <Clock className="w-3 h-3" />;
      case "payment": return <Euro className="w-3 h-3" />;
      case "task": return <CheckSquare className="w-3 h-3" />;
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.vendorId) {
      navigate(`/app/vendors/${event.vendorId}`);
    } else if (event.type === "task") {
      navigate("/app/checklist");
    } else if (event.type === "payment") {
      navigate("/app/treasury");
    }
  };

  const handleDayClick = (day: Date) => {
    setPreviewDate(day);
    setDayPreviewOpen(true);
  };

  const handleCreateFromPreview = () => {
    setSelectedDate(previewDate || new Date());
    setDayPreviewOpen(false);
    setCreateDialogOpen(true);
  };

  const previewEvents = previewDate ? getEventsForDay(previewDate) : [];

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    const upcoming7Days = addDays(today, 7);
    
    const upcomingEvents = events.filter(e => e.date >= today && e.date <= upcoming7Days);
    const overduePayments = events.filter(e => e.type === "payment" && e.status === "Da Pagare" && e.date < today);
    const overdueTasks = events.filter(e => e.type === "task" && e.status === "pending" && e.date < today);

    return {
      upcoming: upcomingEvents.length,
      overduePayments: overduePayments.length,
      overdueTasks: overdueTasks.length,
    };
  }, [events]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Calendario
          </h1>
          <p className="text-muted-foreground text-sm">
            Appuntamenti, scadenze e pagamenti in un'unica vista
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => { setSelectedDate(new Date()); setCreateDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" />
            Nuovo
          </Button>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">Mese</TabsTrigger>
              <TabsTrigger value="week">Settimana</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.upcoming}</p>
              <p className="text-xs text-muted-foreground">Prossimi 7 giorni</p>
            </div>
          </div>
        </Card>
        
        <Card className={`p-4 ${stats.overduePayments > 0 ? "border-red-500/50 bg-red-50 dark:bg-red-950/20" : ""}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.overduePayments > 0 ? "bg-red-500/10" : "bg-amber-500/10"}`}>
              <Euro className={`w-5 h-5 ${stats.overduePayments > 0 ? "text-red-500" : "text-amber-500"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overduePayments}</p>
              <p className="text-xs text-muted-foreground">Pagamenti scaduti</p>
            </div>
          </div>
        </Card>
        
        <Card className={`p-4 ${stats.overdueTasks > 0 ? "border-red-500/50 bg-red-50 dark:bg-red-950/20" : ""}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.overdueTasks > 0 ? "bg-red-500/10" : "bg-blue-500/10"}`}>
              <CheckSquare className={`w-5 h-5 ${stats.overdueTasks > 0 ? "text-red-500" : "text-blue-500"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.overdueTasks}</p>
              <p className="text-xs text-muted-foreground">Task scaduti</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {format(currentDate, viewMode === "month" ? "MMMM yyyy" : "'Settimana del' d MMMM yyyy", { locale: it })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Oggi
              </Button>
              <Button variant="outline" size="icon" onClick={goToPrev}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className={`grid grid-cols-7 gap-1 ${viewMode === "week" ? "min-h-[300px]" : ""}`}>
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[100px] p-1 border rounded-lg transition-colors cursor-pointer
                    ${isCurrentMonth ? "bg-card hover:bg-muted/50" : "bg-muted/30 hover:bg-muted/50"}
                    ${isCurrentDay ? "ring-2 ring-primary" : "border-border"}
                    ${viewMode === "week" ? "min-h-[250px]" : ""}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1 px-1
                    ${isCurrentDay ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"}
                  `}>
                    {format(day, "d")}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayEvents.slice(0, viewMode === "week" ? 10 : 3).map((event) => (
                      <HoverCard key={event.id} openDelay={200}>
                        <HoverCardTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                            className={`
                              w-full text-left text-xs px-1.5 py-0.5 rounded truncate
                              text-white flex items-center gap-1
                              ${getEventColor(event)}
                              hover:opacity-80 transition-opacity
                            `}
                          >
                            {getEventIcon(event.type)}
                            <span className="truncate">{event.title}</span>
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-72" side="right">
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <Badge variant={
                                event.type === "appointment" ? "default" :
                                event.type === "payment" ? "secondary" : "outline"
                              }>
                                {event.type === "appointment" ? "Appuntamento" :
                                 event.type === "payment" ? "Pagamento" : "Task"}
                              </Badge>
                              {event.status && (
                                <Badge variant="outline" className="text-xs">
                                  {event.status}
                                </Badge>
                              )}
                            </div>
                            
                            <h4 className="font-semibold">{event.title}</h4>
                            
                            {event.vendorName && (
                              <p className="text-sm text-muted-foreground">
                                🏢 {event.vendorName}
                              </p>
                            )}
                            
                            {event.time && (
                              <p className="text-sm flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {event.time}
                              </p>
                            )}
                            
                            {event.location && (
                              <p className="text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                              </p>
                            )}
                            
                            {event.amount && (
                              <p className="text-sm font-semibold">
                                {formatCurrency(event.amount)}
                              </p>
                            )}
                            
                            {event.priority && (
                              <Badge variant={
                                event.priority === "must" ? "destructive" :
                                event.priority === "should" ? "default" : "secondary"
                              }>
                                {event.priority.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                    
                    {dayEvents.length > (viewMode === "week" ? 10 : 3) && (
                      <div className="text-xs text-muted-foreground px-1">
                        +{dayEvents.length - (viewMode === "week" ? 10 : 3)} altri
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-violet-500" />
          <span>Appuntamenti</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Task</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span>Pagamenti</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Completati/Pagati</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Scaduti</span>
        </div>
      </div>

      {/* Day Preview Dialog */}
      <Dialog open={dayPreviewOpen} onOpenChange={setDayPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {previewDate && format(previewDate, "EEEE d MMMM yyyy", { locale: it })}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            {previewEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nessun evento per questa giornata</p>
              </div>
            ) : (
              <div className="space-y-3">
                {previewEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => { setDayPreviewOpen(false); handleEventClick(event); }}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg text-white ${getEventColor(event)}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={
                            event.type === "appointment" ? "default" :
                            event.type === "payment" ? "secondary" : "outline"
                          } className="text-xs">
                            {event.type === "appointment" ? "Appuntamento" :
                             event.type === "payment" ? "Pagamento" : "Task"}
                          </Badge>
                          {event.status && (
                            <Badge variant="outline" className="text-xs">
                              {event.status}
                            </Badge>
                          )}
                        </div>
                        
                        <h4 className="font-medium truncate">{event.title}</h4>
                        
                        {event.vendorName && (
                          <p className="text-sm text-muted-foreground mt-1">
                            🏢 {event.vendorName}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          {event.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {event.time}
                            </span>
                          )}
                          
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                          
                          {event.amount && (
                            <span className="font-semibold text-foreground">
                              {formatCurrency(event.amount)}
                            </span>
                          )}
                        </div>
                        
                        {event.priority && (
                          <Badge 
                            variant={
                              event.priority === "must" ? "destructive" :
                              event.priority === "should" ? "default" : "secondary"
                            }
                            className="mt-2"
                          >
                            {event.priority.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handleCreateFromPreview}>
              <Plus className="w-4 h-4 mr-1" />
              Aggiungi evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      {weddingId && (
        <CalendarCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          weddingId={weddingId}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

export default Calendar;
