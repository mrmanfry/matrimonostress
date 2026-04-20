// 3-step Expense Wizard for the new Vendors v2 page.
// Step 0: Tipo (fissa | persona | quantità)
// Step 1: Importo
// Step 2: Pagamenti (no | sì → schema)
//
// On save, creates an `expense_items` row + optional `payments` rows linked to it.

import * as React from 'react';
import { Tag, Users, Grid3x3, Info, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  PaperModal, PaperButton, PaperStepper, PaperLabel, PaperInput, PaperSelect,
  PaperDivider, ink, brand, surface, border, FONT_SERIF, FONT_MONO, FONT_UI,
} from './PaperUI';
import { PaperBadge } from '@/components/budget/v2/paperPrimitives';
import { EXPENSE_KINDS, ExpenseKind, fmtEUR, generateSchedule, SchedulePayment } from '@/lib/vendorAggregates';

export interface ExpenseWizardValues {
  kind: ExpenseKind;
  description: string;
  // pricing
  total: number;     // for 'fixed'
  unit: number;      // for 'per_person' / 'per_unit'
  qty: number;       // for 'per_unit'
  // computed at save-time
  computedTotal: number;
  // payments
  hasPayments: boolean;
  scheme: 'acconto50' | 'thirds' | 'single';
  payments: SchedulePayment[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  vendorName?: string;
  guestsPlanned: number;
  guestsConfirmed: number;
  weddingDate: string | null;
  onSave: (values: ExpenseWizardValues) => Promise<void>;
}

const KIND_ICON: Record<ExpenseKind, React.ReactNode> = {
  fixed: <Tag size={18}/>,
  per_person: <Users size={18}/>,
  per_unit: <Grid3x3 size={18}/>,
};

export const ExpenseWizard: React.FC<Props> = ({
  open, onClose, vendorName, guestsPlanned, guestsConfirmed, weddingDate, onSave,
}) => {
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<ExpenseWizardValues>(() => init());
  const [saving, setSaving] = React.useState(false);

  function init(): ExpenseWizardValues {
    return {
      kind: 'fixed',
      description: '',
      total: 0, unit: 0, qty: 0,
      computedTotal: 0,
      hasPayments: false,
      scheme: 'single',
      payments: [],
    };
  }
  React.useEffect(() => { if (open) { setStep(0); setForm(init()); } }, [open]);

  const upd = <K extends keyof ExpenseWizardValues>(k: K, v: ExpenseWizardValues[K]) =>
    setForm(s => ({ ...s, [k]: v }));

  // Computed totals (planned vs confirmed scenario).
  const computed = React.useMemo(() => {
    if (form.kind === 'per_person') return { planned: form.unit * guestsPlanned, confirmed: form.unit * guestsConfirmed };
    if (form.kind === 'per_unit')   return { planned: form.unit * form.qty,      confirmed: form.unit * form.qty };
    return { planned: form.total, confirmed: form.total };
  }, [form.kind, form.unit, form.qty, form.total, guestsPlanned, guestsConfirmed]);

  const canNext = (): boolean => {
    if (step === 0) return form.description.trim().length > 0;
    if (step === 1) {
      if (form.kind === 'fixed')      return form.total > 0;
      if (form.kind === 'per_person') return form.unit > 0;
      if (form.kind === 'per_unit')   return form.unit > 0 && form.qty > 0;
    }
    return true;
  };

  // Auto-generate schedule when entering step 2 with hasPayments=true.
  React.useEffect(() => {
    if (step === 2 && form.hasPayments) {
      const sched = generateSchedule(form.scheme, computed.planned, weddingDate);
      setForm(s => ({ ...s, payments: sched }));
    }
  }, [step, form.hasPayments, form.scheme, computed.planned, weddingDate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...form, computedTotal: computed.planned });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <PaperModal
      open={open}
      onClose={onClose}
      title="Nuova spesa"
      subtitle={vendorName ? `Per ${vendorName}` : 'Aggiungi una voce di spesa'}
      width={680}
      footer={(
        <>
          {step > 0 && (
            <PaperButton variant="ghost" iconLeft={<ChevronLeft size={14}/>} onClick={() => setStep(s => Math.max(0, s - 1))}>
              Indietro
            </PaperButton>
          )}
          <div style={{ flex: 1 }}/>
          <PaperButton variant="ghost" onClick={onClose}>Annulla</PaperButton>
          {step < 2 ? (
            <PaperButton
              variant="primary" iconRight={<ChevronRight size={14}/>}
              disabled={!canNext()} onClick={() => setStep(s => Math.min(2, s + 1))}
            >
              Avanti
            </PaperButton>
          ) : (
            <PaperButton variant="primary" iconLeft={<Check size={14}/>} disabled={saving} onClick={handleSave}>
              {saving ? 'Salvataggio…' : 'Aggiungi spesa'}
            </PaperButton>
          )}
        </>
      )}
    >
      <PaperStepper steps={['Tipo', 'Importo', 'Pagamenti']} current={step}/>

      {step === 0 && <StepTipo form={form} upd={upd}/>}
      {step === 1 && (
        <StepImporto
          form={form} upd={upd}
          computed={computed}
          guestsPlanned={guestsPlanned} guestsConfirmed={guestsConfirmed}
        />
      )}
      {step === 2 && (
        <StepPagamenti
          form={form} upd={upd}
          total={computed.planned}
        />
      )}
    </PaperModal>
  );
};

// ─── Step 0: Tipo ───
const StepTipo: React.FC<{
  form: ExpenseWizardValues;
  upd: <K extends keyof ExpenseWizardValues>(k: K, v: ExpenseWizardValues[K]) => void;
}> = ({ form, upd }) => (
  <div style={{ display: 'grid', gap: 16 }}>
    <div>
      <PaperLabel required>Cosa stai aggiungendo?</PaperLabel>
      <PaperInput
        autoFocus
        value={form.description}
        onChange={e => upd('description', e.target.value)}
        placeholder="Es. Catering banchetto, Bomboniere, Sopralluogo tecnico…"
      />
    </div>
    <div>
      <PaperLabel>Come è calcolato il costo?</PaperLabel>
      <div style={{ display: 'grid', gap: 8 }}>
        {EXPENSE_KINDS.map(k => {
          const active = form.kind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => upd('kind', k.id)}
              style={{
                textAlign: 'left', padding: '14px 16px',
                background: active ? brand('tint') : surface(),
                border: `1px solid ${active ? brand('base') : border(true)}`,
                borderRadius: 10, cursor: 'pointer', transition: 'all .12s',
                display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT_UI,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: active ? brand('base') : 'hsl(var(--paper-surface-muted))',
                color: active ? '#fff' : ink(2),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{KIND_ICON[k.id]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: active ? brand('ink') : ink() }}>{k.label}</div>
                <div style={{ fontSize: 12, color: ink(3), marginTop: 2 }}>{k.desc}</div>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: 999,
                border: `2px solid ${active ? brand('base') : border(true)}`,
                background: active ? brand('base') : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {active && <div style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }}/>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

// ─── Step 1: Importo ───
const Money: React.FC<{ value: number; onChange: (n: number) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative' }}>
    <span style={{
      position: 'absolute', left: 12, top: 0, bottom: 0,
      display: 'flex', alignItems: 'center', fontFamily: FONT_MONO, fontSize: 14, color: ink(3),
    }}>€</span>
    <PaperInput
      type="number" min={0}
      value={value || ''}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      placeholder={placeholder || '0'}
      style={{ paddingLeft: 28, fontFamily: FONT_MONO }}
    />
  </div>
);

const StepImporto: React.FC<{
  form: ExpenseWizardValues;
  upd: <K extends keyof ExpenseWizardValues>(k: K, v: ExpenseWizardValues[K]) => void;
  computed: { planned: number; confirmed: number };
  guestsPlanned: number;
  guestsConfirmed: number;
}> = ({ form, upd, computed, guestsPlanned, guestsConfirmed }) => (
  <div style={{ display: 'grid', gap: 18, fontFamily: FONT_UI }}>
    {form.kind === 'fixed' && (
      <div>
        <PaperLabel required>Importo totale</PaperLabel>
        <Money value={form.total} onChange={v => upd('total', v)}/>
      </div>
    )}

    {form.kind === 'per_person' && (
      <>
        <div>
          <PaperLabel required hint="Il costo per ogni invitato">Prezzo a persona</PaperLabel>
          <Money value={form.unit} onChange={v => upd('unit', v)} placeholder="Es. 85"/>
        </div>
        {form.unit > 0 && (
          <div style={{
            padding: '14px 16px', background: 'hsl(var(--paper-brand-tint))',
            border: `1px solid ${border()}`, borderRadius: 10, display: 'grid', gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: ink(2) }}>
                Con <b>{guestsPlanned} previsti</b>
              </span>
              <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color: ink() }}>
                {fmtEUR(computed.planned)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: ink(3) }}>
              <span style={{ fontSize: 12 }}>
                Con <b>{guestsConfirmed} confermati</b>
              </span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 13 }}>
                {fmtEUR(computed.confirmed)}
              </span>
            </div>
          </div>
        )}
      </>
    )}

    {form.kind === 'per_unit' && (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <PaperLabel required>Prezzo unitario</PaperLabel>
            <Money value={form.unit} onChange={v => upd('unit', v)}/>
          </div>
          <div>
            <PaperLabel required>Quantità</PaperLabel>
            <PaperInput
              type="number" min={0}
              value={form.qty || ''}
              onChange={e => upd('qty', parseFloat(e.target.value) || 0)}
              placeholder="Es. 130"
              style={{ fontFamily: FONT_MONO }}
            />
          </div>
        </div>
        {form.unit > 0 && form.qty > 0 && (
          <div style={{
            padding: '16px 18px', background: 'hsl(var(--paper-surface-muted))',
            border: `1px solid ${border()}`, borderRadius: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <span style={{ fontSize: 13, color: ink(2) }}>
              <span style={{ fontFamily: FONT_MONO }}>{fmtEUR(form.unit)}</span> × {form.qty}
            </span>
            <span style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 500, color: ink() }}>
              {fmtEUR(computed.planned)}
            </span>
          </div>
        )}
      </>
    )}
  </div>
);

// ─── Step 2: Pagamenti ───
const StepPagamenti: React.FC<{
  form: ExpenseWizardValues;
  upd: <K extends keyof ExpenseWizardValues>(k: K, v: ExpenseWizardValues[K]) => void;
  total: number;
}> = ({ form, upd, total }) => (
  <div style={{ display: 'grid', gap: 16, fontFamily: FONT_UI }}>
    <div>
      <PaperLabel>Vuoi definire un piano pagamenti?</PaperLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { id: false, label: 'No, lo faccio dopo' },
          { id: true,  label: 'Sì, ora' },
        ].map(opt => {
          const active = form.hasPayments === opt.id;
          return (
            <button
              key={String(opt.id)}
              type="button"
              onClick={() => upd('hasPayments', opt.id)}
              style={{
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: active ? brand('tint') : surface(),
                border: `1px solid ${active ? brand('base') : border(true)}`,
                color: active ? brand('ink') : ink(),
                fontWeight: active ? 500 : 400, fontSize: 13, fontFamily: FONT_UI,
              }}
            >{opt.label}</button>
          );
        })}
      </div>
    </div>

    {form.hasPayments && (
      <>
        <PaperDivider/>
        <div>
          <PaperLabel>Schema rate</PaperLabel>
          <PaperSelect
            value={form.scheme}
            onChange={v => upd('scheme', v as ExpenseWizardValues['scheme'])}
            options={[
              { value: 'single',     label: 'Pagamento unico' },
              { value: 'acconto50',  label: 'Acconto 50% + Saldo' },
              { value: 'thirds',     label: 'Tre rate uguali' },
            ]}
          />
        </div>

        <div style={{
          padding: '12px 14px', background: 'hsl(var(--paper-info-tint, 220 89% 95%))',
          border: '1px solid hsl(220 50% 88%)', borderRadius: 8,
          display: 'flex', gap: 8, color: 'hsl(220 73% 41%)', fontSize: 12,
        }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
          <span>
            Le rate vengono distribuite a partire dalla settimana prossima e fino al giorno delle nozze.
            Potrai modificarle in qualsiasi momento dalla scheda fornitore.
          </span>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {form.payments.map((p, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center',
              padding: '10px 12px', background: surface(), border: `1px solid ${border()}`, borderRadius: 8,
            }}>
              <div style={{ fontSize: 13, color: ink() }}>{p.description}</div>
              <div style={{ fontSize: 12, color: ink(3), fontFamily: FONT_MONO }}>
                {new Date(p.due_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: ink(), fontFamily: FONT_MONO, minWidth: 80, textAlign: 'right' }}>
                {fmtEUR(p.amount)}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          paddingTop: 8, borderTop: `1px dashed ${border(true)}`,
        }}>
          <span style={{ fontSize: 12, color: ink(3) }}>Totale rate</span>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color: ink() }}>
            {fmtEUR(form.payments.reduce((s, p) => s + p.amount, 0))} / {fmtEUR(total)}
          </span>
        </div>
      </>
    )}

    {!form.hasPayments && (
      <div style={{
        padding: 14, background: 'hsl(var(--paper-surface-muted))',
        border: `1px dashed ${border(true)}`, borderRadius: 10, fontSize: 13, color: ink(2),
      }}>
        Nessuna rata sarà creata. Potrai aggiungerne in qualunque momento dalla scheda fornitore.
        <div style={{ marginTop: 6, fontFamily: FONT_MONO, fontSize: 12, color: ink(3) }}>
          Importo totale: {fmtEUR(total)}
        </div>
      </div>
    )}
  </div>
);
