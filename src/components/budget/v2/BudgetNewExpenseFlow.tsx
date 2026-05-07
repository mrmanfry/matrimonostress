// "Nuova spesa" launcher dal Budget: prima sceglie il fornitore, poi apre l'ExpenseWizard.
import * as React from 'react';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  PaperModal, PaperButton, PaperLabel, PaperInput, ink, surface, border, brand, FONT_UI, FONT_SERIF,
} from '@/components/vendors/v2/PaperUI';
import { ExpenseWizard, type ExpenseWizardValues } from '@/components/vendors/v2/ExpenseWizard';

interface VendorLite {
  id: string;
  name: string;
  category_id: string | null;
  wedding_id: string;
  is_accommodation: boolean | null;
  expense_categories?: { name: string } | null;
}

interface Props {
  weddingId: string;
  weddingDate: string | null;
  guestsPlanned: number;
  guestsConfirmed: number;
  countsPlanned?: { adults: number; children: number; staff: number };
  countsConfirmed?: { adults: number; children: number; staff: number };
  onSaved: () => void;
}

export function BudgetNewExpenseButton(props: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <PaperButton variant="primary" iconLeft={<Plus size={14} />} onClick={() => setOpen(true)}>
        Nuova spesa
      </PaperButton>
      {open && <BudgetNewExpenseFlow {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function BudgetNewExpenseFlow({
  weddingId, weddingDate, guestsPlanned, guestsConfirmed, onSaved, onClose,
}: Props & { onClose: () => void }) {
  const { authState } = useAuth();
  const [vendors, setVendors] = React.useState<VendorLite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('');
  const [selected, setSelected] = React.useState<VendorLite | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('vendors')
        .select('id, name, category_id, wedding_id, is_accommodation, expense_categories(name)')
        .eq('wedding_id', weddingId)
        .order('name');
      setVendors((data ?? []) as unknown as VendorLite[]);
      setLoading(false);
    })();
  }, [weddingId]);

  const filtered = vendors.filter(v =>
    !filter.trim() || v.name.toLowerCase().includes(filter.toLowerCase()) ||
    (v.expense_categories?.name || '').toLowerCase().includes(filter.toLowerCase())
  );

  const handleSaveExpense = async (values: ExpenseWizardValues) => {
    if (!selected) return;
    if (authState.status !== 'authenticated') return;
    const expensePayload: any = {
      wedding_id: selected.wedding_id,
      vendor_id: selected.id,
      category_id: selected.category_id || null,
      description: values.description,
      expense_type: values.kind === 'fixed' ? 'fixed' : 'variable',
      amount_is_tax_inclusive: true,
    };
    if (values.kind === 'fixed') {
      expensePayload.fixed_amount = values.total;
      expensePayload.total_amount = values.total;
    } else if (values.kind === 'per_person') {
      expensePayload.estimated_amount = values.unit;
      expensePayload.total_amount = values.computedTotal;
      expensePayload.planned_adults = guestsPlanned;
    } else {
      expensePayload.estimated_amount = values.unit;
      expensePayload.total_amount = values.computedTotal;
    }
    const { data: insertedItem, error: itemErr } = await supabase
      .from('expense_items').insert([expensePayload]).select().single();
    if (itemErr || !insertedItem) {
      toast.error(itemErr?.message || 'Salvataggio non riuscito');
      return;
    }
    if (values.hasPayments && values.payments.length > 0) {
      const rows = values.payments.map(p => ({
        expense_item_id: insertedItem.id,
        description: p.description,
        amount: p.amount,
        due_date: p.due_date,
        status: 'Da Pagare',
      }));
      const { error: payErr } = await supabase.from('payments').insert(rows);
      if (payErr) toast.error('Spesa salvata, ma rate non create: ' + payErr.message);
      else toast.success(`Spesa creata · ${values.payments.length} rate generate.`);
    } else {
      toast.success('Spesa creata');
    }
    onSaved();
    onClose();
  };

  // Step 1: scelta fornitore
  if (!selected) {
    return (
      <PaperModal
        open={true}
        onClose={onClose}
        title="Nuova spesa"
        subtitle="Scegli il fornitore a cui associarla"
        width={620}
        footer={(
          <>
            <div style={{ flex: 1 }} />
            <PaperButton variant="ghost" onClick={onClose}>Annulla</PaperButton>
          </>
        )}
      >
        <div style={{ display: 'grid', gap: 14, fontFamily: FONT_UI }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: ink(3),
            }}/>
            <PaperInput
              autoFocus
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Cerca fornitore o categoria…"
              style={{ paddingLeft: 32 }}
            />
          </div>
          {loading ? (
            <div style={{ padding: 20, color: ink(3), fontSize: 13 }}>Caricamento…</div>
          ) : filtered.length === 0 ? (
            <div style={{
              padding: 20, textAlign: 'center', color: ink(3), fontSize: 13,
              border: `1px dashed ${border(true)}`, borderRadius: 10,
            }}>
              {vendors.length === 0
                ? 'Nessun fornitore. Creane uno dalla pagina Fornitori.'
                : 'Nessun fornitore corrisponde alla ricerca.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
              {filtered.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    if (v.is_accommodation) {
                      toast.info('Le spese delle strutture ricettive si gestiscono dalla sezione Pernotto.');
                      return;
                    }
                    setSelected(v);
                  }}
                  style={{
                    textAlign: 'left', padding: '12px 14px', cursor: v.is_accommodation ? 'not-allowed' : 'pointer',
                    background: surface(), border: `1px solid ${border(true)}`, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    opacity: v.is_accommodation ? 0.55 : 1,
                    fontFamily: FONT_UI,
                  }}
                  onMouseEnter={e => { if (!v.is_accommodation) (e.currentTarget.style.borderColor = brand('base')); }}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border(true))}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_SERIF, fontSize: 15, color: ink() }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: ink(3), marginTop: 2 }}>
                      {v.expense_categories?.name || 'Senza categoria'}
                      {v.is_accommodation && ' · gestito da Pernotto'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PaperModal>
    );
  }

  // Step 2: wizard
  return (
    <ExpenseWizard
      open={true}
      onClose={onClose}
      vendorName={selected.name}
      guestsPlanned={guestsPlanned}
      guestsConfirmed={guestsConfirmed}
      weddingDate={weddingDate}
      onSave={handleSaveExpense}
    />
  );
}
