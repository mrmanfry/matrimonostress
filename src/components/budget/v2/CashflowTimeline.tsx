// Cashflow timeline — cumulative step chart + KPIs + actionable upcoming flows.
// "Orizzonte Liquidità": il cuore della Tesoreria.
import * as React from 'react';
import { PaperCard, PaperBadge, FONT_SERIF, FONT_UI, FONT_MONO, ink, border, brand, warn } from './paperPrimitives';
import { fmt, fmtDate, paymentsByMonth, daysFromToday, type UiPayment, type UiUnplannedCommitment } from '@/lib/budgetAggregates';

interface Props {
  upcoming: UiPayment[];
  unplanned?: UiUnplannedCommitment[];
  onOpenVendor?: (vendorId: string) => void;
  onMarkPaid?: (payment: UiPayment) => void;
}

export function CashflowTimeline({ upcoming, onOpenVendor, onMarkPaid }: Props) {
  if (upcoming.length === 0) {
    return (
      <PaperCard>
        <div style={{ textAlign: 'center', padding: 24, color: ink(3), fontFamily: FONT_UI }}>
          Nessun pagamento futuro pianificato.
        </div>
      </PaperCard>
    );
  }

  const months = paymentsByMonth(upcoming);
  const totalFuture = upcoming.reduce((s, p) => s + p.amount, 0);

  // KPIs
  const busiest = months.reduce((a, b) => (b.amount > a.amount ? b : a), months[0]);
  const next = upcoming[0];
  const nextDays = next ? daysFromToday(next.due) : 0;

  // Cumulative step series
  let cum = 0;
  const series = months.map(m => {
    cum += m.amount;
    return { ...m, cum };
  });
  const maxCum = series[series.length - 1].cum || 1;

  // SVG step path
  const W = 600, H = 160, padL = 8, padR = 8, padT = 12, padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const stepX = series.length > 1 ? innerW / series.length : innerW;
  const yFor = (v: number) => padT + innerH - (v / maxCum) * innerH;
  let d = `M ${padL} ${padT + innerH}`;
  series.forEach((s, i) => {
    const x0 = padL + i * stepX;
    const x1 = padL + (i + 1) * stepX;
    const y = yFor(s.cum);
    d += ` L ${x0} ${y} L ${x1} ${y}`;
  });
  const dArea = d + ` L ${padL + innerW} ${padT + innerH} Z`;

  return (
    <PaperCard padding={0}>
      {/* Header */}
      <div style={{
        padding: '18px 24px 14px', borderBottom: `1px solid ${border()}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 19, color: ink() }}>
            Orizzonte liquidità
          </h3>
          <p style={{ margin: '4px 0 0', color: ink(3), fontSize: 12, fontFamily: FONT_UI }}>
            {upcoming.length} pagamenti futuri · totale {fmt(totalFuture)} · {months.length} mesi
          </p>
        </div>
        <PaperBadge tone="warn" size="sm">Esborso cumulativo</PaperBadge>
      </div>

      {/* KPIs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
        borderBottom: `1px solid ${border()}`,
      }}>
        <Kpi label="Prossima scadenza"
          value={next ? fmt(next.amount) : '—'}
          hint={next ? `${next.vendorName} · ${fmtDate(next.due)} (${nextDays <= 0 ? 'oggi' : `tra ${nextDays}g`})` : ''}
          tone={next && nextDays <= 7 ? 'warn' : 'default'}
        />
        <Kpi label="Mese più intenso"
          value={fmt(busiest.amount)}
          hint={`${busiest.label.toUpperCase()} · ${busiest.count} pagamenti`}
        />
        <Kpi label="Totale futuro"
          value={fmt(totalFuture)}
          hint={`fino a ${months[months.length - 1].label.toUpperCase()}`}
          last
        />
      </div>

      {/* Cumulative step chart */}
      <div style={{ padding: '16px 24px 8px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
          {/* gridlines */}
          {[0.25, 0.5, 0.75, 1].map(p => (
            <line key={p} x1={padL} x2={padL + innerW}
              y1={padT + innerH * (1 - p)} y2={padT + innerH * (1 - p)}
              stroke={border()} strokeDasharray="2 3" strokeWidth={1} />
          ))}
          <path d={dArea} fill={brand()} opacity={0.12} />
          <path d={d} fill="none" stroke={brand()} strokeWidth={2} />
          {/* node markers */}
          {series.map((s, i) => {
            const x = padL + (i + 1) * stepX;
            const y = yFor(s.cum);
            const isBusy = s.amount === busiest.amount;
            return (
              <g key={s.key}>
                <circle cx={x} cy={y} r={isBusy ? 4 : 3}
                  fill={isBusy ? warn() : brand()} stroke="white" strokeWidth={1.5} />
              </g>
            );
          })}
          {/* x labels */}
          {series.map((s, i) => (
            <text key={s.key}
              x={padL + i * stepX + stepX / 2} y={H - 6}
              textAnchor="middle"
              style={{ fontSize: 10, fill: ink(3), fontFamily: FONT_UI, letterSpacing: '0.06em', textTransform: 'uppercase' } as any}
            >{s.label}</text>
          ))}
        </svg>
      </div>

      {/* Actionable list of upcoming flows */}
      <div style={{ borderTop: `1px solid ${border()}` }}>
        <div style={{
          padding: '10px 24px', fontSize: 11, color: ink(3), textTransform: 'uppercase',
          letterSpacing: '0.08em', fontFamily: FONT_UI, borderBottom: `1px solid ${border()}`,
        }}>Prossimi flussi</div>
        <div>
          {upcoming.slice(0, 8).map(p => {
            const days = daysFromToday(p.due);
            const overdue = days < 0;
            const soon = days >= 0 && days <= 7;
            return (
              <div key={p.id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: 12, alignItems: 'center',
                padding: '10px 24px',
                borderBottom: `1px solid ${border()}`,
                fontFamily: FONT_UI, fontSize: 13,
              }}>
                <button
                  onClick={() => onOpenVendor?.(p.vendorId)}
                  style={{
                    background: 'transparent', border: 'none', padding: 0, textAlign: 'left',
                    cursor: onOpenVendor ? 'pointer' : 'default', color: ink(),
                    fontFamily: FONT_UI, fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, color: ink(), textDecoration: onOpenVendor ? 'underline dotted' : 'none', textUnderlineOffset: 3 }}>
                    {p.vendorName}
                  </div>
                  <div style={{ color: ink(3), fontSize: 11, marginTop: 2 }}>{p.desc}</div>
                </button>
                <div style={{ fontSize: 11, color: overdue ? warn() : ink(3), fontFamily: FONT_MONO }}>
                  {fmtDate(p.due)}
                  <span style={{ marginLeft: 6, fontWeight: 600 }}>
                    {overdue ? `(${Math.abs(days)}g in ritardo)` : days === 0 ? '(oggi)' : `(tra ${days}g)`}
                  </span>
                </div>
                <div style={{ fontFamily: FONT_MONO, fontWeight: 700, color: ink(), minWidth: 90, textAlign: 'right' }}>
                  {fmt(p.amount)}
                </div>
                {onMarkPaid ? (
                  <button
                    onClick={() => onMarkPaid(p)}
                    style={{
                      background: soon || overdue ? warn() : 'transparent',
                      color: soon || overdue ? 'white' : ink(),
                      border: `1px solid ${soon || overdue ? warn() : border()}`,
                      borderRadius: 6, padding: '6px 10px',
                      fontSize: 11, fontFamily: FONT_UI, fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Segna pagato
                  </button>
                ) : <span />}
              </div>
            );
          })}
          {upcoming.length > 8 && (
            <div style={{ padding: '10px 24px', fontSize: 11, color: ink(3), fontFamily: FONT_UI, textAlign: 'center' }}>
              + altri {upcoming.length - 8} pagamenti futuri
            </div>
          )}
        </div>
      </div>
    </PaperCard>
  );
}

function Kpi({ label, value, hint, tone = 'default', last = false }: {
  label: string; value: string; hint?: string;
  tone?: 'default' | 'warn'; last?: boolean;
}) {
  return (
    <div style={{
      padding: '14px 20px',
      borderRight: last ? 'none' : `1px solid ${border()}`,
    }}>
      <div style={{
        fontSize: 10, color: ink(3), fontFamily: FONT_UI,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>{label}</div>
      <div style={{
        fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 500,
        color: tone === 'warn' ? warn() : ink(), marginTop: 4,
      }}>{value}</div>
      {hint && (
        <div style={{ fontSize: 11, color: ink(3), fontFamily: FONT_UI, marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
}
