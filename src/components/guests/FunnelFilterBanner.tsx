import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  Mail, 
  CheckCircle, 
  XCircle,
  X,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FunnelFilterBannerProps {
  funnelFilter: string;
  visibleCount: number;
  onClear: () => void;
}

const FUNNEL_META: Record<string, { 
  label: string; 
  description: string;
  icon: typeof FileText; 
  color: string; 
  bg: string;
  border: string;
}> = {
  draft: {
    label: "Da Contattare",
    description: "Invitati per cui non hai ancora inviato nessuna comunicazione.",
    icon: FileText,
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    border: "border-slate-200 dark:border-slate-800",
  },
  std_sent: {
    label: "Save the Date inviato",
    description: "Hanno ricevuto il Save the Date ma non ancora l'invito formale.",
    icon: Calendar,
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
  },
  invited: {
    label: "Invito formale inviato — in attesa di risposta",
    description: "Hai inviato l'invito ufficiale ma non hanno ancora confermato né rifiutato.",
    icon: Mail,
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  confirmed: {
    label: "Confermati",
    description: "Hanno confermato la partecipazione.",
    icon: CheckCircle,
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-800",
  },
  declined: {
    label: "Non vengono",
    description: "Hanno rifiutato l'invito.",
    icon: XCircle,
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
  },
};

export function FunnelFilterBanner({ funnelFilter, visibleCount, onClear }: FunnelFilterBannerProps) {
  const meta = FUNNEL_META[funnelFilter];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <Card className={cn("p-3 md:p-4 border-2", meta.bg, meta.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg bg-background/60 flex-shrink-0", meta.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Filtro funnel attivo
            </span>
            <Badge variant="secondary" className="text-xs">
              {visibleCount} {visibleCount === 1 ? "elemento" : "elementi"}
            </Badge>
          </div>
          <h3 className={cn("font-semibold text-sm md:text-base mt-1", meta.color)}>
            {meta.label}
          </h3>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            {meta.description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="flex-shrink-0 h-8 gap-1"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Rimuovi filtro</span>
        </Button>
      </div>
    </Card>
  );
}
