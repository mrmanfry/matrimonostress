// Unified expenses + payments table with filter chips.
import * as React from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { PaperCard, PaperBadge, FONT_SERIF, FONT_UI, FONT_MONO, ink, surface, border, success, warn, brand } from './paperPrimitives';
import { fmt, daysFromToday, type UiVendor, type UiPayment } from '@/lib/budgetAggregates';

export type FilterKey = 'all' | '7' | '30' | '90' | 'due' | 'paid';

interface Props {
  vendors: UiVendor[];
  filter: FilterKey;
  setFilter: (f: FilterKey) => void;
  onOpenVendor: (id: string) => void;
  onAdd?: () => void;
  onMarkPaid?: (payment: UiPayment) => void;
}

interface Row {
  vendor: UiVendor;
  total: number;
  paid: number;
  remaining: number;
  nextDue: UiPayment | null;
  status: 'paid' | 'partial' | 'unpaid';
  paidRatio: number;
}

export function ExpensesTable({ vendors, filter, setFilter, onOpenVendor, onAdd, onMarkPaid }: Props) {
  const [search, setSearch] = React.useState('');

  const rows: Row[] = vendors.map(v => {
    const due = v.payments.filter(p => p.status === 'due').sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
    return {
      vendor: v,
      total: v.total,
      paid: v.paid,
      remaining: Math.max(0, v.total - v.paid),
      nextDue: due[0] ?? null,
      status: v.paid >= v.total && v.total > 0 ? 'paid' : v.paid === 0 ? 'unpaid' : 'partial',
      paidRatio: v.total > 0 ? Math.min(1, v.paid / v.total) : 0,
    };
  });

  const filtered = rows.filter(r => {
    if (search && !r.vendor.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === '7' || filter === '30' || filter === '90') {
      const w = Number(filter);
      if (!r.nextDue) return false;
      const d = daysFromToday(r.nextDue.due);
      return d >= 0 && d <= w;
    }
    if (filter === 'due') return r.status !== 'paid';
    if (filter === 'paid') return r.status === 'paid';
    return true;
  });

  const totalCols = {
    total: filtered.reduce((s, r) => s + r.total, 0),
    paid: filtered.reduce((s, r) => s + r.paid, 0),
    remaining: filtered.reduce((s, r) => s + r.remaining, 0),
  };

  return (
    <PaperCard padding={0}>
      <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${border()}` }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 16, marginBottom: 14, flexWrap: 'wrap',
        }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 19, color: ink() }}>
              Spese e fornitori
            </h3>
            <p style={{ margin: '4px 0 0', color: ink(3), fontSize: 12, fontFamily: FONT_UI }}>
              {filtered.length} {filtered.length === 1 ? 'voce' : 'voci'} · Clicca per il piano pagamenti
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 220 }}>
              <Search style={{ position: 'absolute', left: 10, top: 9, width: 14, height: 14, color: ink(3) }}/>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cerca fornitore…"
                style={{
                  width: '100%', height: 32, padding: '0 12px 0 32px',
                  background: surface(), border: `1px solid ${border()}`,
                  borderRadius: 8, fontSize: 13, color: ink(),
                  outline: 'none', fontFamily: FONT_UI,
                }}
              />
            </div>
            {onAdd && (
              <button
                onClick={onAdd}
                style={{
                  height: 32, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: brand(), color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: FONT_UI,
                }}
              >
                <Plus className="h-3.5 w-3.5"/> Aggiungi
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Tutte ({rows.length})</Chip>
          <Chip active={filter === '7'} onClick={() => setFilter('7')} tone="warn">Prossimi 7gg</Chip>
          <Chip active={filter === '30'} onClick={() => setFilter('30')} tone="warn">30gg</Chip>
          <Chip active={filter === '90'} onClick={() => setFilter('90')} tone="warn">90gg</Chip>
          <div style={{ width: 1, height: 22, background: border(), margin: '0 4px' }}/>
          <Chip active={filter === 'due'} onClick={() => setFilter('due')}>Da saldare</Chip>
          <Chip active={filter === 'paid'} onClick={() => setFilter('paid')} tone="success">Saldate</Chip>
        </div>
      </div>

      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: FONT_UI }}>
          <thead>
            <tr style={{ background: 'hsl(var(--paper-surface-muted))' }}>
              <Th>Fornitore</Th>
              <Th>Categoria</Th>
              <Th align="right">Impegno</Th>
              <Th align="right">Pagato</Th>
              <Th>Prossima rata</Th>
              <Th align="center" style={{ width: 120 }}>Stato</Th>
              <Th align="right" style={{ width: 140 }}>{''}</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <ExpenseRow key={r.vendor.id} row={r} onOpen={() => onOpenVendor(r.vendor.id)} onMarkPaid={onMarkPaid} />
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: ink(3) }}>
                Nessuna voce corrisponde ai filtri.
              </td></tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr style={{ background: 'hsl(var(--paper-surface-muted))', borderTop: `2px solid ${border(true)}` }}>
                <Td style={{ fontWeight: 600, fontFamily: FONT_SERIF, fontSize: 14 }}>Totale</Td>
                <Td>{''}</Td>
                <Td align="right" mono style={{ fontWeight: 600 }}>{fmt(totalCols.total)}</Td>
                <Td align="right" mono style={{ fontWeight: 600, color: success() }}>{fmt(totalCols.paid)}</Td>
                <Td align="right" mono style={{ fontWeight: 600, color: warn() }}>{fmt(totalCols.remaining)} residuo</Td>
                <Td>{''}</Td>
                <Td>{''}</Td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </PaperCard>
  );
}

function Th({ children, align = 'left', style }: { children: React.ReactNode; align?: 'left' | 'right' | 'center'; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: '10px 16px', textAlign: align, fontWeight: 500, fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase', color: ink(3),
      borderBottom: `1px solid ${border()}`, ...style,
    }}>{children}</th>
  );
}

function Td({ children, align = 'left', mono, style, onClick }: { children: React.ReactNode; align?: 'left' | 'right' | 'center'; mono?: boolean; style?: React.CSSProperties; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <td onClick={onClick} style={{
      padding: '14px 16px', textAlign: align,
      fontFamily: mono ? FONT_MONO : 'inherit', color: ink(), ...style,
    }}>{children}</td>
  );
}

function Chip({ children, active, onClick, tone }: { children: React.ReactNode; active: boolean; onClick: () => void; tone?: 'warn' | 'success' }) {
  const colors = tone === 'warn'
    ? { bg: 'hsl(var(--paper-warn-tint))', fg: warn(), bd: 'hsl(39 60% 80%)' }
    : tone === 'success'
      ? { bg: 'hsl(var(--paper-success-tint))', fg: success(), bd: 'hsl(138 30% 80%)' }
      : { bg: brand('tint'), fg: brand('ink'), bd: 'hsl(258 77% 89%)' };
  return (
    <button onClick={onClick} style={{
      height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500,
      background: active ? colors.bg : surface(),
      color: active ? colors.fg : ink(2),
      border: `1px solid ${active ? colors.bd : border()}`,
      borderRadius: 999, cursor: 'pointer', fontFamily: FONT_UI,
    }}>{children}</button>
  );
}

function ExpenseRow({ row, onOpen, onMarkPaid }: { row: Row; onOpen: () => void; onMarkPaid?: (p: UiPayment) => void }) {
  const { vendor, total, paid, nextDue, status, paidRatio } = row;
  const daysLeft = nextDue ? daysFromToday(nextDue.due) : null;
  const statusTone = status === 'paid' ? 'success' : status === 'partial' ? 'warn' : 'neutral';
  const statusLabel = status === 'paid' ? 'Saldato' : status === 'partial' ? 'Parziale' : 'Da avviare';

  return (
    <tr
      onClick={onOpen}
      style={{ borderBottom: `1px solid ${border()}`, cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--paper-surface-muted))')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Td>
        <div style={{ fontWeight: 500, color: ink() }}>{vendor.name}</div>
        <div style={{ fontSize: 11, color: ink(3), marginTop: 2 }}>
          {vendor.items.length} {vendor.items.length === 1 ? 'voce' : 'voci'} · {vendor.payments.length} {vendor.payments.length === 1 ? 'rata' : 'rate'}
        </div>
      </Td>
      <Td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: vendor.categoryTone }}/>
          <span style={{ fontSize: 12, color: ink(2) }}>{vendor.categoryName}</span>
        </span>
      </Td>
      <Td align="right" mono style={{ fontWeight: 500 }}>{fmt(total)}</Td>
      <Td align="right">
        <div style={{ fontFamily: FONT_MONO, color: paid > 0 ? success() : ink(3) }}>{fmt(paid)}</div>
        <div style={{ height: 3, background: 'hsl(36 28% 88%)', borderRadius: 2, marginTop: 4, overflow: 'hidden', width: 80, marginLeft: 'auto' }}>
          <div style={{ height: '100%', width: `${paidRatio * 100}%`, background: success() }}/>
        </div>
      </Td>
      <Td>
        {nextDue ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              textAlign: 'center', minWidth: 42, padding: '4px 6px',
              background: daysLeft != null && daysLeft <= 7 ? 'hsl(var(--paper-warn-tint))' : 'hsl(var(--paper-surface-muted))',
              border: `1px solid ${daysLeft != null && daysLeft <= 7 ? 'hsl(39 60% 80%)' : border()}`,
              borderRadius: 6,
            }}>
              <div style={{
                fontSize: 9, color: daysLeft != null && daysLeft <= 7 ? warn() : ink(3),
                letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
              }}>{new Date(nextDue.due).toLocaleDateString('it-IT', { month: 'short' })}</div>
              <div style={{
                fontSize: 14, fontWeight: 600,
                color: daysLeft != null && daysLeft <= 7 ? warn() : ink(),
                lineHeight: 1,
              }}>{new Date(nextDue.due).getDate()}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: ink(), fontWeight: 500 }}>{fmt(nextDue.amount)}</div>
              <div style={{ fontSize: 11, color: ink(3) }}>
                {daysLeft === 0 ? 'Oggi' : daysLeft === 1 ? 'Domani' : daysLeft != null && daysLeft > 0 ? `tra ${daysLeft} gg` : daysLeft != null ? `${-daysLeft} gg fa` : ''}
              </div>
            </div>
          </div>
        ) : <span style={{ fontSize: 12, color: ink(3), fontStyle: 'italic' }}>—</span>}
      </Td>
      <Td align="center">
        <PaperBadge tone={statusTone as 'success' | 'warn' | 'neutral'} size="sm">{statusLabel}</PaperBadge>
      </Td>
      <Td align="right" onClick={e => e.stopPropagation()}>
        {status !== 'paid' && nextDue && onMarkPaid && (
          <button
            onClick={() => onMarkPaid(nextDue)}
            style={{
              height: 26, padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'transparent', color: ink(2), border: 'none',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: FONT_UI,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'hsl(var(--paper-surface-muted))')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Check className="h-3 w-3"/> Segna pagato
          </button>
        )}
      </Td>
    </tr>
  );
}
