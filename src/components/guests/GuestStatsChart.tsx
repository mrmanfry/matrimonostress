import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";

interface GuestStatsChartProps {
  stats: {
    total: number;
    confirmed: number;
    pending: number;
    declined: number;
    plusOnes?: number;
  };
}

export const GuestStatsChart = ({ stats }: GuestStatsChartProps) => {
  const chartData = [
    { name: "Confermati", value: stats.confirmed, color: "hsl(142.1 76.2% 36.3%)" },
    { name: "In Attesa", value: stats.pending, color: "hsl(24.6 95% 53.1%)" },
    { name: "Rifiutati", value: stats.declined, color: "hsl(346.8 77.2% 49.8%)" },
  ].filter(item => item.value > 0);

  const hasData = stats.total > 0;

  return (
    <Card className="p-6">
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
          <div className="space-y-1">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">
              Totale Invitati
              {stats.plusOnes && stats.plusOnes > 0 && (
                <span className="text-purple-600 ml-1">(incl. {stats.plusOnes} +1)</span>
              )}
            </p>
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
        </div>
      </div>
    </Card>
  );
};
