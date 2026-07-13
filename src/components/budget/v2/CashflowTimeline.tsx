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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [Wpx, setWpx] = React.useState<number>(720);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) setWpx(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Canvas — 1 unità viewBox = 1 pixel reale (no stretching)
  const W = Math.max(320, Wpx), H = 260, padL = 60, padR = 20, padT = 32, padB = 44;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayMs = 86400000;
  const dayFloor = (d: Date | string | number) => {
    const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime();
  };

  // Eventi cronologici (pagato + futuro), senza clamp: manteniamo la data reale.
  type Ev = { t: number; amount: number; kind: 'paid' | 'future'; payment: UiPayment };
  const paidEvs: Ev[] = paid
    .map(p => ({ t: dayFloor(p.due), amount: p.amount, kind: 'paid' as const, payment: p }))
    .sort((a, b) => a.t - b.t);
  const futEvs: Ev[] = upcoming
    .map(p => ({ t: dayFloor(p.due), amount: p.amount, kind: 'future' as const, payment: p }))
    .sort((a, b) => a.t - b.t);
  const allEvs: Ev[] = [...paidEvs, ...futEvs].sort((a, b) => a.t - b.t);

  const totalPaid = paidEvs.reduce((s, e) => s + e.amount, 0);
  const totalFuture = futEvs.reduce((s, e) => s + e.amount, 0);
  const target = totalPaid + totalFuture || 1;
  const paidEndCum = totalPaid; // valore cumulato "già pagato" ad oggi

  // Dominio: da prima rata (o 7g prima di oggi) a ultima rata + 7g padding
  const firstMs = allEvs.length ? allEvs[0].t : today.getTime();
  const lastMs = allEvs.length ? allEvs[allEvs.length - 1].t : today.getTime();
  const domainStart = Math.min(firstMs, today.getTime()) - 7 * dayMs;
  const domainEnd = Math.max(lastMs, today.getTime()) + 7 * dayMs;
  const domainSpan = Math.max(1, domainEnd - domainStart);

  const xFor = (t: number) => padL + ((t - domainStart) / domainSpan) * innerW;
  const yFor = (v: number) => padT + innerH - (v / target) * innerH;

  // ─── Staircase deterministica ─────────────────────────────────────
  // Aggrega più eventi con la stessa data in un unico "step".
  type Step = { t: number; cumPaid: number; cumTotal: number; events: Ev[] };
  const steps: Step[] = [];
  {
    let cumPaid = 0, cumTotal = 0;
    let i = 0;
    while (i < allEvs.length) {
      const t = allEvs[i].t;
      const bucket: Ev[] = [];
      while (i < allEvs.length && allEvs[i].t === t) {
        const ev = allEvs[i];
        cumTotal += ev.amount;
        if (ev.kind === 'paid') cumPaid += ev.amount;
        bucket.push(ev);
        i++;
      }
      steps.push({ t, cumPaid, cumTotal, events: bucket });
    }
  }

  // Query staircase: valore all'istante t = ultimo step con step.t <= t.
  const stateAt = (t: number): { cumPaid: number; cumTotal: number } => {
    if (steps.length === 0 || t < steps[0].t) return { cumPaid: 0, cumTotal: 0 };
    // binary search
    let lo = 0, hi = steps.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (steps[mid].t <= t) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return { cumPaid: steps[ans].cumPaid, cumTotal: steps[ans].cumTotal };
  };

  // ─── Path builders (step orizzontali → verticali) ─────────────────
  type Pt = { t: number; v: number };
  const buildPathPts = (getV: (s: Step) => number, startV: number): Pt[] => {
    const pts: Pt[] = [{ t: domainStart, v: startV }];
    let currV = startV;
    for (const s of steps) {
      pts.push({ t: s.t, v: currV });         // orizzontale fino a s.t
      currV = getV(s);
      pts.push({ t: s.t, v: currV });         // salto verticale
    }
    pts.push({ t: domainEnd, v: currV });      // estensione fino a fine dominio
    return pts;
  };
  const toPath = (pts: Pt[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(p.t)} ${yFor(p.v)}`).join(' ');
  const toArea = (pts: Pt[]) => {
    const line = toPath(pts);
    const first = pts[0], last = pts[pts.length - 1];
    return `${line} L ${xFor(last.t)} ${padT + innerH} L ${xFor(first.t)} ${padT + innerH} Z`;
  };

  const paidPts = buildPathPts(s => s.cumPaid, 0);
  const totalPts = buildPathPts(s => s.cumTotal, 0);

  const paidPath = toPath(paidPts);
  const paidArea = toArea(paidPts);
  const totalPath = toPath(totalPts);
  const totalArea = toArea(totalPts);

  // Ticks mese
  const monthTicks: { t: number; label: string }[] = [];
  const cursor = new Date(new Date(domainStart).getFullYear(), new Date(domainStart).getMonth(), 1);
  while (cursor.getTime() <= domainEnd) {
    monthTicks.push({ t: cursor.getTime(), label: cursor.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' }) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const tickStride = Math.max(1, Math.ceil(monthTicks.length / 8));

  const fmtCompact = (v: number) => {
    if (v >= 1000) return `€${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',')}k`;
    return `€${Math.round(v)}`;
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const xViewBox = (xPx / rect.width) * W;
    if (xViewBox < padL || xViewBox > padL + innerW) { setHoverX(null); return; }
    setHoverX(xViewBox);
  };

  const hoverT = hoverX != null ? domainStart + ((hoverX - padL) / innerW) * domainSpan : null;
  const hoverDayMs = hoverT != null ? dayFloor(new Date(hoverT)) : null;
  const hoverState = hoverDayMs != null ? stateAt(hoverDayMs) : null;
  const hoverDate = hoverDayMs != null ? new Date(hoverDayMs) : null;
  // Se il cursore cade esattamente su una data con eventi → mostra il breakdown
  const hoverStep = hoverDayMs != null ? steps.find(s => s.t === hoverDayMs) : null;

  const todayX = xFor(today.getTime());
  const weddingMs = weddingDate ? dayFloor(weddingDate) : null;
  const weddingX = weddingMs ? xFor(weddingMs) : null;
  const weddingInRange = weddingX != null && weddingX >= padL - 2 && weddingX <= padL + innerW + 2;

  // Prossima rata (per la copy sotto)
  const nextEv = futEvs.find(e => e.t >= today.getTime()) ?? futEvs[0] ?? null;

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
            width: 14, height: 10,
            background: `linear-gradient(180deg, ${brand()}55, ${brand()}18)`,
            border: `1px dashed ${brand()}`, display: 'inline-block', borderRadius: 2,
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

      <div ref={containerRef} style={{ width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W} height={H}
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="geometricPrecision"
        style={{ display: 'block', overflow: 'visible', cursor: 'crosshair', maxWidth: '100%' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHoverX(null)}
      >
        <defs>
          <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={brand()} stopOpacity={0.45} />
            <stop offset="100%" stopColor={brand()} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="gradFuture" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={brand()} stopOpacity={0.22} />
            <stop offset="100%" stopColor={brand()} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* Gridlines + Y labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => {
          const y = padT + innerH * (1 - p);
          const val = target * p;
          return (
            <g key={p}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y}
                stroke={border()} strokeDasharray={p === 0 ? undefined : "2 3"} strokeWidth={1} />
              <text x={padL - 8} y={y + 3} textAnchor="end"
                style={{ fontSize: 10, fill: ink(3), fontFamily: FONT_MONO } as any}>
                {fmtCompact(val)}
              </text>
            </g>
          );
        })}

        {/* Target line + label pillola */}
        <line x1={padL} x2={padL + innerW} y1={yFor(target)} y2={yFor(target)}
          stroke={ink(2)} strokeDasharray="4 3" strokeWidth={1.2} />

        {/* Area TOTALE (paid + future) — sfondo chiaro */}
        <path d={totalArea} fill="url(#gradFuture)" />
        {/* Linea totale tratteggiata (proiezione) */}
        <path d={totalPath} fill="none" stroke={brand()} strokeWidth={1.6}
          strokeDasharray="5 4" opacity={0.75} strokeLinejoin="miter" />

        {/* Area PAGATA (sopra) — piena scura */}
        <path d={paidArea} fill="url(#gradPaid)" />
        <path d={paidPath} fill="none" stroke={brand()} strokeWidth={2.4} strokeLinejoin="miter" />

        {/* "Sei qui" */}
        <circle cx={todayX} cy={yFor(paidEndCum)} r={5.5}
          fill={warn()} stroke="white" strokeWidth={2.5} />

        {/* Marker OGGI */}
        <line x1={todayX} x2={todayX} y1={padT} y2={padT + innerH}
          stroke={warn()} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.9} />
        <g transform={`translate(${todayX}, ${padT - 18})`}>
          <rect x={-22} y={-2} width={44} height={16} rx={8}
            fill="white" stroke={warn()} strokeWidth={1} />
          <text x={0} y={10} textAnchor="middle"
            style={{ fontSize: 10, fill: warn(), fontFamily: FONT_UI, fontWeight: 700, letterSpacing: '0.08em' } as any}>
            OGGI
          </text>
        </g>

        {/* Marker Matrimonio */}
        {weddingInRange && weddingX != null && (
          <>
            <line x1={weddingX} x2={weddingX} y1={padT} y2={padT + innerH}
              stroke={ink(2)} strokeWidth={1} strokeDasharray="2 4" opacity={0.7} />
            <g transform={`translate(${weddingX}, ${padT - 18})`}>
              <rect x={-14} y={-2} width={28} height={16} rx={8}
                fill="white" stroke={ink(2)} strokeWidth={1} />
              <text x={0} y={11} textAnchor="middle"
                style={{ fontSize: 11, fill: ink(2), fontFamily: FONT_UI, fontWeight: 600 } as any}>
                ♥
              </text>
            </g>
          </>
        )}

        {/* Target label (in alto a destra) */}
        <g transform={`translate(${padL + innerW - 4}, ${yFor(target) - 6})`}>
          <text x={0} y={0} textAnchor="end"
            style={{ fontSize: 10, fill: ink(2), fontFamily: FONT_UI, fontWeight: 600 } as any}>
            Target {fmt(target)}
          </text>
        </g>

        {/* X ticks mese */}
        {monthTicks.map((m, i) => {
          if (i % tickStride !== 0) return null;
          const x = xFor(m.t);
          if (x < padL - 2 || x > padL + innerW + 2) return null;
          const isFirst = i === 0;
          const isLast = i >= monthTicks.length - tickStride;
          const anchor: 'start' | 'end' | 'middle' = isFirst ? 'start' : isLast ? 'end' : 'middle';
          return (
            <g key={m.t}>
              <line x1={x} x2={x} y1={padT + innerH} y2={padT + innerH + 4}
                stroke={border()} strokeWidth={1} />
              <text x={x} y={H - 22} textAnchor={anchor}
                style={{ fontSize: 10, fill: ink(3), fontFamily: FONT_UI, letterSpacing: '0.06em', textTransform: 'uppercase' } as any}>
                {m.label}
              </text>
            </g>
          );
        })}

        {/* Hover: crosshair + doppio cerchio + tooltip finanziario */}
        {hoverX != null && hoverState && hoverDate && (
          <g pointerEvents="none">
            <line x1={hoverX} x2={hoverX} y1={padT} y2={padT + innerH}
              stroke={ink(2)} strokeWidth={1} strokeDasharray="2 2" opacity={0.55} />
            {/* punto sulla curva totale */}
            <circle cx={hoverX} cy={yFor(hoverState.cumTotal)} r={4.5}
              fill="white" stroke={brand()} strokeWidth={2} />
            {/* punto sulla curva paid */}
            <circle cx={hoverX} cy={yFor(hoverState.cumPaid)} r={3.5}
              fill={brand()} stroke="white" strokeWidth={1.5} />

            {(() => {
              const daVersare = Math.max(0, hoverState.cumTotal - hoverState.cumPaid);
              const hasBreakdown = hoverStep && hoverStep.events.length > 0;
              const breakdownH = hasBreakdown ? Math.min(3, hoverStep!.events.length) * 12 + 10 : 0;
              const boxW = 218;
              const boxH = 92 + breakdownH;
              const flipX = hoverX + boxW + 14 > padL + innerW;
              const bx = flipX ? hoverX - boxW - 12 : hoverX + 12;
              const yAnchor = yFor(hoverState.cumTotal);
              const by = Math.min(padT + innerH - boxH, Math.max(padT, yAnchor - boxH / 2));
              return (
                <g transform={`translate(${bx}, ${by})`}>
                  <rect width={boxW} height={boxH} rx={8}
                    fill="white" stroke={border()} strokeWidth={1}
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.10))' }} />
                  {/* Data */}
                  <text x={12} y={18}
                    style={{ fontSize: 11, fill: ink(2), fontFamily: FONT_UI, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' } as any}>
                    {hoverDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </text>
                  <line x1={12} x2={boxW - 12} y1={26} y2={26} stroke={border()} strokeWidth={1} />
                  {/* Cumulato */}
                  <text x={12} y={44}
                    style={{ fontSize: 10, fill: ink(3), fontFamily: FONT_UI } as any}>
                    Cumulato entro data
                  </text>
                  <text x={boxW - 12} y={44} textAnchor="end"
                    style={{ fontSize: 12, fill: ink(), fontFamily: FONT_MONO, fontWeight: 700 } as any}>
                    {fmt(hoverState.cumTotal)}
                  </text>
                  {/* Già pagato */}
                  <text x={12} y={60}
                    style={{ fontSize: 10, fill: ink(3), fontFamily: FONT_UI } as any}>
                    Già pagato
                  </text>
                  <text x={boxW - 12} y={60} textAnchor="end"
                    style={{ fontSize: 12, fill: ink(2), fontFamily: FONT_MONO, fontWeight: 600 } as any}>
                    {fmt(hoverState.cumPaid)}
                  </text>
                  {/* Da versare */}
                  <text x={12} y={78}
                    style={{ fontSize: 10, fill: warn(), fontFamily: FONT_UI, fontWeight: 700 } as any}>
                    Liquidità necessaria
                  </text>
                  <text x={boxW - 12} y={78} textAnchor="end"
                    style={{ fontSize: 13, fill: warn(), fontFamily: FONT_MONO, fontWeight: 800 } as any}>
                    {fmt(daVersare)}
                  </text>
                  {/* Breakdown se cursore su una data con eventi */}
                  {hasBreakdown && (
                    <>
                      <line x1={12} x2={boxW - 12} y1={88} y2={88} stroke={border()} strokeWidth={1} strokeDasharray="2 2" />
                      {hoverStep!.events.slice(0, 3).map((ev, idx) => (
                        <g key={idx} transform={`translate(0, ${100 + idx * 12})`}>
                          <text x={12} y={0}
                            style={{ fontSize: 10, fill: ink(2), fontFamily: FONT_UI } as any}>
                            {ev.kind === 'paid' ? '✓' : '•'} {ev.payment.vendorName.slice(0, 22)}
                          </text>
                          <text x={boxW - 12} y={0} textAnchor="end"
                            style={{ fontSize: 10, fill: ink(), fontFamily: FONT_MONO, fontWeight: 600 } as any}>
                            {fmt(ev.amount)}
                          </text>
                        </g>
                      ))}
                    </>
                  )}
                </g>
              );
            })()}
          </g>
        )}
      </svg>
      </div>

      {/* Sotto-riga esplicativa */}
      <div style={{
        marginTop: 8, fontSize: 11, color: ink(3), fontFamily: FONT_UI,
        display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <span>
          Sei al <strong style={{ color: ink() }}>{Math.round((paidEndCum / target) * 100)}%</strong> del percorso ·
          Liquidità totale ancora da versare <strong style={{ color: warn() }}>{fmt(totalFuture)}</strong>
          {nextEv && (
            <> · Prossima rata <strong style={{ color: ink() }}>
              {new Date(nextEv.t).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
            </strong></>
          )}
        </span>
        <span style={{ color: ink(3), fontStyle: 'italic' }}>Passa il mouse per vedere la liquidità richiesta a ogni data</span>
      </div>
    </div>
  );
}
