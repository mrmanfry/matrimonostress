import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Utensils, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { useGuestMetrics } from "@/hooks/useGuestMetrics";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GuestSummaryWidgetProps {
  stats: {
    guestsTotal: number;
    adultsTotal: number;
    childrenTotal: number;
    guestsConfirmed: number;
    guestsPending: number;
    guestsDeclined: number;
  };
  onClick: () => void;
}

export function GuestSummaryWidget({ stats, onClick }: GuestSummaryWidgetProps) {
  const metrics = useGuestMetrics();
  const isMobile = useIsMobile();

  // Pie chart data for RSVP - usando i dati unificati dal hook
  const rsvpChartData = [
    { name: "Confermati", value: metrics.confirmedHeadCount || stats.guestsConfirmed, color: "#10b981" },
    { name: "In attesa", value: metrics.pendingHeadCount || stats.guestsPending, color: "#3b82f6" },
    { name: "Rifiutati", value: metrics.declinedHeadCount || stats.guestsDeclined, color: "#6b7280" },
  ];

  return (
    <Card 
      className="p-4 md:p-6 hover:shadow-elegant transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h3 className="text-lg md:text-xl font-semibold">Riepilogo Invitati</h3>
        </div>
        {metrics.unclassifiedCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {metrics.unclassifiedCount} incompleti
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ci sono {metrics.unclassifiedCount} ospiti con dati incompleti</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-6">
        {/* Numeri Principali - usando metriche unificate */}
        <div className="text-center">
          <div className="text-4xl md:text-5xl font-bold text-primary mb-1">
            {metrics.estimatedMaxHeadCount || stats.guestsTotal}
          </div>
          <div className="text-sm text-muted-foreground mb-1">Coperti Stimati</div>
          <div className="text-xs text-muted-foreground mb-4">
            ({metrics.totalInvitations} inviti{metrics.plusOnesPotential > 0 && ` + ${metrics.plusOnesPotential} +1 potenziali`})
          </div>
          
          <div className="grid grid-cols-4 gap-1.5 md:gap-2 max-w-md mx-auto">
            <div className="p-1.5 md:p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="text-lg md:text-xl font-bold text-blue-600">
                {metrics.adultsCount || stats.adultsTotal}
              </div>
              <div className="text-xs text-muted-foreground">Adulti</div>
            </div>
            <div className="p-1.5 md:p-2 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <div className="text-lg md:text-xl font-bold text-purple-600">
                {metrics.childrenCount || stats.childrenTotal}
              </div>
              <div className="text-xs text-muted-foreground">Bambini</div>
            </div>
            <div className="p-1.5 md:p-2 rounded-lg bg-pink-50 dark:bg-pink-950/20">
              <div className="text-lg md:text-xl font-bold text-pink-600">
                {metrics.coupleCount}
              </div>
              <div className="text-xs text-muted-foreground">Sposi</div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1.5 md:p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 cursor-help">
                    <div className="flex items-center justify-center gap-1">
                      <Utensils className="w-3 h-3 text-amber-600" />
                      <span className="text-lg md:text-xl font-bold text-amber-600">
                        {metrics.staffCount}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">Staff</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pasti per lo staff dei fornitori</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Plus ones indicator */}
          {metrics.plusOnesConfirmed > 0 && (
            <div className="mt-3 text-xs text-muted-foreground">
              <span className="text-green-600">
                {metrics.plusOnesConfirmed} +1 già confermati
              </span>
            </div>
          )}
        </div>

        {/* Stato RSVP */}
        <div>
          <h4 className="text-sm font-semibold mb-3 text-center">Stato Conferme</h4>
          {isMobile ? (
            <>
              {/* Barra orizzontale compatta */}
              <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                {rsvpChartData.map((entry, index) => {
                  const total = rsvpChartData.reduce((s, e) => s + e.value, 0);
                  const pct = total > 0 ? (entry.value / total) * 100 : 0;
                  return pct > 0 ? (
                    <div
                      key={index}
                      className="h-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: entry.color }}
                    />
                  ) : null;
                })}
              </div>
              {/* Label compatte */}
              <div className="grid grid-cols-3 gap-1 mt-2">
                {rsvpChartData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-[11px] text-foreground/70 font-medium">{entry.value}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rsvpChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {rsvpChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend 
                    verticalAlign="bottom" 
                    height={40}
                    formatter={(value, entry: any) => (
                      <span className="text-xs">
                        {value}: <strong>{entry.payload.value}</strong>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
