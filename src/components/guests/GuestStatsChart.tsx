import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarHeart, UserCheck } from "lucide-react";
import { useState } from "react";

interface RsvpStats {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  plusOnes?: number;
  potentialPlusOnes?: number;
}

interface StdStats {
  total: number;
  likelyYes: number;
  unsure: number;
  likelyNo: number;
  noResponse: number;
}

interface GuestStatsChartProps {
  stats: RsvpStats;
  stdStats?: StdStats;
}

type ViewMode = 'rsvp' | 'std';

export const GuestStatsChart = ({ stats, stdStats }: GuestStatsChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('rsvp');

  // RSVP chart data
  const rsvpChartData = [
    { name: "Confermati", value: stats.confirmed, color: "hsl(var(--chart-2))" },
    { name: "In Attesa", value: stats.pending, color: "hsl(var(--chart-3))" },
    { name: "Rifiutati", value: stats.declined, color: "hsl(var(--chart-1))" },
  ].filter(item => item.value > 0);

  // STD chart data
  const stdChartData = stdStats ? [
    { name: "Probabile Sì", value: stdStats.likelyYes, color: "hsl(142.1 76.2% 36.3%)" },
    { name: "Incerto", value: stdStats.unsure, color: "hsl(45 93% 47%)" },
    { name: "Probabile No", value: stdStats.likelyNo, color: "hsl(346.8 77.2% 49.8%)" },
    { name: "Nessuna Risposta", value: stdStats.noResponse, color: "hsl(var(--muted-foreground))" },
  ].filter(item => item.value > 0) : [];

  const chartData = viewMode === 'rsvp' ? rsvpChartData : stdChartData;
  const hasData = viewMode === 'rsvp' ? stats.total > 0 : (stdStats?.total || 0) > 0;

  return (
    <Card className="p-6">
      {/* View Mode Toggle - only show if stdStats provided */}
      {stdStats && (
        <div className="flex justify-center mb-4">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="bg-muted p-1 rounded-lg"
          >
            <ToggleGroupItem 
              value="std" 
              className="gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
            >
              <CalendarHeart className="w-4 h-4" />
              <span className="text-sm">Save The Date</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="rsvp" 
              className="gap-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-sm">Conferma RSVP</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
        {/* Chart */}
        <div className="h-[280px] md:h-[300px]">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={50}
                  formatter={(value) => <span className="text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-dashed border-muted-foreground/20 flex items-center justify-center">
                  <span className="text-4xl">👥</span>
                </div>
                <p className="text-sm">Nessun dato disponibile</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats List */}
        <div className="space-y-3 md:min-w-[200px]">
          {viewMode === 'rsvp' ? (
            <>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Totale Invitati</p>
                {(stats.plusOnes ?? 0) > 0 || (stats.potentialPlusOnes ?? 0) > 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {(stats.plusOnes ?? 0) > 0 && (
                      <span className="text-purple-600">+1 confermati: {stats.plusOnes}</span>
                    )}
                    {(stats.plusOnes ?? 0) > 0 && (stats.potentialPlusOnes ?? 0) > 0 && (
                      <span className="text-muted-foreground"> · </span>
                    )}
                    {(stats.potentialPlusOnes ?? 0) > 0 && (
                      <span className="text-muted-foreground/70">+1 potenziali: {stats.potentialPlusOnes}</span>
                    )}
                  </p>
                ) : null}
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-chart-2" />
                    Confermati
                  </span>
                  <span className="font-semibold">{stats.confirmed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-chart-3" />
                    In Attesa
                  </span>
                  <span className="font-semibold">{stats.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-chart-1" />
                    Rifiutati
                  </span>
                  <span className="font-semibold">{stats.declined}</span>
                </div>
              </div>
            </>
          ) : stdStats && (
            <>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stdStats.total}</p>
                <p className="text-sm text-muted-foreground">Totale Invitati</p>
                <p className="text-xs text-muted-foreground">
                  Risposte al Save The Date
                </p>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142.1 76.2% 36.3%)" }} />
                    Probabile Sì
                  </span>
                  <span className="font-semibold">{stdStats.likelyYes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(45 93% 47%)" }} />
                    Incerto
                  </span>
                  <span className="font-semibold">{stdStats.unsure}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(346.8 77.2% 49.8%)" }} />
                    Probabile No
                  </span>
                  <span className="font-semibold">{stdStats.likelyNo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-muted-foreground/50" />
                    Nessuna Risposta
                  </span>
                  <span className="font-semibold">{stdStats.noResponse}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
