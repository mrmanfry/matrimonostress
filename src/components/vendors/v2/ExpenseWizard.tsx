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
import {
  EXPENSE_KINDS, ExpenseKind, fmtEUR, generateSchedule, rebalanceSchedule,
  SchedulePayment, ScheduleScheme,
  AudienceMap, emptyAudienceMap, AUDIENCE_LABELS, AUDIENCE_QTY_TYPE, audienceTotal,
} from '@/lib/vendorAggregates';

export interface ExpenseWizardValues {
  kind: ExpenseKind;
  description: string;
  // pricing
  total: number;     // for 'fixed'
  unit: number;      // for 'per_person' / 'per_unit'
  qty: number;       // for 'per_unit'
  audience: AudienceMap; // for 'per_audience'
  // VAT (for fixed / per_person / per_unit; per_audience has its own per row)
  tax_rate: number;
  tax_inclusive: boolean;
  // computed at save-time (gross, IVA inclusa)
  computedTotal: number;
  // payments
  hasPayments: boolean;
  scheme: ScheduleScheme;
  acconto_pct: number;
  n_rate: number;
  payments: SchedulePayment[];
}


interface Props {
  open: boolean;
  onClose: () => void;
  vendorName?: string;
  guestsPlanned: number;
  guestsConfirmed: number;
  // Detailed counts for per_audience (defaults: adults = guests*, children = 0, staff = 0)
  countsPlanned?: { adults: number; children: number; staff: number };
  countsConfirmed?: { adults: number; children: number; staff: number };
  weddingDate: string | null;
  onSave: (values: ExpenseWizardValues) => Promise<void>;
}

const KIND_ICON: Record<ExpenseKind, React.ReactNode> = {
  fixed: <Tag size={18}/>,
  per_person: <Users size={18}/>,
  per_audience: <Users size={18}/>,
  per_unit: <Grid3x3 size={18}/>,
};

export const ExpenseWizard: React.FC<Props> = ({
  open, onClose, vendorName, guestsPlanned, guestsConfirmed,
  countsPlanned, countsConfirmed, weddingDate, onSave,
}) => {
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<ExpenseWizardValues>(() => init());
  const [saving, setSaving] = React.useState(false);

  function init(): ExpenseWizardValues {
    return {
      kind: 'fixed',
      description: '',
      total: 0, unit: 0, qty: 0,
      audience: emptyAudienceMap(),
      computedTotal: 0,
      hasPayments: false,
      scheme: 'single',
      acconto_pct: 50,
      n_rate: 3,
      payments: [],
    };
  }
  React.useEffect(() => { if (open) { setStep(0); setForm(init()); } }, [open]);

  const upd = <K extends keyof ExpenseWizardValues>(k: K, v: ExpenseWizardValues[K]) =>
    setForm(s => ({ ...s, [k]: v }));

  const cPlan = countsPlanned ?? { adults: guestsPlanned, children: 0, staff: 0 };
  const cConf = countsConfirmed ?? { adults: guestsConfirmed, children: 0, staff: 0 };

  // Computed totals (planned vs confirmed scenario).
  const computed = React.useMemo(() => {
    if (form.kind === 'per_person') return { planned: form.unit * guestsPlanned, confirmed: form.unit * guestsConfirmed };
    if (form.kind === 'per_unit')   return { planned: form.unit * form.qty,      confirmed: form.unit * form.qty };
    if (form.kind === 'per_audience') {
      return { planned: audienceTotal(form.audience, cPlan), confirmed: audienceTotal(form.audience, cConf) };
    }
    return { planned: form.total, confirmed: form.total };
  }, [form.kind, form.unit, form.qty, form.total, form.audience, guestsPlanned, guestsConfirmed, cPlan, cConf]);

  const canNext = (): boolean => {
    if (step === 0) return form.description.trim().length > 0;
    if (step === 1) {
      if (form.kind === 'fixed')        return form.total > 0;
      if (form.kind === 'per_person')   return form.unit > 0;
      if (form.kind === 'per_unit')     return form.unit > 0 && form.qty > 0;
      if (form.kind === 'per_audience') return computed.planned > 0;
    }
    return true;
  };

  // Auto-generate schedule when entering step 2 / scheme / pct change.
  React.useEffect(() => {
    if (step === 2 && form.hasPayments) {
      const sched = generateSchedule(form.scheme, computed.planned, weddingDate, {
        acconto_pct: form.acconto_pct, n_rate: form.n_rate,
      });
      setForm(s => ({ ...s, payments: sched }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form.hasPayments, form.scheme, form.acconto_pct, form.n_rate, computed.planned, weddingDate]);

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
          countsPlanned={cPlan} countsConfirmed={cConf}
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
export const Money: React.FC<{ value: number; onChange: (n: number) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
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
  countsPlanned: { adults: number; children: number; staff: number };
  countsConfirmed: { adults: number; children: number; staff: number };
}> = ({ form, upd, computed, guestsPlanned, guestsConfirmed, countsPlanned, countsConfirmed }) => (
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
              <span style={{ fontSize: 13, color: ink(2) }}>Con <b>{guestsPlanned} previsti</b></span>
              <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 500, color: ink() }}>
                {fmtEUR(computed.planned)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: ink(3) }}>
              <span style={{ fontSize: 12 }}>Con <b>{guestsConfirmed} confermati</b></span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 13 }}>{fmtEUR(computed.confirmed)}</span>
            </div>
          </div>
        )}
      </>
    )}

    {form.kind === 'per_audience' && (
      <AudienceEditor
        audience={form.audience}
        onChange={a => upd('audience', a)}
        countsPlanned={countsPlanned}
        countsConfirmed={countsConfirmed}
        computed={computed}
      />
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

// ─── Audience editor (per_audience) ───
export const AudienceEditor: React.FC<{
  audience: AudienceMap;
  onChange: (a: AudienceMap) => void;
  countsPlanned: { adults: number; children: number; staff: number };
  countsConfirmed: { adults: number; children: number; staff: number };
  computed: { planned: number; confirmed: number };
}> = ({ audience, onChange, countsPlanned, countsConfirmed, computed }) => {
  const keys = ['adults', 'children', 'staff'] as const;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ fontSize: 12, color: ink(3) }}>
        Imposta un prezzo per ciascuna fascia. L'IVA può essere già inclusa nel prezzo o aggiunta a parte.
      </div>
      {keys.map(k => {
        const row = audience[k];
        const planQty = countsPlanned[k] || 0;
        const confQty = countsConfirmed[k] || 0;
        return (
          <div key={k} style={{
            border: `1px solid ${border(true)}`, borderRadius: 10,
            background: row.enabled ? surface() : 'hsl(var(--paper-surface-muted))',
            padding: '12px 14px', display: 'grid', gap: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={row.enabled}
                  onChange={e => onChange({ ...audience, [k]: { ...row, enabled: e.target.checked } })}
                />
                <span style={{ fontFamily: FONT_SERIF, fontSize: 15, color: ink() }}>{AUDIENCE_LABELS[k]}</span>
                <span style={{ fontSize: 11, color: ink(3), fontFamily: FONT_MONO }}>
                  · {planQty} previsti / {confQty} confermati
                </span>
              </label>
            </div>
            {row.enabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 8, alignItems: 'end' }}>
                <div>
                  <PaperLabel>Prezzo unitario</PaperLabel>
                  <Money value={row.unit_price} onChange={v => onChange({ ...audience, [k]: { ...row, unit_price: v } })}/>
                </div>
                <div>
                  <PaperLabel>IVA %</PaperLabel>
                  <PaperInput
                    type="number" min={0} max={100} step="0.5"
                    value={row.tax_rate}
                    onChange={e => onChange({ ...audience, [k]: { ...row, tax_rate: parseFloat(e.target.value) || 0 } })}
                    style={{ fontFamily: FONT_MONO }}
                  />
                </div>
                <div>
                  <PaperLabel>Modalità IVA</PaperLabel>
                  <PaperSelect
                    value={row.tax_inclusive ? 'incl' : 'excl'}
                    onChange={v => onChange({ ...audience, [k]: { ...row, tax_inclusive: v === 'incl' } })}
                    options={[
                      { value: 'incl', label: 'Inclusa nel prezzo' },
                      { value: 'excl', label: 'Da aggiungere' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div style={{
        padding: '14px 16px', background: 'hsl(var(--paper-brand-tint))',
        border: `1px solid ${border()}`, borderRadius: 10, display: 'grid', gap: 6,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, color: ink(2) }}>Totale stimato (previsti)</span>
          <span style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 500, color: ink() }}>
            {fmtEUR(computed.planned)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', color: ink(3) }}>
          <span style={{ fontSize: 12 }}>Totale (confermati)</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 13 }}>{fmtEUR(computed.confirmed)}</span>
        </div>
      </div>
    </div>
  );
};

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
              { value: 'single',         label: 'Pagamento unico' },
              { value: 'acconto_custom', label: 'Acconto + Saldo' },
              { value: 'equal_n',        label: 'N rate uguali' },
              { value: 'custom',         label: 'Personalizzato' },
            ]}
          />
        </div>

        {form.scheme === 'acconto_custom' && (
          <div>
            <PaperLabel hint="Percentuale del totale richiesta come acconto">Percentuale acconto</PaperLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number" min={1} max={99}
                value={form.acconto_pct}
                onChange={e => upd('acconto_pct', Math.max(1, Math.min(99, parseInt(e.target.value) || 50)))}
                style={{
                  width: 90, padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${border(true)}`, fontFamily: FONT_MONO, fontSize: 14,
                  background: surface(),
                }}
              />
              <span style={{ color: ink(3), fontSize: 13 }}>% &nbsp;·&nbsp; saldo automatico {100 - form.acconto_pct}%</span>
            </div>
          </div>
        )}

        {form.scheme === 'equal_n' && (
          <div>
            <PaperLabel>Numero di rate</PaperLabel>
            <input
              type="number" min={2} max={12}
              value={form.n_rate}
              onChange={e => upd('n_rate', Math.max(2, Math.min(12, parseInt(e.target.value) || 3)))}
              style={{
                width: 90, padding: '8px 10px', borderRadius: 8,
                border: `1px solid ${border(true)}`, fontFamily: FONT_MONO, fontSize: 14,
                background: surface(),
              }}
            />
          </div>
        )}

        <div style={{
          padding: '12px 14px', background: 'hsl(var(--paper-info-tint, 220 89% 95%))',
          border: '1px solid hsl(220 50% 88%)', borderRadius: 8,
          display: 'flex', gap: 8, color: 'hsl(220 73% 41%)', fontSize: 12,
        }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }}/>
          <span>
            Modifica liberamente descrizione, importo e data. Il saldo viene ricalcolato in automatico per quadrare con il totale.
          </span>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {form.payments.map((p, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: 8, alignItems: 'center',
              padding: '10px 12px', background: p.is_balance ? brand('tint') : surface(),
              border: `1px solid ${p.is_balance ? brand('base') : border()}`, borderRadius: 8,
            }}>
              <input
                value={p.description}
                onChange={e => {
                  const next = [...form.payments];
                  next[i] = { ...next[i], description: e.target.value };
                  upd('payments', next);
                }}
                style={{
                  padding: '6px 8px', border: `1px solid transparent`, borderRadius: 6,
                  fontSize: 13, color: ink(), background: 'transparent', fontFamily: FONT_UI,
                }}
                onFocus={e => e.currentTarget.style.borderColor = border(true)}
                onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
              />
              <input
                type="date"
                value={p.due_date}
                onChange={e => {
                  const next = [...form.payments];
                  next[i] = { ...next[i], due_date: e.target.value };
                  upd('payments', next);
                }}
                style={{
                  padding: '6px 8px', borderRadius: 6, border: `1px solid ${border(true)}`,
                  fontSize: 12, color: ink(2), background: surface(), fontFamily: FONT_MONO,
                }}
              />
              <input
                type="number" min={0} step="0.01"
                value={p.is_balance ? p.amount.toFixed(2) : (p.amount || '')}
                disabled={p.is_balance}
                onChange={e => {
                  const v = parseFloat(e.target.value) || 0;
                  const next = [...form.payments];
                  next[i] = { ...next[i], amount: v };
                  upd('payments', rebalanceSchedule(next, total));
                }}
                style={{
                  padding: '6px 8px', borderRadius: 6, border: `1px solid ${border(true)}`,
                  fontSize: 13, color: ink(), background: p.is_balance ? 'transparent' : surface(),
                  fontFamily: FONT_MONO, textAlign: 'right',
                }}
              />
              {form.scheme === 'custom' && !p.is_balance && form.payments.length > 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    const next = form.payments.filter((_, j) => j !== i);
                    upd('payments', rebalanceSchedule(next, total));
                  }}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: ink(3), fontSize: 16, padding: '4px 8px',
                  }}
                  title="Rimuovi rata"
                >×</button>
              ) : <div />}
            </div>
          ))}
        </div>

        {form.scheme === 'custom' && (
          <button
            type="button"
            onClick={() => {
              const balanceIdx = form.payments.findIndex(p => p.is_balance);
              const insertAt = balanceIdx >= 0 ? balanceIdx : form.payments.length;
              const next = [...form.payments];
              next.splice(insertAt, 0, {
                description: `Rata ${insertAt + 1}`, amount: 0,
                due_date: form.payments[Math.max(0, insertAt - 1)]?.due_date || new Date().toISOString().slice(0, 10),
              });
              upd('payments', rebalanceSchedule(next, total));
            }}
            style={{
              padding: '8px 12px', borderRadius: 8, border: `1px dashed ${border(true)}`,
              background: 'transparent', color: ink(2), fontSize: 12, fontFamily: FONT_UI, cursor: 'pointer',
            }}
          >+ Aggiungi rata</button>
        )}

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
