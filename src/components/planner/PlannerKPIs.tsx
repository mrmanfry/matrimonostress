import { Card } from "@/components/ui/card";
import { CalendarDays, CreditCard, AlertTriangle, Heart } from "lucide-react";
import { WeddingContext } from "@/contexts/AuthContext";

interface PlannerKPIsProps {
  weddings: WeddingContext[];
  urgentTasksCount: number;
  upcomingPaymentsCount: number;
}

export function PlannerKPIs({ weddings, urgentTasksCount, upcomingPaymentsCount }: PlannerKPIsProps) {
  const now = new Date();
  const activeWeddings = weddings.filter(w => new Date(w.weddingDate) >= now);
  
  const nextWedding = activeWeddings.length > 0
    ? activeWeddings.reduce((closest, w) => {
        const d = new Date(w.weddingDate).getTime() - now.getTime();
        const cd = new Date(closest.weddingDate).getTime() - now.getTime();
        return d < cd ? w : closest;
      })
    : null;

  const nextDays = nextWedding
    ? Math.ceil((new Date(nextWedding.weddingDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const kpis = [
    {
      label: "Matrimoni attivi",
      value: activeWeddings.length,
      icon: Heart,
      color: "text-accent-foreground",
      bg: "bg-accent",
    },
    {
      label: "Prossimo evento",
      value: nextDays !== null ? `${nextDays}g` : "—",
      subtitle: nextWedding ? `${nextWedding.partner1Name} & ${nextWedding.partner2Name}` : undefined,
      icon: CalendarDays,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Pagamenti in scadenza",
      value: upcomingPaymentsCount,
      icon: CreditCard,
      color: upcomingPaymentsCount > 0 ? "text-[hsl(var(--status-urgent))]" : "text-muted-foreground",
      bg: upcomingPaymentsCount > 0 ? "bg-[hsl(var(--status-urgent))]/10" : "bg-muted/20",
    },
    {
      label: "Task urgenti",
      value: urgentTasksCount,
      icon: AlertTriangle,
      color: urgentTasksCount > 0 ? "text-[hsl(var(--status-overdue))]" : "text-muted-foreground",
      bg: urgentTasksCount > 0 ? "bg-[hsl(var(--status-overdue))]/10" : "bg-muted/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${kpi.bg} shrink-0`}>
              <Icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{kpi.label}</p>
              {kpi.subtitle && (
                <p className="text-[10px] text-muted-foreground truncate">{kpi.subtitle}</p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
