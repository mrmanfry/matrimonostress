import { UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DelegatedBadgeProps {
  plannerName?: string;
  compact?: boolean;
}

export function DelegatedBadge({ plannerName, compact = false }: DelegatedBadgeProps) {
  if (compact) {
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] px-1.5 py-0 gap-0.5">
        <UserCheck className="w-3 h-3" />
        Planner
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs gap-1">
      <UserCheck className="w-3 h-3" />
      {plannerName ? `Assegnato da ${plannerName}` : "Richiesto dal Planner"}
    </Badge>
  );
}
