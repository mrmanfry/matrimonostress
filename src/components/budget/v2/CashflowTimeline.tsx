// Cashflow timeline — cumulative step chart + KPIs + actionable upcoming flows.
// "Orizzonte Liquidità": il cuore della Tesoreria.
import * as React from 'react';
import { PaperCard, PaperBadge, FONT_SERIF, FONT_UI, FONT_MONO, ink, border, brand, warn, success } from './paperPrimitives';
import { fmt, fmtDate, paymentsByMonth, daysFromToday, type UiPayment, type UiUnplannedCommitment, type UiTotals } from '@/lib/budgetAggregates';

interface Props {
  upcoming: UiPayment[];
  unplanned?: UiUnplannedCommitment[];
  totals?: UiTotals;
  onOpenVendor?: (vendorId: string) => void;
  onMarkPaid?: (payment: UiPayment) => void;
}

export function CashflowTimeline({ upcoming, unplanned = [], totals, onOpenVendor, onMarkPaid }: Props) {
  if (upcoming.length === 0 && unplanned.length === 0) {
    return (
      <PaperCard>
        <div style={{ textAlign: 'center', padding: 24, color: ink(3), fontFamily: FONT_UI }}>
          Nessun pagamento futuro pianificato.
        </div>
      </PaperCard>
    );
  }

  const hasUpcoming = upcoming.length > 0;
  const months = hasUpcoming ? paymentsByMonth(upcoming) : [];
  const totalFuture = upcoming.reduce((s, p) => s + p.amount, 0);
  const totalUnplanned = unplanned.reduce((s, u) => s + u.amount, 0);

  // Residuo reale = committed − pagato (SIGNED).
  // Le rate sono solo proiezione di cassa: la loro somma può legittimamente
  // differire dal residuo (es. sovra-pagamenti iniziali, scenario evoluto).
  const signedResidue = totals ? totals.toPay : totalFuture;
  const overpaid = signedResidue < -0.5;
  const residue = Math.max(0, signedResidue);
  const advance = Math.max(0, -signedResidue);
  const ratesExceedResidue = totals ? totalFuture > residue + 0.5 : false;

  // KPIs (only meaningful when there are upcoming flows)
  const busiest = hasUpcoming ? months.reduce((a, b) => (b.amount > a.amount ? b : a), months[0]) : null;
  const next = upcoming[0];
  const nextDays = next ? daysFromToday(next.due) : 0;

  // Cumulative step series
  let cum = 0;
  const series = months.map(m => {
    cum += m.amount;
    return { ...m, cum };
  });
  const maxCum = series.length > 0 ? (series[series.length - 1].cum || 1) : 1;

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

  const residueKpi = overpaid
    ? { label: 'Da pagare residuo', value: `+${fmt(advance)} anticipati`, hint: 'Versato più del prezzo previsto · vedi spiegazione sotto', tone: 'success' as const }
    : residue <= 0.5
      ? { label: 'Da pagare residuo', value: fmt(0), hint: 'Tutto coperto dai pagamenti', tone: 'default' as const }
      : { label: 'Da pagare residuo', value: fmt(residue), hint: 'Prezzo previsto − già pagato', tone: 'warn' as const };

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
            {hasUpcoming
              ? `${upcoming.length} rate pianificate · totale ${fmt(totalFuture)} · ${months.length} mesi`
              : 'Nessuna rata pianificata'}
            {unplanned.length > 0 && ` · ${unplanned.length} impegni senza piano (${fmt(totalUnplanned)})`}
          </p>
        </div>
        <PaperBadge tone="warn" size="sm">Esborso cumulativo</PaperBadge>
      </div>

      {/* KPIs — only meaningful if there are scheduled payments */}
      {hasUpcoming && busiest && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
            borderBottom: ratesExceedResidue || overpaid ? 'none' : `1px solid ${border()}`,
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
            <Kpi
              label={residueKpi.label}
              value={residueKpi.value}
              hint={residueKpi.hint}
              tone={residueKpi.tone}
              last
            />
          </div>
          {(ratesExceedResidue || overpaid) && (
            <div style={{
              padding: '10px 24px',
              background: 'hsl(36 28% 97%)',
              borderBottom: `1px solid ${border()}`,
              fontSize: 12, color: ink(2), fontFamily: FONT_UI,
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            }}>
              <span style={{ fontWeight: 600, color: ink() }}>
                {overpaid
                  ? `Anticipo +${fmt(advance)} vs prezzo previsto`
                  : `Rate pianificate ${fmt(totalFuture)} > residuo ${fmt(residue)} (Δ +${fmt(totalFuture - residue)})`}
              </span>
              <span style={{ color: ink(3) }}>
                Le rate sono solo proiezione di cassa: alcune potrebbero essere riviste quando lo scenario cambia o gli ospiti si confermano.
              </span>
            </div>
          )}
        </>
      )}


      {/* Cumulative step chart */}
      {hasUpcoming && (
        <div style={{ padding: '16px 24px 8px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
            {[0.25, 0.5, 0.75, 1].map(p => (
              <line key={p} x1={padL} x2={padL + innerW}
                y1={padT + innerH * (1 - p)} y2={padT + innerH * (1 - p)}
                stroke={border()} strokeDasharray="2 3" strokeWidth={1} />
            ))}
            <path d={dArea} fill={brand()} opacity={0.12} />
            <path d={d} fill="none" stroke={brand()} strokeWidth={2} />
            {series.map((s) => {
              const i = series.indexOf(s);
              const x = padL + (i + 1) * stepX;
              const y = yFor(s.cum);
              const isBusy = busiest ? s.amount === busiest.amount : false;
              return (
                <g key={s.key}>
                  <circle cx={x} cy={y} r={isBusy ? 4 : 3}
                    fill={isBusy ? warn() : brand()} stroke="white" strokeWidth={1.5} />
                </g>
              );
            })}
            {series.map((s, i) => (
              <text key={s.key}
                x={padL + i * stepX + stepX / 2} y={H - 6}
                textAnchor="middle"
                style={{ fontSize: 10, fill: ink(3), fontFamily: FONT_UI, letterSpacing: '0.06em', textTransform: 'uppercase' } as any}
              >{s.label}</text>
            ))}
          </svg>
        </div>
      )}

      {/* Actionable list of upcoming flows */}
      {hasUpcoming && (
        <div style={{ borderTop: `1px solid ${border()}` }}>
          <div style={{
            padding: '10px 24px', fontSize: 11, color: ink(3), textTransform: 'uppercase',
            letterSpacing: '0.08em', fontFamily: FONT_UI, borderBottom: `1px solid ${border()}`,
          }}>Prossimi flussi · rate pianificate</div>
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
      )}

      {/* Impegni senza piano di pagamento */}
      {unplanned.length > 0 && (
        <div style={{ borderTop: `1px solid ${border()}`, background: 'hsl(36 28% 97%)' }}>
          <div style={{
            padding: '10px 24px', fontSize: 11, color: ink(3), textTransform: 'uppercase',
            letterSpacing: '0.08em', fontFamily: FONT_UI, borderBottom: `1px solid ${border()}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          }}>
            <span>Impegni senza piano di pagamento · {unplanned.length} voci</span>
            <span style={{ fontFamily: FONT_MONO, color: ink(2), textTransform: 'none', letterSpacing: 0 }}>
              totale {fmt(totalUnplanned)}
            </span>
          </div>
          <div>
            {unplanned.map(u => (
              <div key={u.itemId} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 12, alignItems: 'center',
                padding: '10px 24px',
                borderBottom: `1px solid ${border()}`,
                fontFamily: FONT_UI, fontSize: 13,
              }}>
                <button
                  onClick={() => onOpenVendor?.(u.vendorId)}
                  style={{
                    background: 'transparent', border: 'none', padding: 0, textAlign: 'left',
                    cursor: onOpenVendor ? 'pointer' : 'default', color: ink(),
                    fontFamily: FONT_UI, fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, color: ink(), textDecoration: onOpenVendor ? 'underline dotted' : 'none', textUnderlineOffset: 3 }}>
                    {u.vendorName}
                  </div>
                  <div style={{ color: ink(3), fontSize: 11, marginTop: 2 }}>
                    {u.itemDesc} · <span style={{ fontStyle: 'italic' }}>{u.categoryName}</span>
                  </div>
                </button>
                <div style={{ fontFamily: FONT_MONO, fontWeight: 700, color: ink(), minWidth: 90, textAlign: 'right' }}>
                  {fmt(u.amount)}
                </div>
                <button
                  onClick={() => onOpenVendor?.(u.vendorId)}
                  style={{
                    background: 'transparent', color: ink(),
                    border: `1px solid ${border()}`,
                    borderRadius: 6, padding: '6px 10px',
                    fontSize: 11, fontFamily: FONT_UI, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Pianifica rate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </PaperCard>
  );
}

function Kpi({ label, value, hint, tone = 'default', last = false }: {
  label: string; value: string; hint?: string;
  tone?: 'default' | 'warn' | 'success'; last?: boolean;
}) {
  const color = tone === 'warn' ? warn() : tone === 'success' ? success() : ink();
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
        color, marginTop: 4,
      }}>{value}</div>
      {hint && (
        <div style={{ fontSize: 11, color: ink(3), fontFamily: FONT_UI, marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
}
