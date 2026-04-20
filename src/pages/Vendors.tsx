// New "Paper" Vendors list page — replaces the legacy implementation.
// Mirrors the Fornitori.html prototype: hero header, status stats (filterable),
// search/category filters, grid/list toggle, vendor cards with payment health.
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X, Grid3x3, List as ListIcon, Calendar, ChevronRight, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { LockedCard } from '@/components/ui/locked-card';
import {
  PaperButton, PaperInput, PaperSelect, PaperProgress, PaperEmpty,
  ink, surface, border, brand, success, warn, FONT_SERIF, FONT_UI, FONT_MONO,
} from '@/components/vendors/v2/PaperUI';
import { PaperBadge, PaperCard } from '@/components/budget/v2/paperPrimitives';
import { VendorFormModal, VendorFormValues } from '@/components/vendors/v2/VendorFormModal';
import {
  VENDOR_STATUSES, VendorStatusId, normalizeStatus, statusById,
  fmtEUR, fmtDateShort, daysFromToday,
  vendorTotals, nextPayment, isPaymentPaid, countsByStatus,
  DbExpenseItem, DbLineItem, DbPayment, expenseItemTotal,
} from '@/lib/vendorAggregates';

interface VendorRow {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  category_id: string | null;
  wedding_id: string;
  indirizzo_sede_legale?: string | null;
  category?: { name: string } | null;
  expense_items?: DbExpenseItem[];
  payments?: DbPayment[];
  lineItemsByExpenseItem?: Record<string, DbLineItem[]>;
}

const Vendors = () => {
  const navigate = useNavigate();
  const { isCollaborator, authState } = useAuth();
  const vendorCostsHidden = isCollaborator && authState.status === 'authenticated' && !authState.activePermissions?.vendor_costs?.view;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | VendorStatusId>('all');
  const [catFilter, setCatFilter] = React.useState<string>('all');
  const [view, setView] = React.useState<'grid' | 'list'>('grid');
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingVendor, setEditingVendor] = React.useState<VendorRow | null>(null);

  // Resolve wedding id
  const { data: weddingId } = useQuery({
    queryKey: ['vendors-v2-wedding-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: ur } = await supabase
        .from('user_roles')
        .select('wedding_id')
        .eq('user_id', user.id)
        .single();
      return ur?.wedding_id || null;
    },
  });

  // Load vendors + categories + expense aggregates
  const { data, isLoading } = useQuery({
    queryKey: ['vendors-v2', weddingId],
    enabled: !!weddingId,
    queryFn: async () => {
      // 1. Vendors
      const { data: vendors, error: vErr } = await supabase
        .from('vendors')
        .select('id, name, contact_name, email, phone, status, notes, category_id, wedding_id, indirizzo_sede_legale, category:expense_categories(name)')
        .eq('wedding_id', weddingId!)
        .order('created_at', { ascending: false });
      if (vErr) throw vErr;

      // 2. Categories
      const { data: cats } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('wedding_id', weddingId!)
        .order('name');

      // 3. Expense items
      const vendorIds = (vendors || []).map(v => v.id);
      const { data: items } = vendorIds.length
        ? await supabase
            .from('expense_items')
            .select('*')
            .in('vendor_id', vendorIds)
        : { data: [] as DbExpenseItem[] };

      // 4. Line items
      const itemIds = (items || []).map(i => i.id);
      const { data: lineItems } = itemIds.length
        ? await supabase
            .from('expense_line_items')
            .select('*')
            .in('expense_item_id', itemIds)
        : { data: [] as DbLineItem[] };

      // 5. Payments
      const { data: payments } = itemIds.length
        ? await supabase
            .from('payments')
            .select('id, expense_item_id, description, amount, status, due_date, paid_on_date')
            .in('expense_item_id', itemIds)
        : { data: [] as DbPayment[] };

      // Group line items + payments by vendor
      const itemsByVendor: Record<string, DbExpenseItem[]> = {};
      (items || []).forEach((it: any) => {
        if (!it.vendor_id) return;
        (itemsByVendor[it.vendor_id] ||= []).push(it);
      });
      const lineItemsByExpenseItem: Record<string, DbLineItem[]> = {};
      (lineItems || []).forEach((li: any) => {
        (lineItemsByExpenseItem[li.expense_item_id] ||= []).push(li);
      });
      const paymentsByExpenseItem: Record<string, DbPayment[]> = {};
      (payments || []).forEach((p: any) => {
        (paymentsByExpenseItem[p.expense_item_id] ||= []).push(p);
      });

      const enriched: VendorRow[] = (vendors || []).map((v: any) => {
        const expense_items = itemsByVendor[v.id] || [];
        const vendorPayments: DbPayment[] = expense_items.flatMap(it => paymentsByExpenseItem[it.id] || []);
        return { ...v, expense_items, payments: vendorPayments, lineItemsByExpenseItem };
      });

      return { vendors: enriched, categories: cats || [] };
    },
  });

  const vendors = data?.vendors || [];
  const categories = data?.categories || [];

  // Stats
  const counts = countsByStatus(vendors);
  const totalCommitted = vendors.reduce((s, v) => s + vendorTotals(v.expense_items || [], v.lineItemsByExpenseItem || {}, v.payments || []).committed, 0);
  const totalPaid = vendors.reduce((s, v) => s + vendorTotals(v.expense_items || [], v.lineItemsByExpenseItem || {}, v.payments || []).paid, 0);
  const confirmedCount = vendors.filter(v => normalizeStatus(v.status) === 'confirmed').length;

  // Filtering
  const filtered = vendors.filter(v => {
    if (search && !(v.name || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && normalizeStatus(v.status) !== statusFilter) return false;
    if (catFilter !== 'all' && v.category_id !== catFilter) return false;
    return true;
  });

  // Save vendor (insert/update)
  const handleSaveVendor = async (values: VendorFormValues, vendorId?: string) => {
    if (!weddingId) return;
    const payload = {
      name: values.name.trim(),
      category_id: values.category_id,
      status: values.status,
      contact_name: values.contact_name || null,
      phone: values.phone || null,
      email: values.email || null,
      indirizzo_sede_legale: values.address || null,
      notes: values.notes || null,
    };
    if (vendorId) {
      const { error } = await supabase.from('vendors').update(payload).eq('id', vendorId);
      if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Fornitore aggiornato' });
    } else {
      const { error } = await supabase.from('vendors').insert([{ ...payload, wedding_id: weddingId }]);
      if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Fornitore aggiunto' });
    }
    queryClient.invalidateQueries({ queryKey: ['vendors-v2'] });
    setEditingVendor(null);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Heart size={42} style={{ color: brand('base'), animation: 'pulse 1.4s infinite' }} className="fill-current"/>
      </div>
    );
  }

  return (
    <div style={{ background: surface('muted'), minHeight: '100%', padding: '8px 0 60px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: ink(3), letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6, fontFamily: FONT_UI, fontWeight: 600 }}>
              Gestione fornitori
            </div>
            <h1 style={{
              margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 36,
              color: ink(), letterSpacing: '-0.6px', lineHeight: 1.1,
            }}>
              I vostri fornitori
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: ink(2), maxWidth: 620, fontFamily: FONT_UI }}>
              {vendors.length} contatti · {confirmedCount} confermati
              {!vendorCostsHidden && <> · <span style={{ fontFamily: FONT_MONO }}>{fmtEUR(totalPaid)}</span> già versati su <span style={{ fontFamily: FONT_MONO }}>{fmtEUR(totalCommitted)}</span> impegnati.</>}
            </p>
          </div>
          <PaperButton variant="primary" iconLeft={<Plus size={14}/>} onClick={() => { setEditingVendor(null); setFormOpen(true); }}>
            Nuovo fornitore
          </PaperButton>
        </div>

        {/* Status stats — clickable as filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
          {VENDOR_STATUSES.map(s => {
            const isActive = statusFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setStatusFilter(isActive ? 'all' : s.id)}
                style={{
                  textAlign: 'left', padding: '16px 18px',
                  background: isActive ? brand('tint') : surface(),
                  border: `1px solid ${isActive ? brand('base') : border()}`,
                  borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                  boxShadow: '0 1px 2px rgba(43,37,32,.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: s.dot }}/>
                  <span style={{ fontSize: 11, color: ink(3), letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, fontFamily: FONT_UI }}>{s.label}</span>
                </div>
                <div style={{ fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 500, color: ink(), lineHeight: 1, letterSpacing: '-0.4px' }}>
                  {counts[s.id] || 0}
                </div>
                <div style={{ fontSize: 12, color: ink(3), marginTop: 6, lineHeight: 1.4, fontFamily: FONT_UI }}>{s.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Filters bar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 280px', minWidth: 240, maxWidth: 360 }}>
            <PaperInput
              iconLeft={<Search size={14}/>}
              placeholder="Cerca fornitore…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <PaperSelect
            value={catFilter}
            onChange={setCatFilter}
            options={[{ value: 'all', label: 'Tutte le categorie' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
            style={{ width: 220 }}
          />
          {statusFilter !== 'all' && (
            <PaperButton variant="ghost" size="sm" iconLeft={<X size={12}/>} onClick={() => setStatusFilter('all')}>
              Stato: {statusById(statusFilter).label}
            </PaperButton>
          )}
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 13, color: ink(3), fontFamily: FONT_UI }}>{filtered.length} risultati</span>
          <div style={{ display: 'inline-flex', border: `1px solid ${border(true)}`, borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setView('grid')} style={segBtnStyle(view === 'grid')} title="Griglia">
              <Grid3x3 size={14}/>
            </button>
            <button onClick={() => setView('list')} style={segBtnStyle(view === 'list')} title="Lista">
              <ListIcon size={14}/>
            </button>
          </div>
        </div>

        {/* Grid / List */}
        {filtered.length === 0 ? (
          <PaperCard padding={40}>
            <PaperEmpty
              title={vendors.length === 0 ? 'Nessun fornitore ancora' : 'Nessun risultato'}
              desc={vendors.length === 0
                ? 'Aggiungi il primo fornitore: location, fotografo, catering…'
                : 'Prova a modificare i filtri o la ricerca.'}
              cta={vendors.length === 0 && (
                <PaperButton variant="primary" iconLeft={<Plus size={14}/>} onClick={() => setFormOpen(true)}>
                  Nuovo fornitore
                </PaperButton>
              )}
            />
          </PaperCard>
        ) : view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {filtered.map(v => (
              <VendorCard
                key={v.id}
                v={v}
                vendorCostsHidden={vendorCostsHidden}
                onOpen={() => navigate(`/app/vendors/${v.id}`)}
                onEdit={() => { setEditingVendor(v); setFormOpen(true); }}
              />
            ))}
          </div>
        ) : (
          <VendorTable
            rows={filtered}
            vendorCostsHidden={vendorCostsHidden}
            onOpen={(id) => navigate(`/app/vendors/${id}`)}
          />
        )}
      </div>

      <VendorFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingVendor(null); }}
        vendor={editingVendor}
        categories={categories}
        onSave={handleSaveVendor}
      />
    </div>
  );
};

const segBtnStyle = (active: boolean): React.CSSProperties => ({
  height: 36, width: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: active ? brand('tint') : surface(),
  color: active ? brand('ink') : ink(2),
  border: 'none', cursor: 'pointer', borderRight: `1px solid ${border()}`,
});

// ─── Vendor Card ───
const VendorCard: React.FC<{
  v: VendorRow;
  vendorCostsHidden: boolean;
  onOpen: () => void;
  onEdit: () => void;
}> = ({ v, vendorCostsHidden, onOpen }) => {
  const st = statusById(v.status);
  const totals = vendorTotals(v.expense_items || [], v.lineItemsByExpenseItem || {}, v.payments || []);
  const next = nextPayment(v.payments || []);

  return (
    <div
      onClick={onOpen}
      style={{
        background: surface(), border: `1px solid ${border()}`,
        borderRadius: 12, padding: 18, cursor: 'pointer',
        transition: 'all .15s', boxShadow: '0 1px 2px rgba(43,37,32,.04)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = border(true); e.currentTarget.style.boxShadow = '0 2px 4px rgba(43,37,32,.06), 0 8px 16px -8px rgba(43,37,32,.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = border(); e.currentTarget.style.boxShadow = '0 1px 2px rgba(43,37,32,.04)'; }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        {v.category?.name ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: st.dot }}/>
            <span style={{ fontSize: 11, color: ink(3), letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500, fontFamily: FONT_UI }}>
              {v.category.name}
            </span>
          </div>
        ) : <span/>}
        <PaperBadge tone={st.tone === 'info' ? 'brand' : st.tone === 'warn' ? 'warn' : st.tone === 'success' ? 'success' : 'neutral'} size="sm">
          <span style={{ width: 6, height: 6, borderRadius: 999, background: st.dot, display: 'inline-block' }}/>
          {st.label}
        </PaperBadge>
      </div>

      {/* Name */}
      <div>
        <h3 style={{
          margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 19,
          color: ink(), letterSpacing: '-0.2px', lineHeight: 1.25,
        }}>
          {v.name}
        </h3>
        {v.contact_name && (
          <div style={{ fontSize: 12, color: ink(3), marginTop: 4, fontFamily: FONT_UI }}>
            {v.contact_name}
          </div>
        )}
      </div>

      {/* Money progress */}
      {vendorCostsHidden ? (
        <LockedCard variant="inline"/>
      ) : totals.committed > 0 ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 500, color: ink(), letterSpacing: '-0.2px' }}>
              {fmtEUR(totals.committed)}
              {totals.hasVariable && <span style={{ fontSize: 11, color: ink(3), marginLeft: 6, fontFamily: FONT_MONO }}>previsti</span>}
            </span>
            <span style={{ fontSize: 12, color: totals.paid >= totals.committed ? success() : ink(2), fontFamily: FONT_MONO }}>
              {fmtEUR(totals.paid)} / {fmtEUR(totals.committed)}
            </span>
          </div>
          <PaperProgress value={totals.pct} tone={totals.paid >= totals.committed ? 'success' : 'brand'}/>
        </div>
      ) : (
        <div style={{ padding: '10px 12px', background: surface('muted'), borderRadius: 8, fontSize: 12, color: ink(3), textAlign: 'center', fontFamily: FONT_UI }}>
          Nessuna spesa registrata
        </div>
      )}

      {/* Footer: next payment */}
      <div style={{ paddingTop: 10, borderTop: `1px solid ${border()}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        {next && !vendorCostsHidden ? (
          <>
            <div style={{ fontSize: 12, color: ink(2), display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontFamily: FONT_UI }}>
              <Calendar size={13} style={{ color: ink(3), flexShrink: 0 }}/>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {next.description} · <span style={{ fontFamily: FONT_MONO }}>{fmtDateShort(next.due_date)}</span>
              </span>
            </div>
            <span style={{
              fontFamily: FONT_MONO, fontSize: 12,
              color: daysFromToday(next.due_date) <= 7 ? warn() : ink(2),
              fontWeight: 500, flexShrink: 0,
            }}>
              {fmtEUR(Number(next.amount))}
            </span>
          </>
        ) : (
          <div style={{ fontSize: 12, color: ink(3), fontFamily: FONT_UI }}>
            {normalizeStatus(v.status) === 'confirmed' && totals.committed > 0
              ? 'Tutto pagato'
              : normalizeStatus(v.status) === 'evaluating'
                ? 'In attesa di preventivo'
                : 'Apri scheda'}
          </div>
        )}
        <ChevronRight size={14} style={{ color: ink(3), flexShrink: 0 }}/>
      </div>
    </div>
  );
};

// ─── Table view ───
const VendorTable: React.FC<{
  rows: VendorRow[];
  vendorCostsHidden: boolean;
  onOpen: (id: string) => void;
}> = ({ rows, vendorCostsHidden, onOpen }) => (
  <PaperCard padding={0} style={{ overflow: 'hidden' }}>
    <div style={{
      display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr 1fr 40px',
      padding: '10px 18px', background: surface('muted'), borderBottom: `1px solid ${border()}`,
      fontSize: 11, color: ink(3), letterSpacing: '0.08em', textTransform: 'uppercase',
      fontWeight: 600, fontFamily: FONT_UI,
    }}>
      <div>Fornitore</div>
      <div>Categoria</div>
      <div>Importo</div>
      <div>Prossima scadenza</div>
      <div/>
    </div>
    {rows.map((v, i) => {
      const st = statusById(v.status);
      const totals = vendorTotals(v.expense_items || [], v.lineItemsByExpenseItem || {}, v.payments || []);
      const next = nextPayment(v.payments || []);
      return (
        <div
          key={v.id}
          onClick={() => onOpen(v.id)}
          style={{
            display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr 1fr 40px',
            padding: '14px 18px', alignItems: 'center', gap: 16,
            borderBottom: i < rows.length - 1 ? `1px solid ${border()}` : 'none',
            cursor: 'pointer', transition: 'background .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = surface('muted'); }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: ink(), fontFamily: FONT_UI }}>{v.name}</div>
            <div style={{ fontSize: 12, color: ink(3), marginTop: 2, fontFamily: FONT_UI }}>{v.contact_name || '—'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: ink(2), fontFamily: FONT_UI }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: st.dot }}/>
            {v.category?.name || '—'}
          </div>
          <div>
            {vendorCostsHidden ? <LockedCard variant="inline"/> : totals.committed > 0 ? (
              <>
                <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: ink() }}>
                  {fmtEUR(totals.paid)} / {fmtEUR(totals.committed)}
                </div>
                <PaperProgress value={totals.pct} tone={totals.paid >= totals.committed ? 'success' : 'brand'} height={4} style={{ marginTop: 4 }}/>
              </>
            ) : <span style={{ fontSize: 13, color: ink(3) }}>—</span>}
          </div>
          <div>
            {next && !vendorCostsHidden ? (
              <>
                <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: daysFromToday(next.due_date) <= 7 ? warn() : ink() }}>
                  {fmtEUR(Number(next.amount))}
                </div>
                <div style={{ fontSize: 11, color: ink(3), marginTop: 2, fontFamily: FONT_UI }}>{fmtDateShort(next.due_date)}</div>
              </>
            ) : (
              <PaperBadge
                tone={st.tone === 'info' ? 'brand' : st.tone === 'warn' ? 'warn' : st.tone === 'success' ? 'success' : 'neutral'}
                size="sm"
              >
                {st.label}
              </PaperBadge>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ChevronRight size={14} style={{ color: ink(3) }}/>
          </div>
        </div>
      );
    })}
  </PaperCard>
);

export default Vendors;
