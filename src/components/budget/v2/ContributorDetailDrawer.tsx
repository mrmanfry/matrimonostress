// Drawer that shows the per-payment breakdown of what a contributor has paid.
import * as React from 'react';
import { X } from 'lucide-react';
import {
  PaperCard, PaperBadge, FONT_SERIF, FONT_UI, FONT_MONO,
  ink, surface, border, success,
} from './paperPrimitives';
import { fmt, fmtDate, type UiContributor, type UiVendor, type DbAllocation } from '@/lib/budgetAggregates';

interface Props {
  contributor: UiContributor | null;
  vendors: UiVendor[];
  allocations: DbAllocation[];
  onClose: () => void;
}

interface PaidRow {
  paymentId: string;
  vendorName: string;
  desc: string;
  due: string;
  paymentAmount: number;
  contributorAmount: number;
  share: number; // 0..1
}

export function ContributorDetailDrawer({ contributor, vendors, allocations, onClose }: Props) {
  const open = !!contributor;

  const rows = React.useMemo<PaidRow[]>(() => {
    if (!contributor) return [];
    // Index payments by id (only paid ones contribute to "what they actually paid")
    const paymentIndex = new Map<string, { vendorName: string; desc: string; due: string; amount: number }>();
    for (const v of vendors) {
      for (const p of v.payments) {
        if (p.status !== 'paid') continue;
        paymentIndex.set(p.id, { vendorName: v.name, desc: p.desc, due: p.due, amount: p.amount });
      }
    }
    const out: PaidRow[] = [];
    for (const a of allocations) {
      if (a.contributor_id !== contributor.id) continue;
      const meta = paymentIndex.get(a.payment_id);
      if (!meta) continue; // skip unpaid (shouldn't happen, but safe)
      const amt = Number(a.amount || 0);
      out.push({
        paymentId: a.payment_id,
        vendorName: meta.vendorName,
        desc: meta.desc,
        due: meta.due,
        paymentAmount: meta.amount,
        contributorAmount: amt,
        share: meta.amount > 0 ? amt / meta.amount : 0,
      });
    }
    return out.sort((a, b) => new Date(b.due).getTime() - new Date(a.due).getTime());
  }, [contributor, vendors, allocations]);

  const totalPaid = rows.reduce((s, r) => s + r.contributorAmount, 0);
  const remaining = contributor ? Math.max(0, contributor.target - totalPaid) : 0;
  const pct = contributor && contributor.target > 0 ? (totalPaid / contributor.target) * 100 : 0;

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(43,37,32,.34)',
            zIndex: 60, animation: 'fadeIn .15s ease',
          }}
        />
      )}
      <aside
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(560px, 96vw)', background: surface(),
          borderLeft: `1px solid ${border()}`,
          boxShadow: '-12px 0 40px rgba(43,37,32,.18)',
          zIndex: 61, transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform .25s ease', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {contributor && (
          <>
            {/* Header */}
            <div style={{
              padding: '20px 24px 18px', borderBottom: `1px solid ${border()}`,
              display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 999,
                background: contributor.color + '22', color: contributor.color,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, fontFamily: FONT_UI, flexShrink: 0,
              }}>
                {contributor.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '·'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  margin: 0, fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 500,
                  color: ink(),
                }}>{contributor.name}</h2>
                <p style={{
                  margin: '4px 0 0', fontSize: 12, fontFamily: FONT_UI, color: ink(3),
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  Contributore · {rows.length} {rows.length === 1 ? 'pagamento' : 'pagamenti'}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'transparent', border: `1px solid ${border()}`,
                  borderRadius: 8, padding: 6, cursor: 'pointer', color: ink(2),
                  display: 'inline-flex',
                }}
                aria-label="Chiudi"
              >
                <X size={16} />
              </button>
            </div>

            {/* Summary */}
            <div style={{ padding: '18px 24px 8px' }}>
              <PaperCard padding={16}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{
                    fontSize: 11, fontFamily: FONT_UI, color: ink(3),
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                  }}>Versato</span>
                  <span style={{ fontFamily: FONT_SERIF, fontSize: 26, fontWeight: 500, color: success() }}>
                    {fmt(totalPaid)}
                  </span>
                </div>
                <div style={{ height: 8, background: 'hsl(36 28% 88%)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: contributor.color, transition: 'width .3s' }}/>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, fontFamily: FONT_UI, color: ink(3),
                }}>
                  <span>{pct.toFixed(0)}% del target ({fmt(contributor.target)})</span>
                  <span>{fmt(remaining)} mancanti</span>
                </div>
              </PaperCard>
            </div>

            {/* Payments list */}
            <div style={{ padding: '14px 24px 24px', flex: 1 }}>
              <div style={{
                fontSize: 11, fontFamily: FONT_UI, color: ink(3),
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Dettaglio pagamenti
              </div>

              {rows.length === 0 ? (
                <PaperCard padding={24}>
                  <div style={{ textAlign: 'center', color: ink(3), fontSize: 13, fontFamily: FONT_UI }}>
                    Nessun pagamento attribuito a {contributor.name}.<br/>
                    <span style={{ fontSize: 11 }}>
                      Quando segni un pagamento come pagato, scegli chi l'ha versato per vederlo qui.
                    </span>
                  </div>
                </PaperCard>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {rows.map(r => (
                    <PaperCard key={r.paymentId} padding={14}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{
                            fontFamily: FONT_UI, fontSize: 14, fontWeight: 600, color: ink(),
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{r.vendorName}</div>
                          <div style={{
                            fontFamily: FONT_UI, fontSize: 12, color: ink(3), marginTop: 2,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>{r.desc}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 600, color: ink() }}>
                            {fmt(r.contributorAmount)}
                          </div>
                          {r.share < 0.999 && (
                            <div style={{ fontFamily: FONT_UI, fontSize: 10, color: ink(3) }}>
                              {(r.share * 100).toFixed(0)}% di {fmt(r.paymentAmount)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        paddingTop: 6, borderTop: `1px dashed ${border()}`,
                      }}>
                        <span style={{ fontSize: 11, fontFamily: FONT_UI, color: ink(3) }}>
                          {fmtDate(r.due)}
                        </span>
                        <PaperBadge tone="success" size="sm">Pagato</PaperBadge>
                      </div>
                    </PaperCard>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  );
}
