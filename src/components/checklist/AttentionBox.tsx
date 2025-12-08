import { AlertTriangle, Calendar, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  priority?: string;
  status: string;
}

interface AttentionBoxProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

const getPriorityColor = (priority: string | undefined) => {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-muted-foreground';
  }
};

const getPriorityLabel = (priority: string | undefined) => {
  switch (priority) {
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Bassa';
    default: return 'Media';
  }
};

export function AttentionBox({ tasks, onTaskClick }: AttentionBoxProps) {
  // Filter: overdue OR high priority due within 3 days
  const attentionTasks = tasks.filter(task => {
    if (task.status === 'completed') return false;
    
    const daysUntilDue = task.due_date 
      ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    // Overdue tasks
    if (daysUntilDue !== null && daysUntilDue < 0) return true;
    
    // High priority tasks due within 3 days
    if (task.priority === 'high' && daysUntilDue !== null && daysUntilDue <= 3) return true;
    
    return false;
  });

  if (attentionTasks.length === 0) return null;

  return (
    <Card className="p-4 border-destructive/50 bg-destructive/5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="font-semibold text-destructive">Richiede Attenzione</h3>
        <Badge variant="destructive" className="ml-auto">
          {attentionTasks.length}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {attentionTasks.slice(0, 5).map(task => {
          const daysUntilDue = task.due_date 
            ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : null;
          const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
          
          return (
            <div 
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className="flex items-center gap-3 p-2 rounded-lg bg-background/80 hover:bg-background cursor-pointer transition-colors"
            >
              <Circle className={`w-2.5 h-2.5 ${getPriorityColor(task.priority)} rounded-full`} />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
              </div>
              
              {task.due_date && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3 h-3" />
                  {isOverdue ? (
                    <span className="text-destructive font-medium">
                      Scaduto {Math.abs(daysUntilDue!)}g fa
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">
                      Tra {daysUntilDue}g
                    </span>
                  )}
                </div>
              )}
              
              <Badge 
                variant="outline" 
                className={`text-xs ${task.priority === 'high' ? 'border-red-500 text-red-600' : ''}`}
              >
                {getPriorityLabel(task.priority)}
              </Badge>
            </div>
          );
        })}
        
        {attentionTasks.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            + altri {attentionTasks.length - 5} task che richiedono attenzione
          </p>
        )}
      </div>
    </Card>
  );
}
