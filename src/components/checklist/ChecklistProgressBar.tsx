import { useMemo } from "react";
import { Card } from "@/components/ui/card";

interface ChecklistProgressBarProps {
  completed: number;
  pending: number;
  overdue: number;
}

export function ChecklistProgressBar({ completed, pending, overdue }: ChecklistProgressBarProps) {
  const total = completed + pending + overdue;
  
  const percentages = useMemo(() => {
    if (total === 0) return { completed: 0, pending: 0, overdue: 0 };
    return {
      completed: (completed / total) * 100,
      pending: ((pending - overdue) / total) * 100, // pending without overdue
      overdue: (overdue / total) * 100,
    };
  }, [completed, pending, overdue, total]);

  if (total === 0) {
    return (
      <Card className="p-4">
        <div className="text-center text-muted-foreground text-sm">
          Nessun task nella checklist
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Progresso Checklist</span>
        <span className="text-muted-foreground">
          {completed} di {total} completati ({Math.round(percentages.completed)}%)
        </span>
      </div>
      
      {/* Segmented Progress Bar */}
      <div className="h-4 rounded-full bg-muted overflow-hidden flex">
        {percentages.completed > 0 && (
          <div 
            className="h-full bg-green-500 transition-all duration-500 ease-out"
            style={{ width: `${percentages.completed}%` }}
            title={`${completed} completati`}
          />
        )}
        {percentages.pending > 0 && (
          <div 
            className="h-full bg-muted-foreground/30 transition-all duration-500 ease-out"
            style={{ width: `${percentages.pending}%` }}
            title={`${pending - overdue} in corso`}
          />
        )}
        {percentages.overdue > 0 && (
          <div 
            className="h-full bg-destructive transition-all duration-500 ease-out"
            style={{ width: `${percentages.overdue}%` }}
            title={`${overdue} scaduti`}
          />
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Completati ({completed})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
          <span>In corso ({pending - overdue})</span>
        </div>
        {overdue > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>Scaduti ({overdue})</span>
          </div>
        )}
      </div>
    </Card>
  );
}
