import { Button } from "@/components/ui/button";
import { CalendarPlus, X } from "lucide-react";

interface FollowUpToastProps {
  taskTitle: string;
  onCreateFollowUp: () => void;
  onDismiss: () => void;
}

export function FollowUpToast({ taskTitle, onCreateFollowUp, onDismiss }: FollowUpToastProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span className="text-sm">
          <strong>Task completato!</strong>
          <br />
          <span className="text-muted-foreground">Vuoi programmare un follow-up?</span>
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          className="flex-1"
        >
          <X className="h-3 w-3 mr-1" />
          No, grazie
        </Button>
        <Button
          size="sm"
          onClick={onCreateFollowUp}
          className="flex-1"
        >
          <CalendarPlus className="h-3 w-3 mr-1" />
          Sì, crea
        </Button>
      </div>
    </div>
  );
}
