// Hero with KPI strip + overall progress bar.
import * as React from 'react';
import { PaperBadge, LegendDot, FONT_SERIF, FONT_UI, ink, surface, border, success, warn, brand } from './paperPrimitives';
import { fmt, daysFromToday, type UiTotals, type UiPayment } from '@/lib/budgetAggregates';
import { ScenarioSelector, type ScenarioMode } from './ScenarioSelector';

interface HeroProps {
  partner1: string;
  partner2: string;
  totals: UiTotals;
  next: UiPayment | null;
  vendorCount: number;
  mode: ScenarioMode;
  onModeChange: (m: ScenarioMode) => void;
  guestCounts: {
    planned: { adults: number; children: number; staff: number };
    expected: { adults: number; children: number; staff: number };
    confirmed: { adults: number; children: number; staff: number };
  } | null;
}

const SCENARIO_LABEL: Record<ScenarioMode, string> = {
  planned: 'Pianificato',
  expected: 'Lista invitati',
  confirmed: 'Confermati',
};

export function BudgetHero({ partner1, partner2, totals: t, next, vendorCount, mode, onModeChange, guestCounts }: HeroProps) {
  const pctPaid = t.committed > 0 ? Math.round((t.paid / t.committed) * 100) : 0;
  const pctCommitted = t.budget > 0 ? Math.round((t.committed / t.budget) * 100) : 0;
  // toPay è SIGNED: positivo = residuo, negativo = anticipi vs scenario.
  const overpaid = t.toPay < -0.5;
  const settled = !overpaid && t.toPay <= 0.5;
  const residue = Math.max(0, t.toPay);
  const advance = Math.max(0, -t.toPay);
  const pctPaidOfBudget = t.budget > 0 ? Math.min(100, (t.paid / t.budget) * 100) : 0;
  const pctOpenOfBudget = t.budget > 0 ? Math.max(0, (residue / t.budget) * 100) : 0;
  const couple = [partner1, partner2].filter(Boolean).join(' & ') || 'Sposi';

  const toPayValue = overpaid
    ? `+${fmt(advance)} anticipati`
    : settled
      ? fmt(0)
      : fmt(residue);
  const toPaySub = overpaid
    ? 'Hai versato più del prezzo previsto in questo scenario'
    : settled
      ? 'Tutto coperto dai pagamenti'
      : next ? `Prossima: ${fmt(next.amount)} tra ${daysFromToday(next.due)}gg` : 'Nessuna scadenza';
  const toPayTone: 'success' | 'warn' | undefined = overpaid ? 'success' : settled ? undefined : 'warn';
  const toPayHint = overpaid
    ? 'Normale all\u2019inizio: il prezzo cresce man mano che gli ospiti si confermano.'
    : undefined;

  return (
    <div className="budget-hero" style={{
      padding: '32px 40px 24px',
      background: surface(),
      borderBottom: `1px solid ${border()}`,
    }}>
      <div className="budget-hero-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 40, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: ink(3), marginBottom: 8, fontFamily: FONT_UI }}>
            Budget · {couple}
          </div>
          <h1 className="budget-hero-h1" style={{
            margin: 0, fontFamily: FONT_SERIF, fontWeight: 400, fontSize: 40,
            letterSpacing: -0.5, color: ink(),
          }}>
            Conto economico
          </h1>
          <p style={{ margin: '8px 0 0', color: ink(2), fontSize: 14, maxWidth: 560, fontFamily: FONT_UI }}>
            Vista strategica del budget, degli impegni firmati e dei pagamenti futuri.
          </p>
        </div>
        <div style={{ marginTop: 4 }}>
          <ScenarioSelector mode={mode} onModeChange={onModeChange} counts={guestCounts} />
        </div>
      </div>

      <div className="budget-hero-kpis" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
        borderTop: `1px solid ${border()}`, borderBottom: `1px solid ${border()}`,
      }}>
        <KPI label="Budget totale" value={fmt(t.budget)} sub="Tetto massimo prefissato" first />
        <KPI
          label="Impegnato"
          value={fmt(t.committed)}
          sub={`${pctCommitted}% del budget · ${vendorCount} fornitori`}
          hint={guestCounts ? `Calcolato su ${SCENARIO_LABEL[mode]} · ${guestCounts[mode].adults} adulti` : undefined}
        />
        <KPI label="Già pagato" value={fmt(t.paid)} sub={`${pctPaid}% dell'impegno`} tone="success" />
        <KPI
          label="Da pagare"
          value={toPayValue}
          sub={toPaySub}
          tone={toPayTone}
          hint={toPayHint}
          last
        />
      </div>
      <style>{`
        @media (max-width: 767px) {
          .budget-hero { padding: 18px 14px 16px !important; }
          .budget-hero-top { gap: 16px !important; margin-bottom: 16px !important; }
          .budget-hero-h1 { font-size: 26px !important; }
          .budget-hero-kpis { grid-template-columns: repeat(2, 1fr) !important; }
          .budget-hero-kpis > div { border-right: 1px solid hsl(var(--paper-border)) !important; padding: 12px 14px !important; }
          .budget-hero-kpis > div:nth-child(2n) { border-right: none !important; }
          .budget-hero-kpis > div:nth-child(-n+2) { border-bottom: 1px solid hsl(var(--paper-border)); }
          .budget-hero-kpis > div:first-child { padding-left: 0 !important; }
          .budget-hero-kpis > div:last-child { padding-right: 0 !important; }
        }
      `}</style>


      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{
          flex: '1 1 280px', minWidth: 280, height: 8, background: 'hsl(36 28% 88%)',
          borderRadius: 999, overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pctPaidOfBudget}%`, background: success() }}/>
          <div style={{ position: 'absolute', left: `${pctPaidOfBudget}%`, top: 0, bottom: 0, width: `${pctOpenOfBudget}%`, background: warn(), opacity: .75 }}/>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 12, color: ink(2), flexWrap: 'wrap' }}>
          <LegendDot color={success()} label={`Pagato ${fmt(t.paid)}`} />
          {overpaid
            ? <LegendDot color={success()} label={`Anticipo +${fmt(advance)}`} />
            : <LegendDot color={warn()} label={`Da pagare ${fmt(residue)}`} />}
          <LegendDot color="hsl(36 28% 88%)" label={`Margine ${fmt(t.remaining)}`} outline />
        </div>
      </div>
    </div>
  );
}

interface KPIProps {
  label: string; value: string; sub: string;
  tone?: 'success' | 'warn'; first?: boolean; last?: boolean;
  hint?: string;
}
function KPI({ label, value, sub, tone, first, last, hint }: KPIProps) {
  const color = tone === 'success' ? success() : tone === 'warn' ? warn() : ink();
  return (
    <div style={{
      padding: '18px 24px',
      paddingLeft: first ? 0 : 24,
      paddingRight: last ? 0 : 24,
      borderRight: last ? 'none' : `1px solid ${border()}`,
    }}>
      <div style={{
        fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: ink(3), marginBottom: 8, fontFamily: FONT_UI,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <span>{label}</span>
        {hint && (
          <span style={{
            fontSize: 9.5, letterSpacing: '0.04em', textTransform: 'none',
            color: ink(3), fontWeight: 500, fontStyle: 'italic',
          }} title={hint}>
            {hint}
          </span>
        )}
      </div>
      <div style={{
        fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 28, color,
        letterSpacing: -0.3, lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: 12, color: ink(3), marginTop: 6, fontFamily: FONT_UI }}>{sub}</div>
    </div>
  );
}
