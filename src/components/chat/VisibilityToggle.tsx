import { Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface VisibilityToggleProps {
  visibility: "couple" | "all";
  onChange: (v: "couple" | "all") => void;
  plannerName?: string;
}

export function VisibilityToggle({ visibility, onChange, plannerName }: VisibilityToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => onChange("couple")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          visibility === "couple"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Lock className="w-3 h-3" />
        Solo tra noi
      </button>
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          visibility === "all"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Users className="w-3 h-3" />
        {plannerName ? `Condividi con ${plannerName}` : "Condividi con Planner"}
      </button>
    </div>
  );
}
