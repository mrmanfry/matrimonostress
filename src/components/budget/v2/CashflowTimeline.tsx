// Cashflow timeline — monthly aggregate bars.
import * as React from 'react';
import { PaperCard, PaperBadge, FONT_SERIF, FONT_UI, FONT_MONO, ink, border, brand, warn } from './paperPrimitives';
import { fmt, paymentsByMonth, type UiPayment } from '@/lib/budgetAggregates';

export function CashflowTimeline({ upcoming }: { upcoming: UiPayment[] }) {
  if (upcoming.length === 0) {
    return (
      <PaperCard>
        <div style={{ textAlign: 'center', padding: 24, color: ink(3), fontFamily: FONT_UI }}>
          Nessun pagamento futuro.
        </div>
      </PaperCard>
    );
  }

  const months = paymentsByMonth(upcoming);
  const maxMonth = Math.max(...months.map(m => m.amount), 1);
  const totalFuture = upcoming.reduce((s, p) => s + p.amount, 0);

  return (
    <PaperCard padding={0}>
      <div style={{
        padding: '18px 24px 14px', borderBottom: `1px solid ${border()}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 19, color: ink() }}>
            Orizzonte liquidità
          </h3>
          <p style={{ margin: '4px 0 0', color: ink(3), fontSize: 12, fontFamily: FONT_UI }}>
            {upcoming.length} pagamenti futuri per {fmt(totalFuture)} — distribuiti su {months.length} mesi
          </p>
        </div>
        <PaperBadge tone="warn" size="sm">Prossimi {months.length} mesi</PaperBadge>
      </div>

      <div style={{ padding: '22px 24px 14px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))`,
          gap: 8, alignItems: 'end', height: 120,
        }}>
          {months.map(m => {
            const h = (m.amount / maxMonth) * 100;
            const isBusiest = m.amount === maxMonth;
            return (
              <div key={m.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  fontSize: 11, fontFamily: FONT_MONO,
                  color: isBusiest ? warn() : ink(3),
                  fontWeight: isBusiest ? 600 : 400,
                }}>{fmt(m.amount)}</div>
                <div style={{
                  width: '100%', height: `${h}%`, minHeight: 6,
                  background: isBusiest ? warn() : brand(),
                  opacity: isBusiest ? 1 : .75,
                  borderRadius: '4px 4px 0 0',
                  position: 'relative',
                }}>
                  {m.count > 1 && (
                    <span style={{
                      position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                      fontSize: 10, color: ink(3), fontFamily: FONT_MONO,
                    }}>×{m.count}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))`, gap: 8,
          marginTop: 6, paddingTop: 8, borderTop: `1px solid ${border()}`,
        }}>
          {months.map(m => (
            <div key={m.key} style={{
              textAlign: 'center', fontSize: 11, color: ink(2),
              textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT_UI,
            }}>{m.label}</div>
          ))}
        </div>
      </div>
    </PaperCard>
  );
}
