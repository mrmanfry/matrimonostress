// New "Paper" Vendor Details page — 2-column layout (sticky profile + sections).
// Reuses existing widgets for documents/appointments/checklist (they already work).
// Spese & Pagamenti is rewritten with the new Paper look + ExpenseWizard.
import * as React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Plus, Pencil, Phone, Mail, Home, Calendar as CalIcon,
  FileText, ListChecks, StickyNote, Receipt, CheckCircle2, Info, Upload, Check,
  Trash2, X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  PaperButton, PaperProgress, PaperEmpty, PaperSectionHeader, ContactLine, PaperAvatar,
  ink, surface, border, brand, success, warn, FONT_SERIF, FONT_UI, FONT_MONO,
} from '@/components/vendors/v2/PaperUI';
import { PaperBadge, PaperCard } from '@/components/budget/v2/paperPrimitives';
import { VendorFormModal, VendorFormValues } from '@/components/vendors/v2/VendorFormModal';
import { ExpenseWizard, ExpenseWizardValues } from '@/components/vendors/v2/ExpenseWizard';
import { VendorDocumentsWidget } from '@/components/vendors/widgets/VendorDocumentsWidget';
import { VendorChecklistWidget } from '@/components/vendors/widgets/VendorChecklistWidget';
import { VendorAppointmentsWidget } from '@/components/vendors/widgets/VendorAppointmentsWidget';
import { VendorTaskDialog } from '@/components/vendors/VendorTaskDialog';
import {
  statusById, normalizeStatus, fmtEUR, fmtDate, fmtDateShort, daysFromToday,
  vendorTotals, isPaymentPaid, expenseItemTotal, EXPENSE_KINDS,
  DbExpenseItem, DbLineItem, DbPayment,
} from '@/lib/vendorAggregates';

type ActiveSection = 'spese' | 'documenti' | 'appuntamenti' | 'note';

export default function VendorDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isCollaborator, authState } = useAuth();
  const vendorCostsHidden = isCollaborator && authState.status === 'authenticated' && !authState.activePermissions?.vendor_costs?.view;

  const [editOpen, setEditOpen] = React.useState(false);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [taskType, setTaskType] = React.useState<'task' | 'appointment'>('task');
  const [activeSection, setActiveSection] = React.useState<ActiveSection>(
    (searchParams.get('tab') as ActiveSection) || 'spese',
  );

  // Vendor + relations
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-detail-v2', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: vendor, error } = await supabase
        .from('vendors')
        .select('*, expense_categories(name)')
        .eq('id', id!)
        .single();
      if (error) throw error;

      const { data: items } = await supabase
        .from('expense_items')
        .select('*')
        .eq('vendor_id', id!)
        .order('created_at', { ascending: true });

      const itemIds = (items || []).map(i => i.id);
      const { data: lineItems } = itemIds.length
        ? await supabase.from('expense_line_items').select('*').in('expense_item_id', itemIds)
        : { data: [] as DbLineItem[] };

      const { data: payments } = itemIds.length
        ? await supabase
            .from('payments')
            .select('id, expense_item_id, description, amount, status, due_date, paid_on_date')
            .in('expense_item_id', itemIds)
            .order('due_date', { ascending: true })
        : { data: [] as DbPayment[] };

      const lineItemsByExpenseItem: Record<string, DbLineItem[]> = {};
      (lineItems || []).forEach((li: any) => { (lineItemsByExpenseItem[li.expense_item_id] ||= []).push(li); });

      // Wedding date for wizard
      const { data: wedding } = await supabase
        .from('weddings')
        .select('id, wedding_date, target_adults, target_children, calculation_mode')
        .eq('id', vendor.wedding_id)
        .single();

      // Confirmed guest count
      const { data: confirmedGuests } = await supabase
        .from('guests')
        .select('id, is_child, is_staff, party_id, invite_parties!inner(rsvp_status)')
        .eq('wedding_id', vendor.wedding_id)
        .eq('invite_parties.rsvp_status', 'Confermato');
      const confirmedCount = (confirmedGuests || []).filter((g: any) => !g.is_child && !g.is_staff).length;

      const plannedCount = (wedding?.target_adults || 100) + (wedding?.target_children || 0);

      return {
        vendor,
        items: (items || []) as DbExpenseItem[],
        payments: (payments || []) as DbPayment[],
        lineItemsByExpenseItem,
        wedding,
        guestsPlanned: plannedCount,
        guestsConfirmed: confirmedCount,
      };
    },
  });

  // Categories for edit modal
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories-v2', data?.vendor?.wedding_id],
    enabled: !!data?.vendor?.wedding_id,
    queryFn: async () => {
      const { data: cats } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('wedding_id', data!.vendor.wedding_id)
        .order('name');
      return cats || [];
    },
  });

  // Save edits
  const handleSaveVendor = async (values: VendorFormValues) => {
    if (!data?.vendor?.id) return;
    const { error } = await supabase
      .from('vendors')
      .update({
        name: values.name.trim(),
        category_id: values.category_id,
        status: values.status,
        contact_name: values.contact_name || null,
        phone: values.phone || null,
        email: values.email || null,
        indirizzo_sede_legale: values.address || null,
        notes: values.notes || null,
      })
      .eq('id', data.vendor.id);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Salvato', description: 'Profilo fornitore aggiornato' });
    queryClient.invalidateQueries({ queryKey: ['vendor-detail-v2'] });
  };

  // Save expense from wizard → creates expense_items + payments
  const handleSaveExpense = async (values: ExpenseWizardValues) => {
    if (!data?.vendor?.id || !data?.vendor?.wedding_id) return;
    const expensePayload: any = {
      wedding_id: data.vendor.wedding_id,
      vendor_id: data.vendor.id,
      category_id: data.vendor.category_id || null,
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
      expensePayload.planned_adults = data.guestsPlanned;
    } else { // per_unit
      expensePayload.estimated_amount = values.unit;
      expensePayload.total_amount = values.computedTotal;
    }

    const { data: insertedItem, error: itemErr } = await supabase
      .from('expense_items')
      .insert([expensePayload])
      .select()
      .single();
    if (itemErr || !insertedItem) {
      toast({ title: 'Errore', description: itemErr?.message || 'Salvataggio non riuscito', variant: 'destructive' });
      return;
    }

    if (values.hasPayments && values.payments.length > 0) {
      const paymentRows = values.payments.map(p => ({
        expense_item_id: insertedItem.id,
        description: p.description,
        amount: p.amount,
        due_date: p.due_date,
        status: 'Da Pagare',
      }));
      const { error: payErr } = await supabase.from('payments').insert(paymentRows);
      if (payErr) {
        toast({ title: 'Spesa salvata, ma rate non create', description: payErr.message, variant: 'destructive' });
      } else {
        toast({ title: 'Spesa creata', description: `${values.payments.length} rate generate.` });
      }
    } else {
      toast({ title: 'Spesa creata' });
    }

    queryClient.invalidateQueries({ queryKey: ['vendor-detail-v2'] });
  };

  const markPaymentPaid = async (paymentId: string, paid: boolean) => {
    const { error } = await supabase
      .from('payments')
      .update({
        status: paid ? 'Pagato' : 'Da Pagare',
        paid_on_date: paid ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq('id', paymentId);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['vendor-detail-v2'] });
  };

  const updateExpenseItem = async (
    itemId: string,
    patch: { description?: string; total_amount?: number; fixed_amount?: number | null },
  ) => {
    const { error } = await supabase.from('expense_items').update(patch).eq('id', itemId);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Spesa aggiornata' });
    queryClient.invalidateQueries({ queryKey: ['vendor-detail-v2'] });
  };

  const deleteExpenseItem = async (itemId: string) => {
    if (!window.confirm('Eliminare questa spesa? Verranno cancellate anche tutte le rate collegate.')) return;
    await supabase.from('payments').delete().eq('expense_item_id', itemId);
    await supabase.from('expense_line_items').delete().eq('expense_item_id', itemId);
    const { error } = await supabase.from('expense_items').delete().eq('id', itemId);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Spesa eliminata' });
    queryClient.invalidateQueries({ queryKey: ['vendor-detail-v2'] });
  };

  const updatePayment = async (
    paymentId: string,
    patch: { description?: string; amount?: number; due_date?: string },
  ) => {
    const { error } = await supabase.from('payments').update(patch).eq('id', paymentId);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Rata aggiornata' });
    queryClient.invalidateQueries({ queryKey: ['vendor-detail-v2'] });
  };

  const deletePayment = async (paymentId: string) => {
    if (!window.confirm('Eliminare questa rata?')) return;
    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Rata eliminata' });
    queryClient.invalidateQueries({ queryKey: ['vendor-detail-v2'] });
  };

  const addPaymentRow = async (expenseItemId: string) => {
    const { error } = await supabase.from('payments').insert([{
      expense_item_id: expenseItemId,
      description: 'Nuova rata',
      amount: 0,
      due_date: new Date().toISOString().slice(0, 10),
      status: 'Da Pagare',
    }]);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Rata aggiunta', description: 'Modificala per impostare importo e data.' });
    queryClient.invalidateQueries({ queryKey: ['vendor-detail-v2'] });
  };

  if (isLoading) {
    return (
      <div style={{ background: surface('muted'), minHeight: '100%', padding: 40 }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 32 }}>
          <div style={{ height: 360, background: surface(), borderRadius: 12 }}/>
          <div style={{ height: 480, background: surface(), borderRadius: 12 }}/>
        </div>
      </div>
    );
  }

  if (!data?.vendor) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h1 style={{ fontFamily: FONT_SERIF, fontSize: 22, color: ink(2) }}>Fornitore non trovato</h1>
        <PaperButton onClick={() => navigate('/app/vendors')} iconLeft={<ChevronLeft size={14}/>}>
          Torna ai fornitori
        </PaperButton>
      </div>
    );
  }

  const v = data.vendor;
  const st = statusById(v.status);
  const totals = vendorTotals(data.items, data.lineItemsByExpenseItem, data.payments);

  const sections: { id: ActiveSection; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'spese',        label: 'Spese & Pagamenti', icon: <Receipt size={14}/>,     count: data.items.length },
    { id: 'documenti',    label: 'Documenti',          icon: <FileText size={14}/>,    count: 0 },
    { id: 'appuntamenti', label: 'Appuntamenti',       icon: <CalIcon size={14}/>,     count: 0 },
    { id: 'note',         label: 'Note',               icon: <StickyNote size={14}/>,  count: v.notes ? 1 : 0 },
  ];

  const scrollTo = (s: ActiveSection) => {
    setActiveSection(s);
    const el = document.getElementById(`sec-${s}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ background: surface('muted'), minHeight: '100%', padding: '8px 0 60px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '20px 24px' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/app/vendors')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13,
            color: ink(2), background: 'transparent', border: 'none',
            cursor: 'pointer', padding: '6px 0', marginBottom: 12, fontFamily: FONT_UI,
          }}
        >
          <ChevronLeft size={14}/> Torna ai fornitori
        </button>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: 32,
        }}>

          {/* === Left: profile === */}
          <div style={{ position: 'sticky', top: 16, alignSelf: 'start', display: 'grid', gap: 14 }}>
            <PaperCard padding={20}>
              {v.expense_categories?.name && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: st.dot }}/>
                  <span style={{ fontSize: 11, color: ink(3), letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: FONT_UI }}>
                    {v.expense_categories.name}
                  </span>
                </div>
              )}
              <h1 style={{
                margin: 0, fontFamily: FONT_SERIF, fontWeight: 500, fontSize: 24,
                color: ink(), letterSpacing: '-0.3px', lineHeight: 1.2,
              }}>{v.name}</h1>
              <div style={{ marginTop: 12 }}>
                <PaperBadge
                  tone={st.tone === 'info' ? 'brand' : st.tone === 'warn' ? 'warn' : st.tone === 'success' ? 'success' : 'neutral'}
                  size="md"
                >
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: st.dot, display: 'inline-block' }}/>
                  {st.label}
                </PaperBadge>
              </div>

              {/* Money summary */}
              {!vendorCostsHidden && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${border()}`, display: 'grid', gap: 10 }}>
                  <Row label="Impegno totale" value={fmtEUR(totals.committed)} valueStyle={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, letterSpacing: '-0.2px' }}/>
                  <Row label="Pagato"          value={fmtEUR(totals.paid)} valueColor={success()}/>
                  <Row label="Residuo"         value={fmtEUR(totals.remaining)} valueColor={totals.remaining > 0 ? warn() : ink(3)}/>
                  <PaperProgress value={totals.pct} tone={totals.pct >= 100 ? 'success' : 'brand'} showPct style={{ marginTop: 4 }}/>
                  {totals.hasVariable && (
                    <div style={{
                      marginTop: 6, padding: '8px 10px',
                      background: 'hsl(220 89% 95%)', border: '1px solid hsl(220 50% 88%)',
                      borderRadius: 8, fontSize: 11, color: 'hsl(220 73% 41%)', lineHeight: 1.45,
                      display: 'flex', gap: 6, fontFamily: FONT_UI,
                    }}>
                      <Info size={12} style={{ flexShrink: 0, marginTop: 2 }}/>
                      <span>L'importo varia col numero di invitati confermati ({data.guestsConfirmed} su {data.guestsPlanned}).</span>
                    </div>
                  )}
                </div>
              )}

              {/* Contact */}
              {(v.contact_name || v.phone || v.email || v.indirizzo_sede_legale) && (
                <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${border()}` }}>
                  <div style={{
                    fontSize: 11, color: ink(3), letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: 10, fontWeight: 600, fontFamily: FONT_UI,
                  }}>Referente</div>
                  {v.contact_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <PaperAvatar name={v.contact_name} size={36}/>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: ink(), fontFamily: FONT_UI }}>{v.contact_name}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'grid', gap: 6 }}>
                    {v.phone                    && <ContactLine icon={<Phone size={13}/>} text={v.phone} href={`tel:${v.phone}`}/>}
                    {v.email                    && <ContactLine icon={<Mail size={13}/>}  text={v.email} href={`mailto:${v.email}`}/>}
                    {v.indirizzo_sede_legale    && <ContactLine icon={<Home size={13}/>}  text={v.indirizzo_sede_legale}/>}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${border()}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!vendorCostsHidden && (
                  <PaperButton variant="primary" iconLeft={<Plus size={14}/>} onClick={() => setWizardOpen(true)}>
                    Nuova spesa
                  </PaperButton>
                )}
                <PaperButton variant="secondary" iconLeft={<Pencil size={14}/>} onClick={() => setEditOpen(true)}>
                  Modifica fornitore
                </PaperButton>
              </div>
            </PaperCard>

            {/* Section nav */}
            <div style={{ display: 'grid', gap: 2 }}>
              {sections.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: activeSection === s.id ? brand('tint') : 'transparent',
                    border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    color: activeSection === s.id ? brand('ink') : ink(2),
                    fontWeight: activeSection === s.id ? 500 : 400, fontSize: 13,
                    transition: 'all .15s', fontFamily: FONT_UI,
                  }}
                >
                  {s.icon}
                  <span style={{ flex: 1 }}>{s.label}</span>
                  {s.count > 0 && (
                    <span style={{
                      fontFamily: FONT_MONO, fontSize: 11, color: ink(3),
                      background: surface(), border: `1px solid ${border()}`,
                      borderRadius: 4, padding: '1px 6px',
                    }}>{s.count}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* === Right: sections === */}
          <div style={{ display: 'grid', gap: 28, minWidth: 0 }}>

            {/* Spese & Pagamenti */}
            {!vendorCostsHidden && (
              <section id="sec-spese">
                <PaperSectionHeader
                  title="Spese & Pagamenti"
                  action={
                    <PaperButton variant="secondary" size="sm" iconLeft={<Plus size={14}/>} onClick={() => setWizardOpen(true)}>
                      Nuova spesa
                    </PaperButton>
                  }
                />

                {data.items.length === 0 ? (
                  <PaperEmpty
                    title="Nessuna spesa ancora"
                    desc="Aggiungi la prima voce quando ricevi il preventivo o firmi il contratto."
                    cta={
                      <PaperButton variant="primary" size="sm" iconLeft={<Plus size={14}/>} onClick={() => setWizardOpen(true)}>
                        Aggiungi spesa
                      </PaperButton>
                    }
                  />
                ) : (
                  <ExpensesList
                    items={data.items}
                    lineItemsByExpenseItem={data.lineItemsByExpenseItem}
                    payments={data.payments}
                    onUpdateItem={updateExpenseItem}
                    onDeleteItem={deleteExpenseItem}
                    onAddPayment={addPaymentRow}
                  />
                )}

                {/* Payment timeline */}
                <div style={{ marginTop: 24 }}>
                  <SectionSubhead>Piano pagamenti</SectionSubhead>
                  {data.payments.length === 0 ? (
                    <div style={{
                      padding: '14px 16px', background: surface(),
                      border: `1px dashed ${border(true)}`, borderRadius: 10,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontFamily: FONT_UI,
                    }}>
                      <div style={{ fontSize: 13, color: ink(2) }}>Nessun piano pagamenti definito</div>
                      <PaperButton variant="secondary" size="sm" iconLeft={<Plus size={14}/>} onClick={() => setWizardOpen(true)}>
                        Aggiungi rata
                      </PaperButton>
                    </div>
                  ) : (
                    <PaymentTimeline
                      payments={data.payments}
                      onTogglePaid={markPaymentPaid}
                      onUpdate={updatePayment}
                      onDelete={deletePayment}
                    />
                  )}
                </div>
              </section>
            )}

            {/* Documenti */}
            <section id="sec-documenti">
              <PaperSectionHeader title="Documenti"/>
              <VendorDocumentsWidget vendorId={v.id} vendorName={v.name}/>
            </section>

            {/* Appuntamenti */}
            <section id="sec-appuntamenti">
              <PaperSectionHeader
                title="Appuntamenti"
                action={
                  <PaperButton variant="secondary" size="sm" iconLeft={<Plus size={14}/>} onClick={() => { setTaskType('appointment'); setTaskOpen(true); }}>
                    Nuovo
                  </PaperButton>
                }
              />
              <VendorAppointmentsWidget
                vendorId={v.id} vendorName={v.name} weddingId={v.wedding_id}
                onCreateAppointment={() => { setTaskType('appointment'); setTaskOpen(true); }}
              />
            </section>

            {/* Checklist */}
            <section>
              <PaperSectionHeader
                title="Checklist"
                action={
                  <PaperButton variant="secondary" size="sm" iconLeft={<Plus size={14}/>} onClick={() => { setTaskType('task'); setTaskOpen(true); }}>
                    Nuova attività
                  </PaperButton>
                }
              />
              <VendorChecklistWidget vendorId={v.id} onCreateTask={() => { setTaskType('task'); setTaskOpen(true); }}/>
            </section>

            {/* Note */}
            <section id="sec-note">
              <PaperSectionHeader title="Note"/>
              <div style={{
                padding: '16px 18px', background: surface(),
                border: `1px solid ${border()}`, borderRadius: 10,
                fontSize: 13, color: ink(2), lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: FONT_UI,
              }}>
                {v.notes || <span style={{ color: ink(3) }}>Nessuna nota. Clicca "Modifica fornitore" per aggiungerne una.</span>}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Modals */}
      <VendorFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        vendor={v}
        categories={categories}
        onSave={handleSaveVendor}
      />

      <ExpenseWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        vendorName={v.name}
        guestsPlanned={data.guestsPlanned}
        guestsConfirmed={data.guestsConfirmed}
        weddingDate={data.wedding?.wedding_date || null}
        onSave={handleSaveExpense}
      />

      <VendorTaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        vendorId={v.id}
        vendorName={v.name}
        weddingId={v.wedding_id}
        defaultType={taskType}
      />
    </div>
  );
}

// ─── Helpers ───
const SectionSubhead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontSize: 11, color: ink(3), letterSpacing: '0.12em', textTransform: 'uppercase',
    marginBottom: 12, fontWeight: 600, fontFamily: FONT_UI,
  }}>{children}</div>
);

const Row: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  valueStyle?: React.CSSProperties;
}> = ({ label, value, valueColor, valueStyle }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
    <span style={{ fontSize: 12, color: ink(3), fontFamily: FONT_UI }}>{label}</span>
    <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: valueColor || ink(), ...valueStyle }}>{value}</span>
  </div>
);

const ExpensesList: React.FC<{
  items: DbExpenseItem[];
  lineItemsByExpenseItem: Record<string, DbLineItem[]>;
  payments: DbPayment[];
  onUpdateItem: (id: string, patch: { description?: string; total_amount?: number; fixed_amount?: number | null }) => void | Promise<void>;
  onDeleteItem: (id: string) => void | Promise<void>;
  onAddPayment: (expenseItemId: string) => void | Promise<void>;
}> = ({ items, lineItemsByExpenseItem, payments, onUpdateItem, onDeleteItem, onAddPayment }) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftDesc, setDraftDesc] = React.useState('');
  const [draftTotal, setDraftTotal] = React.useState<string>('');

  const startEdit = (it: DbExpenseItem, total: number) => {
    setEditingId(it.id);
    setDraftDesc(it.description);
    setDraftTotal(String(total));
  };
  const cancelEdit = () => { setEditingId(null); };
  const saveEdit = async (it: DbExpenseItem) => {
    const newTotal = Number(draftTotal);
    const isVariable = (it.expense_type ?? '').toLowerCase() === 'variable';
    const patch: any = { description: draftDesc.trim() || it.description };
    if (!Number.isNaN(newTotal) && newTotal >= 0) {
      patch.total_amount = newTotal;
      if (!isVariable) patch.fixed_amount = newTotal;
    }
    await onUpdateItem(it.id, patch);
    setEditingId(null);
  };

  return (
    <PaperCard padding={0} style={{ overflow: 'hidden' }}>
      {items.map((it, i) => {
        const lineItems = lineItemsByExpenseItem[it.id] || [];
        const total = expenseItemTotal(it, lineItems);
        const itemPayments = payments.filter(p => p.expense_item_id === it.id);
        const paid = itemPayments.filter(p => isPaymentPaid(p.status)).reduce((s, p) => s + Number(p.amount), 0);
        const isVariable = (it.expense_type ?? '').toLowerCase() === 'variable';
        const isEditing = editingId === it.id;

        return (
          <div key={it.id} style={{
            padding: '14px 18px', borderBottom: i < items.length - 1 ? `1px solid ${border()}` : 'none',
            fontFamily: FONT_UI,
          }}>
            {isEditing ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <input
                  type="text"
                  value={draftDesc}
                  onChange={e => setDraftDesc(e.target.value)}
                  placeholder="Descrizione"
                  style={{
                    fontSize: 14, padding: '8px 10px', borderRadius: 6,
                    border: `1px solid ${border(true)}`, background: surface(),
                    color: ink(), fontFamily: FONT_UI, outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draftTotal}
                    onChange={e => setDraftTotal(e.target.value)}
                    placeholder="Importo €"
                    style={{
                      flex: 1, fontSize: 14, padding: '8px 10px', borderRadius: 6,
                      border: `1px solid ${border(true)}`, background: surface(),
                      color: ink(), fontFamily: FONT_MONO, outline: 'none',
                    }}
                  />
                  <PaperButton variant="primary" size="sm" onClick={() => saveEdit(it)}>Salva</PaperButton>
                  <PaperButton variant="ghost" size="sm" onClick={cancelEdit}>Annulla</PaperButton>
                </div>
                {isVariable && (
                  <div style={{ fontSize: 11, color: ink(3) }}>
                    Spesa variabile: l'importo viene ricalcolato automaticamente sugli invitati confermati.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, color: ink(), fontWeight: 500 }}>{it.description}</span>
                    {isVariable && <PaperBadge tone="brand" size="sm">Variabile</PaperBadge>}
                  </div>
                  {it.estimated_amount && isVariable && (
                    <div style={{ fontSize: 12, color: ink(3), marginTop: 4, fontFamily: FONT_MONO }}>
                      {fmtEUR(Number(it.estimated_amount))} unitario
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <PaperButton variant="ghost" size="sm" iconLeft={<Pencil size={11}/>} onClick={() => startEdit(it, total)}>
                      Modifica
                    </PaperButton>
                    <PaperButton variant="ghost" size="sm" iconLeft={<Plus size={11}/>} onClick={() => onAddPayment(it.id)}>
                      Aggiungi rata
                    </PaperButton>
                    <PaperButton variant="ghost" size="sm" iconLeft={<Trash2 size={11}/>} onClick={() => onDeleteItem(it.id)}>
                      Elimina
                    </PaperButton>
                  </div>
                </div>
                <div style={{ textAlign: 'right', minWidth: 140 }}>
                  <div style={{
                    fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500,
                    color: ink(), letterSpacing: '-0.2px',
                  }}>
                    {fmtEUR(total)}
                  </div>
                  {paid > 0 && (
                    <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: success(), marginTop: 3 }}>
                      {fmtEUR(paid)} pagati
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </PaperCard>
  );
};

const PaymentTimeline: React.FC<{
  payments: DbPayment[];
  onTogglePaid: (id: string, paid: boolean) => void;
  onUpdate: (id: string, patch: { description?: string; amount?: number; due_date?: string }) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}> = ({ payments, onTogglePaid, onUpdate, onDelete }) => {
  const sorted = [...payments].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftDesc, setDraftDesc] = React.useState('');
  const [draftAmount, setDraftAmount] = React.useState('');
  const [draftDate, setDraftDate] = React.useState('');

  const startEdit = (p: DbPayment) => {
    setEditingId(p.id);
    setDraftDesc(p.description);
    setDraftAmount(String(p.amount));
    setDraftDate(p.due_date);
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (p: DbPayment) => {
    const amt = Number(draftAmount);
    await onUpdate(p.id, {
      description: draftDesc.trim() || p.description,
      amount: Number.isNaN(amt) ? Number(p.amount) : amt,
      due_date: draftDate || p.due_date,
    });
    setEditingId(null);
  };

  return (
    <div style={{ position: 'relative', paddingLeft: 22 }}>
      <div style={{ position: 'absolute', left: 9, top: 8, bottom: 8, width: 1, background: border() }}/>
      {sorted.map((p, i) => {
        const paid = isPaymentPaid(p.status);
        const days = daysFromToday(p.due_date);
        const urgent = !paid && days >= 0 && days <= 7;
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} style={{ position: 'relative', paddingBottom: i < sorted.length - 1 ? 20 : 0, fontFamily: FONT_UI }}>
            <div style={{
              position: 'absolute', left: -22, top: 3, width: 18, height: 18, borderRadius: 999,
              background: paid ? success() : urgent ? warn() : surface(),
              border: `2px solid ${paid ? success() : urgent ? warn() : border(true)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {paid && <Check size={10} style={{ color: '#fff' }}/>}
            </div>

            {isEditing ? (
              <div style={{ display: 'grid', gap: 8, padding: '4px 0' }}>
                <input
                  type="text"
                  value={draftDesc}
                  onChange={e => setDraftDesc(e.target.value)}
                  placeholder="Descrizione rata"
                  style={{
                    fontSize: 13, padding: '6px 10px', borderRadius: 6,
                    border: `1px solid ${border(true)}`, background: surface(),
                    color: ink(), fontFamily: FONT_UI, outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="date"
                    value={draftDate}
                    onChange={e => setDraftDate(e.target.value)}
                    style={{
                      flex: 1, fontSize: 13, padding: '6px 10px', borderRadius: 6,
                      border: `1px solid ${border(true)}`, background: surface(),
                      color: ink(), fontFamily: FONT_UI, outline: 'none',
                    }}
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={draftAmount}
                    onChange={e => setDraftAmount(e.target.value)}
                    placeholder="Importo €"
                    style={{
                      width: 130, fontSize: 13, padding: '6px 10px', borderRadius: 6,
                      border: `1px solid ${border(true)}`, background: surface(),
                      color: ink(), fontFamily: FONT_MONO, outline: 'none', textAlign: 'right',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <PaperButton variant="ghost" size="sm" onClick={cancelEdit}>Annulla</PaperButton>
                  <PaperButton variant="primary" size="sm" onClick={() => saveEdit(p)}>Salva</PaperButton>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: ink(), fontWeight: 500 }}>{p.description}</div>
                  <div style={{ fontSize: 11, color: ink(3), marginTop: 3 }}>
                    {fmtDate(p.due_date)}{!paid && days >= 0 && ` · tra ${days} giorni`}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <PaperButton variant="ghost" size="sm" iconLeft={<Pencil size={11}/>} onClick={() => startEdit(p)}>
                      Modifica
                    </PaperButton>
                    <PaperButton variant="ghost" size="sm" iconLeft={<Trash2 size={11}/>} onClick={() => onDelete(p.id)}>
                      Elimina
                    </PaperButton>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 13, color: paid ? success() : ink(), fontWeight: 500 }}>
                    {fmtEUR(Number(p.amount))}
                  </div>
                  <PaperButton
                    variant={paid ? 'ghost' : 'secondary'}
                    size="sm"
                    iconLeft={paid ? <CheckCircle2 size={12}/> : undefined}
                    onClick={() => onTogglePaid(p.id, !paid)}
                  >
                    {paid ? 'Pagato' : 'Segna pagato'}
                  </PaperButton>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
