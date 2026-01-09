import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Circle, Calendar, ListTodo, Plus } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/checklist/PriorityBadge";

interface ChecklistTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  priority?: string;
}

interface VendorChecklistWidgetProps {
  vendorId: string;
  onCreateTask?: () => void;
}

export function VendorChecklistWidget({ vendorId, onCreateTask }: VendorChecklistWidgetProps) {
  const queryClient = useQueryClient();

  // Fetch tasks linked to this vendor
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["vendor-checklist", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_tasks")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("due_date", { ascending: true });
      
      if (error) throw error;
      return data as ChecklistTask[];
    },
  });

  // Toggle task completion
  const toggleMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("checklist_tasks")
        .update({ status: newStatus })
        .eq("id", taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-checklist", vendorId] });
      toast.success("Stato aggiornato");
    },
    onError: (error) => {
      toast.error("Errore nell'aggiornamento: " + error.message);
    },
  });

  const handleToggleTask = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    toggleMutation.mutate({ taskId, newStatus });
  };

  const completedCount = tasks.filter(t => t.status === "completed").length;
  const pendingCount = tasks.length - completedCount;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="h-20 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-indigo-600" />
            Checklist Dedicata
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Attività specifiche per questo fornitore
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
            {completedCount}/{tasks.length} completate
          </Badge>
          {onCreateTask && (
            <Button 
              size="sm" 
              onClick={onCreateTask}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Crea Task
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <ListTodo className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <div>
              <p className="text-muted-foreground font-medium">Nessuna attività collegata</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crea task specifici per questo fornitore
              </p>
            </div>
            {onCreateTask && (
              <Button variant="outline" size="sm" onClick={onCreateTask}>
                <Plus className="w-4 h-4 mr-2" />
                Crea Task
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = task.status === "completed";
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;
              
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:border-indigo-200 transition-colors group"
                >
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => handleToggleTask(task.id, task.status)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </p>
                      <PriorityBadge priority={task.priority} size="sm" />
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 mt-2">
                      {task.due_date && (
                        <div
                          className={`flex items-center gap-1 text-xs font-medium ${
                            isOverdue
                              ? "text-destructive"
                              : isCompleted
                              ? "text-muted-foreground"
                              : "text-amber-600"
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>
                            {isOverdue && "Scaduta: "}
                            {new Date(task.due_date).toLocaleDateString("it-IT", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      )}
                      
                      {task.assigned_to && (
                        <Badge variant="outline" className="text-xs">
                          {task.assigned_to}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
