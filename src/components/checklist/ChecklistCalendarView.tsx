import { useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { it } from "date-fns/locale";
import { CheckCircle, Circle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority?: string;
}

interface ChecklistCalendarViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

export function ChecklistCalendarView({ tasks, onTaskClick }: ChecklistCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Tasks grouped by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = task.due_date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return tasksByDate[dateKey] || [];
  }, [selectedDate, tasksByDate]);

  // Days with tasks for highlighting
  const daysWithTasks = useMemo(() => {
    return Object.keys(tasksByDate).map((date) => new Date(date));
  }, [tasksByDate]);

  // Check if a date has overdue tasks
  const hasOverdueTasks = (date: Date): boolean => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dateTasks = tasksByDate[dateKey];
    if (!dateTasks) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today && dateTasks.some((t) => t.status === "pending");
  };

  // Check if a date has pending tasks
  const hasPendingTasks = (date: Date): boolean => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dateTasks = tasksByDate[dateKey];
    return dateTasks?.some((t) => t.status === "pending") || false;
  };

  // Check if a date has completed tasks only
  const hasOnlyCompletedTasks = (date: Date): boolean => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dateTasks = tasksByDate[dateKey];
    return dateTasks?.length > 0 && dateTasks.every((t) => t.status === "completed");
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "must":
        return "bg-destructive text-destructive-foreground";
      case "should":
        return "bg-orange-500 text-white";
      case "could":
        return "bg-blue-500 text-white";
      case "wont":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case "must":
        return "Must";
      case "should":
        return "Should";
      case "could":
        return "Could";
      case "wont":
        return "Won't";
      default:
        return "Medium";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="p-4 lg:col-span-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          locale={it}
          className="w-full pointer-events-auto"
          modifiers={{
            hasOverdue: (date) => hasOverdueTasks(date),
            hasPending: (date) => hasPendingTasks(date) && !hasOverdueTasks(date),
            hasCompleted: (date) => hasOnlyCompletedTasks(date),
          }}
          modifiersStyles={{
            hasOverdue: {
              backgroundColor: "hsl(var(--destructive) / 0.15)",
              borderRadius: "50%",
            },
            hasPending: {
              backgroundColor: "hsl(var(--accent) / 0.3)",
              borderRadius: "50%",
            },
            hasCompleted: {
              backgroundColor: "hsl(142 76% 36% / 0.15)",
              borderRadius: "50%",
            },
          }}
          components={{
            DayContent: ({ date }) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const dayTasks = tasksByDate[dateKey];
              const taskCount = dayTasks?.length || 0;

              return (
                <div className="relative w-full h-full flex items-center justify-center">
                  <span>{date.getDate()}</span>
                  {taskCount > 0 && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground">
                      {taskCount}
                    </span>
                  )}
                </div>
              );
            },
          }}
        />

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-destructive/15" />
            <span className="text-muted-foreground">Scaduti</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-accent/30" />
            <span className="text-muted-foreground">In sospeso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "hsl(142 76% 36% / 0.15)" }} />
            <span className="text-muted-foreground">Completati</span>
          </div>
        </div>
      </Card>

      {/* Selected date tasks */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">
          {selectedDate
            ? format(selectedDate, "d MMMM yyyy", { locale: it })
            : "Seleziona una data"}
        </h3>

        {selectedDate ? (
          selectedDateTasks.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedDateTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task.id)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent/10 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {task.status === "completed" ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    ) : hasOverdueTasks(selectedDate) ? (
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "font-medium truncate",
                          task.status === "completed" && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <Badge className={cn("shrink-0 text-xs", getPriorityColor(task.priority))}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nessun task programmato per questa data.
            </p>
          )
        ) : (
          <p className="text-muted-foreground text-sm">
            Clicca su una data nel calendario per vedere i task programmati.
          </p>
        )}
      </Card>
    </div>
  );
}
