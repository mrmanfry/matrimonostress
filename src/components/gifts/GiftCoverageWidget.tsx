// src/components/gifts/GiftCoverageWidget.tsx — Custom bar (no recharts), paper tokens
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import type { GiftForecast } from '@/hooks/useGifts';

interface Props {
  forecast: GiftForecast;
  isPrivate: boolean;
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const mask = (n: number, priv: boolean) => (priv ? '***€' : fmt(n));

const C_CASH = 'hsl(142 71% 29%)';
const C_FORECAST = 'hsl(39 48% 47%)';
const C_BUDGET = 'hsl(0 73% 41%)';

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
  const hasBudget = total_expenses > 0;
  const overBudget = total > total_expenses && hasBudget;
  // Scale: when over budget, extend the axis to "total"; otherwise use budget
  const scaleMax = overBudget ? total : Math.max(total_expenses, 1);
  const cashPct = scaleMax > 0 ? Math.min(100, (total_cash_received / scaleMax) * 100) : 0;
  const forecastPct = scaleMax > 0 ? Math.min(100 - cashPct, (total_forecast / scaleMax) * 100) : 0;

  const coverageColor =
    net_budget_coverage >= 100 ? C_CASH :
    net_budget_coverage >= 60  ? C_FORECAST :
                                  C_BUDGET;

  return (
    <PaperCard title="Copertura Budget">
      <div style={{ display: 'grid', gap: 18 }}>
        {/* KPI grande */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 44, lineHeight: 1, letterSpacing: '-0.02em', color: coverageColor }}>
            {isPrivate ? '***%' : `${net_budget_coverage}%`}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'hsl(var(--paper-ink-3))' }}>
            copertura del budget totale
          </p>
        </div>

        {/* Custom segmented bar */}
        <TooltipProvider delayDuration={150}>
          <div>
            <div
              style={{
                position: 'relative',
                height: 22,
                background: 'hsl(var(--paper-sunk))',
                borderRadius: 999,
                overflow: 'hidden',
                border: '1px solid hsl(var(--paper-border))',
              }}
            >
              {cashPct > 0 && (
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <div
                      style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${cashPct}%`,
                        background: C_CASH,
                        transition: 'width 240ms ease',
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>Incassato: {mask(total_cash_received, isPrivate)}</TooltipContent>
                </UiTooltip>
              )}
              {forecastPct > 0 && (
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <div
                      style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${cashPct}%`,
                        width: `${forecastPct}%`,
                        background: `repeating-linear-gradient(135deg, ${C_FORECAST} 0 6px, hsl(39 48% 60%) 6px 12px)`,
                        opacity: 0.85,
                        transition: 'width 240ms ease, left 240ms ease',
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>Stimato: {mask(total_forecast, isPrivate)}</TooltipContent>
                </UiTooltip>
              )}
              {/* Budget marker when over-budget */}
              {overBudget && (
                <div
                  title={`Budget: ${mask(total_expenses, isPrivate)}`}
                  style={{
                    position: 'absolute', top: -2, bottom: -2,
                    left: `${(total_expenses / scaleMax) * 100}%`,
                    width: 2, background: C_BUDGET,
                  }}
                />
              )}
            </div>

            {/* Axis labels */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 8,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'hsl(var(--paper-ink-3))',
            }}>
              <span>0&nbsp;€</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {hasBudget ? mask(total_expenses, isPrivate) : '—'}
                {overBudget && (
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: 'hsl(var(--paper-success-tint))', color: C_CASH, fontFamily: 'Inter, sans-serif' }}>
                    +{Math.round(((total - total_expenses) / total_expenses) * 100)}% sopra budget
                  </span>
                )}
              </span>
            </div>

            {/* Empty state inline message */}
            {total === 0 && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: 'hsl(var(--paper-ink-3))', textAlign: 'center', fontStyle: 'italic' }}>
                Nessun regalo ancora registrato.
              </p>
            )}
          </div>
        </TooltipProvider>

        {/* Legenda */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, textAlign: 'center' }}>
          <LegendItem swatch={C_CASH} label="Incassato" value={mask(total_cash_received, isPrivate)} />
          <LegendItem swatch={C_FORECAST} label="Stimato" value={mask(total_forecast, isPrivate)} dashed />
          <BudgetLegendItem value={mask(total_expenses, isPrivate)} />
        </div>
      </div>
    </PaperCard>
  );
}

function LegendItem({ swatch, label, value, dashed }: { swatch: string; label: string; value: string; dashed?: boolean }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{
          width: 12, height: 10, borderRadius: 3,
          background: dashed
            ? `repeating-linear-gradient(135deg, ${swatch} 0 3px, hsl(39 48% 60%) 3px 6px)`
            : swatch,
          opacity: dashed ? 0.85 : 1,
        }} />
        <span style={{ fontSize: 11.5, color: 'hsl(var(--paper-ink-3))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 500, color: 'hsl(var(--paper-ink))' }}>{value}</div>
    </div>
  );
}

function BudgetLegendItem({ value }: { value: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 11.5, color: 'hsl(var(--paper-ink-3))', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Budget totale
        </span>
        <TooltipProvider delayDuration={150}>
          <UiTooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Da dove arriva il budget"
                style={{ display: 'inline-flex', background: 'transparent', border: 'none', padding: 0, cursor: 'help', color: 'hsl(var(--paper-ink-3))' }}
              >
                <Info className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Somma di tutte le voci di spesa registrate nella sezione Budget. Aggiorna le tue voci di spesa per modificare questo valore.
            </TooltipContent>
          </UiTooltip>
        </TooltipProvider>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 500, color: 'hsl(var(--paper-ink))' }}>{value}</div>
      <Link
        to="/app/budget"
        style={{ display: 'inline-block', marginTop: 4, fontSize: 11, color: 'hsl(var(--paper-brand))', textDecoration: 'none' }}
      >
        Vai al Budget →
      </Link>
    </div>
  );
}
