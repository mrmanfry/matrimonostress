// Allocation by category + Funds (contributors).
import * as React from 'react';
import { PaperCard, PaperBadge, FONT_SERIF, FONT_UI, FONT_MONO, ink, surface, border, success } from './paperPrimitives';
import { fmt, byCategory, type UiVendor, type UiContributor } from '@/lib/budgetAggregates';

interface AllocationProps { vendors: UiVendor[]; }

export function AllocationCard({ vendors }: AllocationProps) {
  const cats = byCategory(vendors);
  const total = cats.reduce((s, c) => s + c.committed, 0);

  return (
    <PaperCard padding={0}>
      <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${border()}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 19, color: ink() }}>
              Allocazione per categoria
            </h3>
            <p style={{ margin: '4px 0 0', color: ink(3), fontSize: 12, fontFamily: FONT_UI }}>
              Come sono distribuiti gli impegni firmati
            </p>
          </div>
          <PaperBadge tone="neutral" size="sm">{cats.length} voci</PaperBadge>
        </div>
      </div>

      <div style={{ padding: '16px 24px 20px' }}>
        {cats.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: ink(3), fontSize: 13, fontFamily: FONT_UI }}>
            Nessun impegno categorizzato.
          </div>
        )}
        {cats.map((c, i) => {
          const pct = total > 0 ? (c.committed / total) * 100 : 0;
          const paidPctOfTotal = total > 0 ? (c.paid / total) * 100 : 0;
          return (
            <div key={c.id} style={{
              padding: '10px 0',
              borderBottom: i < cats.length - 1 ? `1px solid ${border()}` : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: c.tone, flexShrink: 0 }}/>
                  <span style={{
                    fontSize: 13, color: ink(), fontWeight: 500,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontFamily: FONT_UI,
                  }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: ink(3), fontFamily: FONT_MONO }}>{pct.toFixed(0)}%</span>
                </div>
                <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: ink(), flexShrink: 0 }}>{fmt(c.committed)}</span>
              </div>
              <div style={{ height: 6, background: 'hsl(36 28% 88%)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: c.tone, opacity: .25 }}/>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${paidPctOfTotal}%`, background: c.tone }}/>
              </div>
            </div>
          );
        })}
      </div>
    </PaperCard>
  );
}

interface FundsProps {
  contributors: UiContributor[];
  onSelectContributor?: (c: UiContributor) => void;
}

export function FundsCard({ contributors, onSelectContributor }: FundsProps) {
  const totalPaid = contributors.reduce((s, c) => s + c.paid, 0);

  return (
    <PaperCard padding={0}>
      <div style={{
        padding: '18px 24px 14px', borderBottom: `1px solid ${border()}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12,
      }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 19, color: ink() }}>
            Fondi di progetto
          </h3>
          <p style={{ margin: '4px 0 0', color: ink(3), fontSize: 12, fontFamily: FONT_UI }}>
            Contributi rispetto ai target concordati
          </p>
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        {contributors.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: ink(3), fontSize: 13, fontFamily: FONT_UI }}>
            Nessun contributore configurato.
          </div>
        )}
        {contributors.map(c => {
          const pct = c.target > 0 ? (c.paid / c.target) * 100 : 0;
          const initials = c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
          return (
            <div
              key={c.id}
              role={onSelectContributor ? 'button' : undefined}
              tabIndex={onSelectContributor ? 0 : -1}
              onClick={onSelectContributor ? () => onSelectContributor(c) : undefined}
              onKeyDown={onSelectContributor ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectContributor(c); } } : undefined}
              style={{
                marginBottom: 14,
                padding: onSelectContributor ? '8px 10px' : 0,
                margin: onSelectContributor ? '0 -10px 6px' : '0 0 18px',
                borderRadius: 8,
                cursor: onSelectContributor ? 'pointer' : 'default',
                transition: 'background .15s',
              }}
              onMouseEnter={onSelectContributor ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(36 28% 95%)'; } : undefined}
              onMouseLeave={onSelectContributor ? (e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; } : undefined}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 999,
                  background: 'hsl(258 100% 96%)', color: 'hsl(258 73% 56%)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, fontFamily: FONT_UI, flexShrink: 0,
                }}>{initials || '·'}</div>
                <span style={{ fontSize: 14, fontWeight: 500, color: ink(), flex: 1, fontFamily: FONT_UI }}>{c.name}</span>
                <span style={{ fontSize: 13, fontFamily: FONT_MONO, color: ink(2) }}>
                  <span style={{ color: ink(), fontWeight: 500 }}>{fmt(c.paid)}</span>
                  <span style={{ color: ink(3) }}> / {fmt(c.target)}</span>
                </span>
              </div>
              <div style={{ height: 8, background: 'hsl(36 28% 88%)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: c.color, transition: 'width .3s' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: ink(3), fontFamily: FONT_UI }}>
                <span>{pct.toFixed(0)}% versato</span>
                <span>{fmt(Math.max(0, c.target - c.paid))} mancanti</span>
              </div>
            </div>
          );
        })}
        <div style={{
          marginTop: 8, paddingTop: 14, borderTop: `1px solid ${border()}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: ink(3), fontFamily: FONT_UI }}>
            Totale versato
          </span>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 500, color: success() }}>
            {fmt(totalPaid)}
          </span>
        </div>
      </div>
    </PaperCard>
  );
}
