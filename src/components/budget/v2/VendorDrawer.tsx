// Side drawer with vendor expense items + payment timeline.
import * as React from 'react';
import { X, Check, Edit, Plus } from 'lucide-react';
import { PaperBadge, FONT_SERIF, FONT_UI, FONT_MONO, ink, surface, border, success, warn, SectionLabel } from './paperPrimitives';
import { fmt, fmtDate, daysFromToday, type UiVendor, type UiPayment } from '@/lib/budgetAggregates';

interface Props {
  vendor: UiVendor | null;
  onClose: () => void;
  onMarkPaid?: (payment: UiPayment) => void;
  onOpenVendorPage?: (vendorId: string) => void;
}

export function VendorDrawer({ vendor, onClose, onMarkPaid, onOpenVendorPage }: Props) {
  if (!vendor) return null;
  const total = vendor.total;
  const paid = vendor.paid;

  const isSynthetic = vendor.id.startsWith('__cat__');

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(43,37,32,0.35)',
          zIndex: 40, animation: 'budgetFadeIn .2s',
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, maxWidth: '100vw',
        background: 'hsl(var(--paper-bg))', borderLeft: `1px solid ${border()}`,
        boxShadow: '0 2px 4px rgba(43,37,32,.04), 0 24px 48px -16px rgba(43,37,32,.14)',
        zIndex: 50, overflow: 'auto', fontFamily: FONT_UI,
        animation: 'budgetSlideIn .25s ease-out',
      }}>
        <div style={{
          padding: '22px 28px', background: surface(),
          borderBottom: `1px solid ${border()}`, position: 'sticky', top: 0, zIndex: 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: vendor.categoryTone }}/>
                <span style={{ fontSize: 11, color: ink(3), letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {vendor.categoryName}
                </span>
              </div>
              <h2 style={{ margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 24, color: ink() }}>
                {vendor.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Chiudi"
              style={{
                width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer', color: ink(2),
                borderRadius: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--paper-surface-muted))')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X className="h-4 w-4"/>
            </button>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
            marginTop: 18, paddingTop: 18, borderTop: `1px solid ${border()}`,
          }}>
            <MiniStat label="Impegno" value={fmt(total)} first />
            <MiniStat label="Pagato" value={fmt(paid)} tone="success" />
            <MiniStat label="Residuo" value={fmt(Math.max(0, total - paid))} tone="warn" last />
          </div>
        </div>

        <div style={{ padding: '20px 28px' }}>
          <SectionLabel>Voci di spesa</SectionLabel>
          <div style={{
            background: surface(), border: `1px solid ${border()}`,
            borderRadius: 10, overflow: 'hidden',
          }}>
            {vendor.items.length === 0 && (
              <div style={{ padding: 16, color: ink(3), fontSize: 13, textAlign: 'center' }}>
                Nessuna voce di spesa registrata.
              </div>
            )}
            {vendor.items.map((it, i) => (
              <div key={it.id} style={{
                padding: '12px 16px',
                borderBottom: i < vendor.items.length - 1 ? `1px solid ${border()}` : 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 13, color: ink() }}>{it.desc}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: ink() }}>{fmt(it.total)}</div>
                  {it.paid > 0 && (
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: success() }}>
                      {fmt(it.paid)} pagati
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <SectionLabel style={{ marginTop: 24 }}>Piano pagamenti</SectionLabel>
          {vendor.payments.length === 0 ? (
            <div style={{
              padding: 16, background: 'hsl(var(--paper-surface-muted))',
              border: `1px dashed ${border(true)}`, borderRadius: 10, textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: ink(2), marginBottom: 10 }}>
                Nessun piano pagamenti definito
              </div>
            </div>
          ) : (
            <PaymentTimeline payments={vendor.payments} onMarkPaid={onMarkPaid} />
          )}

          {!isSynthetic && onOpenVendorPage && (
            <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => onOpenVendorPage(vendor.id)}
                style={btnSecondary}
              >
                <Edit className="h-3.5 w-3.5"/> Apri scheda fornitore
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes budgetFadeIn { from {opacity:0} to {opacity:1} }
        @keyframes budgetSlideIn { from {transform:translateX(100%)} to {transform:translateX(0)} }
      `}</style>
    </>
  );
}

const btnSecondary: React.CSSProperties = {
  height: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'hsl(var(--paper-surface))', color: 'hsl(var(--paper-ink))',
  border: '1px solid hsl(var(--paper-border))',
  borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: FONT_UI,
};

function MiniStat({ label, value, tone, first, last }: { label: string; value: string; tone?: 'success' | 'warn'; first?: boolean; last?: boolean }) {
  const color = tone === 'success' ? success() : tone === 'warn' ? warn() : ink();
  return (
    <div style={{
      paddingRight: last ? 0 : 16,
      paddingLeft: first ? 0 : 16,
      borderRight: last ? 'none' : `1px solid ${border()}`,
    }}>
      <div style={{ fontSize: 10, color: ink(3), letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color, letterSpacing: -0.2 }}>{value}</div>
    </div>
  );
}

function PaymentTimeline({ payments, onMarkPaid }: { payments: UiPayment[]; onMarkPaid?: (p: UiPayment) => void }) {
  const sorted = [...payments].sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 1, background: border() }}/>
      {sorted.map((p, i) => {
        const isPaid = p.status === 'paid';
        const days = daysFromToday(p.due);
        const urgent = !isPaid && days >= 0 && days <= 7;
        return (
          <div key={p.id} style={{ position: 'relative', paddingBottom: i < sorted.length - 1 ? 18 : 0 }}>
            <div style={{
              position: 'absolute', left: -20, top: 4, width: 15, height: 15, borderRadius: 999,
              background: isPaid ? success() : urgent ? warn() : surface(),
              border: `2px solid ${isPaid ? success() : urgent ? warn() : border(true)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isPaid && <Check className="h-2 w-2" color="#fff"/>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: ink(), fontWeight: 500 }}>{p.desc}</div>
                <div style={{ fontSize: 11, color: ink(3), marginTop: 2 }}>
                  {fmtDate(p.due)}{!isPaid && days >= 0 ? ` · tra ${days} gg` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: isPaid ? success() : ink(), fontWeight: 500 }}>
                  {fmt(p.amount)}
                </div>
                <PaperBadge tone={isPaid ? 'success' : urgent ? 'warn' : 'neutral'} size="sm" style={{ marginTop: 4 }}>
                  {isPaid ? 'Pagato' : urgent ? 'In scadenza' : 'Da pagare'}
                </PaperBadge>
                {!isPaid && onMarkPaid && (
                  <div style={{ marginTop: 6 }}>
                    <button
                      onClick={() => onMarkPaid(p)}
                      style={{
                        height: 24, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'transparent', color: ink(2), border: `1px solid ${border()}`,
                        borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: FONT_UI,
                      }}
                    >
                      <Check className="h-3 w-3"/> Segna pagato
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
