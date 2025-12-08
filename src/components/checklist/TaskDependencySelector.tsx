import { Lock, Unlock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  title: string;
  status: string;
}

interface TaskDependencySelectorProps {
  currentTaskId: string;
  blockedByTaskId: string | null;
  allTasks: Task[];
  onUpdate: (blockedByTaskId: string | null) => Promise<void>;
}

export function TaskDependencySelector({
  currentTaskId,
  blockedByTaskId,
  allTasks,
  onUpdate,
}: TaskDependencySelectorProps) {
  // Filter out current task and already completed tasks
  const availableTasks = allTasks.filter(
    (t) => t.id !== currentTaskId && t.status !== "completed"
  );

  const blockingTask = blockedByTaskId
    ? allTasks.find((t) => t.id === blockedByTaskId)
    : null;

  const handleChange = async (value: string) => {
    if (value === "none") {
      await onUpdate(null);
    } else {
      await onUpdate(value);
    }
  };

  const handleRemove = async () => {
    await onUpdate(null);
  };

  // If blocked, show the blocking task
  if (blockingTask) {
    const isBlockingTaskCompleted = blockingTask.status === "completed";

    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Dipendenza
        </Label>
        <div
          className={`flex items-center gap-2 p-2 rounded-lg border ${
            isBlockingTaskCompleted
              ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
              : "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
          }`}
        >
          {isBlockingTaskCompleted ? (
            <Unlock className="w-4 h-4 text-green-600" />
          ) : (
            <Lock className="w-4 h-4 text-amber-600" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Dipende da:</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span
                className={`text-sm font-medium truncate ${
                  isBlockingTaskCompleted ? "line-through text-muted-foreground" : ""
                }`}
              >
                {blockingTask.title}
              </span>
            </div>
            {!isBlockingTaskCompleted && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Completa prima il task padre
              </p>
            )}
            {isBlockingTaskCompleted && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                Sbloccato! Puoi procedere
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-7 px-2 text-xs"
          >
            Rimuovi
          </Button>
        </div>
      </div>
    );
  }

  // Show selector for adding dependency
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        <Lock className="w-3 h-3" />
        Aggiungi Dipendenza
      </Label>
      {availableTasks.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nessun altro task disponibile
        </p>
      ) : (
        <Select value="" onValueChange={handleChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Questo task dipende da..." />
          </SelectTrigger>
          <SelectContent>
            {availableTasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                <span className="truncate">{task.title}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="text-xs text-muted-foreground">
        Il task sarà "bloccato" finché il task padre non viene completato
      </p>
    </div>
  );
}

// Visual indicator for blocked tasks in the list
export function BlockedIndicator({
  blockedByTaskId,
  allTasks,
}: {
  blockedByTaskId: string | null;
  allTasks: Task[];
}) {
  if (!blockedByTaskId) return null;

  const blockingTask = allTasks.find((t) => t.id === blockedByTaskId);
  if (!blockingTask) return null;

  const isUnlocked = blockingTask.status === "completed";

  return (
    <Badge
      variant="outline"
      className={`text-xs gap-1 ${
        isUnlocked
          ? "border-green-300 text-green-600 bg-green-50 dark:bg-green-900/20"
          : "border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-900/20"
      }`}
    >
      {isUnlocked ? (
        <Unlock className="w-3 h-3" />
      ) : (
        <Lock className="w-3 h-3" />
      )}
      {isUnlocked ? "Sbloccato" : "Bloccato"}
    </Badge>
  );
}
