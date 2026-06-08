// src/components/gifts/GiftCoverageWidget.tsx — RESTYLED (paper tokens, Fraunces, soft palette)
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { GiftForecast } from '@/hooks/useGifts';

interface Props {
  forecast: GiftForecast;
  isPrivate: boolean;
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const mask = (n: number, priv: boolean) => (priv ? '***€' : fmt(n));

// Soft palette aligned to the WedsApp "paper" system
const C_CASH = 'hsl(142 71% 29%)';   // --paper-success
const C_FORECAST = 'hsl(39 48% 47%)'; // --paper-gold
const C_BUDGET = 'hsl(0 73% 41%)';    // --paper-danger

function PaperCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'hsl(var(--paper-surface))',
      border: '1px solid hsl(var(--paper-border))',
      borderRadius: 14,
      boxShadow: '0 1px 2px hsl(24 14% 15% / 0.04)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 0' }}>
        <h2 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 17, letterSpacing: '-0.01em', color: 'hsl(var(--paper-ink))' }}>
          {title}
        </h2>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

export function GiftCoverageWidget({ forecast, isPrivate }: Props) {
  const { total_cash_received, total_forecast, total_expenses, net_budget_coverage } = forecast;
  const total = total_cash_received + total_forecast;

  // Coverage uses the same restrained semantic colors as the rest of the app
  const coverageColor =
    net_budget_coverage >= 100 ? C_CASH :
    net_budget_coverage >= 60  ? C_FORECAST :
                                  C_BUDGET;

  const chartData = [{ name: 'Budget', cash: total_cash_received, forecast: total_forecast }];

  return (
    <PaperCard title="Copertura Budget">
      <div style={{ display: 'grid', gap: 18 }}>
        {/* KPI principale — Fraunces, grande */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 44, lineHeight: 1, letterSpacing: '-0.02em', color: coverageColor }}>
            {isPrivate ? '***%' : `${net_budget_coverage}%`}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'hsl(var(--paper-ink-3))' }}>
            copertura del budget totale
          </p>
        </div>

        {/* Stacked bar — su superficie incassata (sunk) */}
        <div style={{ height: 56, background: 'hsl(var(--paper-sunk))', borderRadius: 10, padding: '8px 10px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 6, bottom: 0, left: 0 }}>
              <XAxis type="number" hide domain={[0, Math.max(total_expenses * 1.1, total + 1)]} />
              <YAxis type="category" hide />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: 10, border: '1px solid hsl(var(--paper-border))', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                formatter={(value: number, name: string) => [
                  isPrivate ? '***€' : fmt(value),
                  name === 'cash' ? 'Incassato' : 'Stimato',
                ]}
              />
              <Bar dataKey="cash" stackId="a" fill={C_CASH} radius={[6, 0, 0, 6]} name="cash" />
              <Bar dataKey="forecast" stackId="a" fill={C_FORECAST} radius={[0, 6, 6, 0]} opacity={0.55} name="forecast" />
              {total_expenses > 0 && (
                <ReferenceLine x={total_expenses} stroke={C_BUDGET} strokeWidth={2} strokeDasharray="4 3" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, textAlign: 'center' }}>
          <LegendItem swatch={C_CASH} label="Incassato" value={mask(total_cash_received, isPrivate)} />
          <LegendItem swatch={C_FORECAST} label="Stimato" value={mask(total_forecast, isPrivate)} dim />
          <LegendItem swatch={C_BUDGET} label="Budget" value={mask(total_expenses, isPrivate)} />
        </div>
      </div>
    </PaperCard>
  );
}

function LegendItem({ swatch, label, value, dim }: { swatch: string; label: string; value: string; dim?: boolean }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: swatch, opacity: dim ? 0.55 : 1 }} />
        <span style={{ fontSize: 11.5, color: 'hsl(var(--paper-ink-3))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 500, color: 'hsl(var(--paper-ink))' }}>{value}</div>
    </div>
  );
}
