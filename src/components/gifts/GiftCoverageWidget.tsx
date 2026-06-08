import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GiftForecast } from '@/hooks/useGifts';

interface Props {
  forecast: GiftForecast;
  isPrivate: boolean;
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const mask = (n: number, priv: boolean) => (priv ? '***€' : fmt(n));

export function GiftCoverageWidget({ forecast, isPrivate }: Props) {
  const { total_cash_received, total_forecast, total_expenses, net_budget_coverage } = forecast;
  const total = total_cash_received + total_forecast;

  const coverageColor =
    net_budget_coverage >= 100 ? '#22c55e' :
    net_budget_coverage >= 60  ? '#eab308' :
                                  '#ef4444';

  const chartData = [
    {
      name: 'Budget',
      cash: total_cash_received,
      forecast: total_forecast,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Copertura Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI principale */}
        <div className="text-center">
          <div
            className="text-4xl font-bold tabular-nums"
            style={{ color: coverageColor }}
          >
            {isPrivate ? '***%' : `${net_budget_coverage}%`}
          </div>
          <p className="text-sm text-muted-foreground mt-1">copertura del budget totale</p>
        </div>

        {/* Stacked bar */}
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <XAxis type="number" hide domain={[0, Math.max(total_expenses * 1.1, total + 1)]} />
              <YAxis type="category" hide />
              <Tooltip
                formatter={(value: number, name: string) => [
                  isPrivate ? '***€' : fmt(value),
                  name === 'cash' ? 'Incassato' : 'Stimato',
                ]}
              />
              <Bar dataKey="cash" stackId="a" fill="#22c55e" radius={[4, 0, 0, 4]} name="cash" />
              <Bar dataKey="forecast" stackId="a" fill="#fde047" radius={[0, 4, 4, 0]} opacity={0.8} name="forecast" />
              {total_expenses > 0 && (
                <ReferenceLine x={total_expenses} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-500" />
              <span className="text-muted-foreground">Incassato</span>
            </div>
            <div className="font-semibold tabular-nums">{mask(total_cash_received, isPrivate)}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-yellow-300" />
              <span className="text-muted-foreground">Stimato</span>
            </div>
            <div className="font-semibold tabular-nums">{mask(total_forecast, isPrivate)}</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="inline-block w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-muted-foreground">Budget</span>
            </div>
            <div className="font-semibold tabular-nums">{mask(total_expenses, isPrivate)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
