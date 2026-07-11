// Cashflow timeline — cumulative step chart + KPIs + actionable upcoming flows.
// "Orizzonte Liquidità": il cuore della Tesoreria.
import * as React from 'react';
import { PaperCard, PaperBadge, FONT_SERIF, FONT_UI, FONT_MONO, ink, border, brand, warn, success } from './paperPrimitives';
import { fmt, fmtDate, paymentsByMonth, daysFromToday, type UiPayment, type UiUnplannedCommitment, type UiTotals } from '@/lib/budgetAggregates';

interface Props {
  upcoming: UiPayment[];
  paid?: UiPayment[];
  weddingDate?: string | null;
  unplanned?: UiUnplannedCommitment[];
  totals?: UiTotals;
  onOpenVendor?: (vendorId: string) => void;
  onMarkPaid?: (payment: UiPayment) => void;
}

export function CashflowTimeline({ upcoming, paid = [], weddingDate, unplanned = [], totals, onOpenVendor, onMarkPaid }: Props) {
  const [showAll, setShowAll] = React.useState(false);
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
  const W = 640, H = 200, padL = 56, padR = 12, padT = 16, padB = 30;
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

  // Formatter compatto per asse Y (es. 12.500 → 12,5k)
  const fmtCompact = (v: number) => {
    if (v >= 1000) return `€${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',')}k`;
    return `€${Math.round(v)}`;
  };

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


      {/* Mountain chart: pagato → futuro, con marker "oggi" e target */}
      {(hasUpcoming || paid.length > 0) && (
        <div style={{ padding: '16px 24px 8px' }}>
          <MountainChart
            paid={paid}
            upcoming={upcoming}
            weddingDate={weddingDate ?? null}
          />
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
            {upcoming.slice(0, showAll ? upcoming.length : 8).map(p => {
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
                    <div style={{ color: ink(3), fontSize: 11, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{p.desc}</span>
                      {p.isDynamic && (
                        <span
                          title="Importo ricalcolato live sullo scenario attivo: prezzo previsto − acconti già pianificati. Si aggiorna automaticamente se cambia lo scenario o gli ospiti confermati."
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '1px 6px', borderRadius: 999,
                            background: 'hsl(36 28% 94%)', border: `1px solid ${border()}`,
                            fontSize: 10, color: ink(2), fontWeight: 600,
                            letterSpacing: '0.02em', cursor: 'help',
                          }}
                        >
                          ↻ {p.amountType === 'balance' ? 'Saldo dinamico' : 'Calcolato'}
                        </span>
                      )}
                    </div>
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
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                style={{
                  width: '100%', padding: '10px 24px', fontSize: 11,
                  color: ink(2), fontFamily: FONT_UI, fontWeight: 600,
                  textAlign: 'center', background: 'transparent',
                  border: 'none', borderTop: `1px dashed ${border()}`,
                  cursor: 'pointer', letterSpacing: '0.02em',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'hsl(36 28% 94%)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {showAll
                  ? '− Mostra meno'
                  : `+ Mostra altri ${upcoming.length - 8} pagamenti futuri`}
              </button>
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

// ─────────────────────────────────────────────────────────────────
// Mountain chart: cumulativo pagato + cumulativo futuro
// - Area piena scura = già pagato
// - Area tratteggiata chiara = ancora da pagare
// - Linea verticale "OGGI"
// - Linea orizzontale = target (totale committed)
// - Tooltip al passaggio del mouse con € cumulato e data
// ─────────────────────────────────────────────────────────────────
function MountainChart({ paid, upcoming, weddingDate }: {
  paid: UiPayment[];
  upcoming: UiPayment[];
  weddingDate: string | null;
}) {
  const [hoverX, setHoverX] = React.useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  // Costanti disegno
  const W = 720, H = 240, padL = 60, padR = 16, padT = 20, padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayMs = 86400000;

  // Ordina cronologicamente
  const paidSorted = [...paid].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  const upcomingSorted = [...upcoming].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  const totalPaid = paidSorted.reduce((s, p) => s + p.amount, 0);
  const totalFuture = upcomingSorted.reduce((s, p) => s + p.amount, 0);
  const target = totalPaid + totalFuture || 1;

  // Dominio temporale
  const firstDate = paidSorted[0]
    ? new Date(paidSorted[0].due)
    : upcomingSorted[0]
      ? new Date(upcomingSorted[0].due)
      : today;
  firstDate.setHours(0, 0, 0, 0);
  // Il matrimonio è l'orizzonte naturale: nulla ha senso dopo.
  // Se non c'è, prendiamo l'ultimo pagamento pianificato.
  const weddingMs = weddingDate ? new Date(weddingDate).setHours(0, 0, 0, 0) : null;
  const lastPaymentMs = upcomingSorted.length
    ? new Date(upcomingSorted[upcomingSorted.length - 1].due).setHours(0, 0, 0, 0)
    : null;
  const horizonMs = weddingMs ?? lastPaymentMs ?? today.getTime();
  const lastDate = new Date(Math.max(horizonMs, today.getTime()));
  lastDate.setHours(0, 0, 0, 0);
  // Piccolo padding a sinistra (7 giorni) per non attaccare alla Y
  const domainStart = new Date(Math.min(firstDate.getTime(), today.getTime()) - 7 * dayMs);
  // Nessun padding a destra: il grafico termina esattamente sull'orizzonte (matrimonio).
  const domainEnd = new Date(lastDate.getTime());
  const domainSpan = Math.max(1, domainEnd.getTime() - domainStart.getTime());

  const xFor = (dateMs: number) => padL + ((dateMs - domainStart.getTime()) / domainSpan) * innerW;
  const yFor = (v: number) => padT + innerH - (v / target) * innerH;

  // Costruisci punti step: (data, cumulato)
  type Pt = { t: number; cum: number };
  const paidPts: Pt[] = [{ t: domainStart.getTime(), cum: 0 }];
  let cum = 0;
  for (const p of paidSorted) {
    const t = new Date(p.due).getTime();
    paidPts.push({ t, cum });          // step orizzontale
    cum += p.amount;
    paidPts.push({ t, cum });          // step verticale
  }
  // Estendi orizzontalmente fino a "oggi"
  paidPts.push({ t: today.getTime(), cum: cum });
  const paidEndCum = cum;

  const futurePts: Pt[] = [{ t: today.getTime(), cum: paidEndCum }];
  let cumF = paidEndCum;
  for (const p of upcomingSorted) {
    // Clamp: nessun pagamento può cadere prima di oggi né dopo l'orizzonte (matrimonio).
    const raw = new Date(p.due).getTime();
    const t = Math.min(Math.max(raw, today.getTime()), domainEnd.getTime());
    futurePts.push({ t, cum: cumF });
    cumF += p.amount;
    futurePts.push({ t, cum: cumF });
  }
  // Chiudi la curva sull'orizzonte (target raggiunto per definizione).
  if (futurePts[futurePts.length - 1].t < domainEnd.getTime()) {
    futurePts.push({ t: domainEnd.getTime(), cum: cumF });
  }

  const toPath = (pts: Pt[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.t)} ${yFor(p.cum)}`).join(' ');
  const toArea = (pts: Pt[]) => {
    const line = toPath(pts);
    const first = pts[0], last = pts[pts.length - 1];
    return `${line} L ${xFor(last.t)} ${padT + innerH} L ${xFor(first.t)} ${padT + innerH} Z`;
  };

  const paidPath = toPath(paidPts);
  const paidArea = toArea(paidPts);
  const futPath = toPath(futurePts);
  const futArea = toArea(futurePts);

  // Ticks mese sull'asse X
  const monthTicks: { t: number; label: string }[] = [];
  const cursor = new Date(domainStart.getFullYear(), domainStart.getMonth(), 1);
  while (cursor.getTime() <= domainEnd.getTime()) {
    monthTicks.push({
      t: cursor.getTime(),
      label: cursor.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  // Riduci densità se troppi mesi
  const tickStride = Math.max(1, Math.ceil(monthTicks.length / 8));

  const fmtCompact = (v: number) => {
    if (v >= 1000) return `€${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',')}k`;
    return `€${Math.round(v)}`;
  };

  // Hover: interpolazione lineare sul cumulativo combinato
  const combinedPts: Pt[] = [...paidPts, ...futurePts].sort((a, b) => a.t - b.t);
  const valueAt = (t: number): number => {
    if (t <= combinedPts[0].t) return 0;
    if (t >= combinedPts[combinedPts.length - 1].t) return combinedPts[combinedPts.length - 1].cum;
    for (let i = 1; i < combinedPts.length; i++) {
      if (combinedPts[i].t >= t) {
        const a = combinedPts[i - 1], b = combinedPts[i];
        if (b.t === a.t) return b.cum;
        const r = (t - a.t) / (b.t - a.t);
        return a.cum + (b.cum - a.cum) * r;
      }
    }
    return combinedPts[combinedPts.length - 1].cum;
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const xViewBox = (xPx / rect.width) * W;
    if (xViewBox < padL || xViewBox > padL + innerW) { setHoverX(null); return; }
    setHoverX(xViewBox);
  };

  const hoverT = hoverX != null
    ? domainStart.getTime() + ((hoverX - padL) / innerW) * domainSpan
    : null;
  const hoverVal = hoverT != null ? valueAt(hoverT) : null;
  const hoverDate = hoverT != null ? new Date(hoverT) : null;
  const hoverIsFuture = hoverT != null && hoverT > today.getTime();

  const todayX = xFor(today.getTime());
  const weddingX = weddingDate ? xFor(new Date(weddingDate).getTime()) : null;

  return (
    <div>
      {/* Legenda */}
      <div style={{
        fontSize: 11, color: ink(3), fontFamily: FONT_UI,
        marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 14, height: 10, background: brand(), display: 'inline-block', borderRadius: 2 }} />
          Già pagato ({fmt(totalPaid)})
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 14, height: 10, background: `repeating-linear-gradient(45deg, ${brand()} 0 2px, transparent 2px 5px)`,
            border: `1px solid ${brand()}`, display: 'inline-block', borderRadius: 2, opacity: 0.6,
          }} />
          Da pagare ({fmt(totalFuture)})
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 2, height: 12, background: warn(), display: 'inline-block' }} />
          Oggi
        </span>
        {weddingDate && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 2, height: 12, background: ink(2), display: 'inline-block' }} />
            Matrimonio
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: ink(2), fontFamily: FONT_MONO }}>
          Target: {fmt(target)}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%" height={H}
        preserveAspectRatio="none"
        style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverX(null)}
      >
        <defs>
          <pattern id="futStripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={brand()} opacity={0.08} />
            <line x1="0" y1="0" x2="0" y2="6" stroke={brand()} strokeWidth="1.2" opacity={0.35} />
          </pattern>
        </defs>

        {/* Gridlines + Y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => {
          const y = padT + innerH * (1 - p);
          const val = target * p;
          return (
            <g key={p}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y}
                stroke={border()} strokeDasharray={p === 0 ? undefined : "2 3"} strokeWidth={1} />
              <text x={padL - 6} y={y + 3} textAnchor="end"
                style={{ fontSize: 10, fill: ink(3), fontFamily: FONT_MONO } as any}>
                {fmtCompact(val)}
              </text>
            </g>
          );
        })}

        {/* Target line (in cima) */}
        <line x1={padL} x2={padL + innerW} y1={yFor(target)} y2={yFor(target)}
          stroke={ink(2)} strokeDasharray="4 3" strokeWidth={1.2} />
        <text x={padL + innerW} y={yFor(target) - 5} textAnchor="end"
          style={{ fontSize: 10, fill: ink(2), fontFamily: FONT_UI, fontWeight: 600 } as any}>
          Target {fmt(target)}
        </text>

        {/* Area futura (tratteggiata) */}
        <path d={futArea} fill="url(#futStripes)" />
        <path d={futPath} fill="none" stroke={brand()} strokeWidth={1.8} strokeDasharray="5 4" opacity={0.85} />

        {/* Area pagata (piena) */}
        <path d={paidArea} fill={brand()} opacity={0.28} />
        <path d={paidPath} fill="none" stroke={brand()} strokeWidth={2.4} />

        {/* Punto "sei qui" (fine curva pagata) */}
        <circle cx={todayX} cy={yFor(paidEndCum)} r={5}
          fill={warn()} stroke="white" strokeWidth={2} />

        {/* Linea OGGI */}
        <line x1={todayX} x2={todayX} y1={padT} y2={padT + innerH}
          stroke={warn()} strokeWidth={1.5} strokeDasharray="3 3" />
        <text x={todayX} y={padT - 6} textAnchor="middle"
          style={{ fontSize: 10, fill: warn(), fontFamily: FONT_UI, fontWeight: 700, letterSpacing: '0.06em' } as any}>
          OGGI
        </text>

        {/* Linea Matrimonio */}
        {weddingX != null && weddingX >= padL && weddingX <= padL + innerW && (
          <>
            <line x1={weddingX} x2={weddingX} y1={padT} y2={padT + innerH}
              stroke={ink(2)} strokeWidth={1} strokeDasharray="2 4" />
            <text x={weddingX} y={padT - 6} textAnchor="middle"
              style={{ fontSize: 10, fill: ink(2), fontFamily: FONT_UI, fontWeight: 600 } as any}>
              ♥
            </text>
          </>
        )}

        {/* X ticks mese */}
        {monthTicks.map((m, i) => {
          if (i % tickStride !== 0) return null;
          const x = xFor(m.t);
          if (x < padL - 2 || x > padL + innerW + 2) return null;
          return (
            <g key={m.t}>
              <line x1={x} x2={x} y1={padT + innerH} y2={padT + innerH + 4}
                stroke={border()} strokeWidth={1} />
              <text x={x} y={H - 18} textAnchor="middle"
                style={{ fontSize: 10, fill: ink(3), fontFamily: FONT_UI, letterSpacing: '0.06em', textTransform: 'uppercase' } as any}>
                {m.label}
              </text>
            </g>
          );
        })}

        {/* Hover crosshair + tooltip */}
        {hoverX != null && hoverVal != null && hoverDate && (
          <g pointerEvents="none">
            <line x1={hoverX} x2={hoverX} y1={padT} y2={padT + innerH}
              stroke={ink(2)} strokeWidth={1} strokeDasharray="2 2" opacity={0.6} />
            <circle cx={hoverX} cy={yFor(hoverVal)} r={4}
              fill={hoverIsFuture ? 'white' : brand()}
              stroke={brand()} strokeWidth={2} />
            {/* Tooltip box */}
            {(() => {
              const boxW = 170, boxH = 52;
              const flip = hoverX + boxW + 12 > padL + innerW;
              const bx = flip ? hoverX - boxW - 10 : hoverX + 10;
              const by = Math.max(padT, yFor(hoverVal) - boxH - 8);
              return (
                <g transform={`translate(${bx}, ${by})`}>
                  <rect width={boxW} height={boxH} rx={6}
                    fill="white" stroke={border()} strokeWidth={1}
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.08))' }} />
                  <text x={10} y={17}
                    style={{ fontSize: 11, fill: ink(3), fontFamily: FONT_UI, textTransform: 'uppercase', letterSpacing: '0.05em' } as any}>
                    {hoverIsFuture ? 'Proiezione' : 'Cumulato pagato'}
                  </text>
                  <text x={10} y={34}
                    style={{ fontSize: 15, fill: ink(), fontFamily: FONT_SERIF, fontWeight: 600 } as any}>
                    {fmt(hoverVal)}
                  </text>
                  <text x={10} y={48}
                    style={{ fontSize: 10, fill: ink(3), fontFamily: FONT_MONO } as any}>
                    {hoverDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Sotto-riga esplicativa */}
      <div style={{
        marginTop: 6, fontSize: 11, color: ink(3), fontFamily: FONT_UI,
        display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <span>Sei al <strong style={{ color: ink() }}>{Math.round((paidEndCum / target) * 100)}%</strong> del percorso · Restano <strong style={{ color: ink() }}>{fmt(target - paidEndCum)}</strong></span>
        <span>Passa il mouse sul grafico per vedere il valore in ogni data</span>
      </div>
    </div>
  );
}
