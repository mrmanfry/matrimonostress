// Dialog per modificare i prezzi di una spesa variabile.
// Supporta due modalità: "Per fasce" (Adulti/Bambini/Staff) o "Prezzo fisso"
// (un singolo importo che non dipende dal numero di invitati).
import * as React from 'react';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  PaperModal, PaperButton, PaperLabel, PaperInput, PaperSelect,
  ink, surface, border, FONT_SERIF, FONT_MONO, FONT_UI,
} from './PaperUI';
import { fmtEUR, AUDIENCE_LABELS, audienceTotal, type AudienceMap } from '@/lib/vendorAggregates';

type LineItem = {
  id: string;
  description: string;
  unit_price: number | string;
  quantity_type: string;
  tax_rate: number | string | null;
  price_is_tax_inclusive: boolean;
  order_index?: number | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  expenseItemId: string;
  description: string;
  lineItems: LineItem[];
  countsPlanned: { adults: number; children: number; staff: number };
  countsConfirmed: { adults: number; children: number; staff: number };
  onSaved: () => void;
}

const KEYS = ['adults', 'children', 'staff'] as const;
type Key = typeof KEYS[number];
type Mode = 'audience' | 'fixed';

export const EditAudiencePricesDialog: React.FC<Props> = ({
  open, onClose, expenseItemId, description, lineItems,
  countsPlanned, countsConfirmed, onSaved,
}) => {
  const [mode, setMode] = React.useState<Mode>('audience');
  const [draft, setDraft] = React.useState<AudienceMap>(() => buildDraft(lineItems));
  const [fixedAmount, setFixedAmount] = React.useState<number>(0);
  const [fixedTaxRate, setFixedTaxRate] = React.useState<number>(22);
  const [fixedTaxInclusive, setFixedTaxInclusive] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDraft(buildDraft(lineItems));
    // Precompute a sensible fixed amount from existing audience prices (sum of unit prices),
    // so switching feels natural.
    const sumUnit = lineItems.reduce((s, li) => s + (Number(li.unit_price) || 0), 0);
    setFixedAmount(sumUnit);
    const firstTax = lineItems.find(li => li.tax_rate != null);
    setFixedTaxRate(firstTax ? Number(firstTax.tax_rate) || 22 : 22);
    setFixedTaxInclusive(lineItems.length > 0 ? !!lineItems[0].price_is_tax_inclusive : true);
    setMode('audience');
  }, [open, lineItems]);

  const computed = {
    planned: audienceTotal(draft, countsPlanned),
    confirmed: audienceTotal(draft, countsConfirmed),
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Wipe existing line items in any case
      const { error: delErr } = await supabase
        .from('expense_line_items')
        .delete()
        .eq('expense_item_id', expenseItemId);
      if (delErr) {
        toast.error(delErr.message);
        return;
      }

      if (mode === 'fixed') {
        // Il totale "pagabile" è sempre IVA inclusa.
        const grossTotal = fixedTaxInclusive
          ? fixedAmount
          : fixedAmount * (1 + (fixedTaxRate || 0) / 100);
        const { error: updErr } = await supabase
          .from('expense_items')
          .update({
            expense_type: 'fixed',
            total_amount: grossTotal,
            fixed_amount: grossTotal,
            estimated_amount: grossTotal,
            tax_rate: fixedTaxRate,
            amount_is_tax_inclusive: true,
          })
          .eq('id', expenseItemId);
        if (updErr) {
          toast.error(updErr.message);
          return;
        }
        toast.success('Prezzo fisso aggiornato');
      } else {
        // Per-audience mode
        const rows = KEYS
          .map((k, idx) => {
            const a = draft[k];
            if (!a.enabled || a.unit_price <= 0) return null;
            return {
              expense_item_id: expenseItemId,
              description: AUDIENCE_LABELS[k],
              unit_price: a.unit_price,
              quantity_type: k,
              tax_rate: a.tax_rate,
              price_is_tax_inclusive: a.tax_inclusive,
              order_index: idx,
            };
          })
          .filter(Boolean) as any[];
        if (rows.length > 0) {
          const { error: insErr } = await supabase.from('expense_line_items').insert(rows);
          if (insErr) {
            toast.error(insErr.message);
            return;
          }
        }
        await supabase
          .from('expense_items')
          .update({ expense_type: 'variable', total_amount: computed.planned })
          .eq('id', expenseItemId);
        toast.success('Prezzi aggiornati');
      }

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <PaperModal
      open={open}
      onClose={onClose}
      title="Modifica prezzo"
      subtitle={description}
      width={620}
      footer={(
        <>
          <div style={{ flex: 1 }}/>
          <PaperButton variant="ghost" onClick={onClose} disabled={saving}>Annulla</PaperButton>
          <PaperButton variant="primary" iconLeft={<Check size={14}/>} onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </PaperButton>
        </>
      )}
    >
      <div style={{ display: 'grid', gap: 12, fontFamily: FONT_UI }}>
        {/* Mode switcher */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
          background: 'hsl(var(--paper-surface-muted))',
          padding: 4, borderRadius: 10, border: `1px solid ${border(true)}`,
        }}>
          {([
            { key: 'audience' as Mode, label: 'Per fasce (Adulti / Bambini / Staff)' },
            { key: 'fixed' as Mode, label: 'Prezzo fisso (indipendente dagli invitati)' },
          ]).map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              style={{
                padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: mode === opt.key ? surface() : 'transparent',
                boxShadow: mode === opt.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                fontSize: 12, color: ink(mode === opt.key ? 1 : 2),
                fontWeight: mode === opt.key ? 600 : 400, fontFamily: FONT_UI,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {mode === 'audience' && (
          <>
            <div style={{ fontSize: 12, color: ink(3) }}>
              Modifica i prezzi unitari per ciascuna fascia. Il totale si ricalcola automaticamente in base
              agli invitati previsti / confermati.
            </div>

            {KEYS.map(k => {
              const row = draft[k];
              const planQty = countsPlanned[k] || 0;
              const confQty = countsConfirmed[k] || 0;
              return (
                <div key={k} style={{
                  border: `1px solid ${border(true)}`, borderRadius: 10,
                  background: row.enabled ? surface() : 'hsl(var(--paper-surface-muted))',
                  padding: '12px 14px', display: 'grid', gap: 10,
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox" checked={row.enabled}
                      onChange={e => setDraft({ ...draft, [k]: { ...row, enabled: e.target.checked } })}
                    />
                    <span style={{ fontFamily: FONT_SERIF, fontSize: 15, color: ink() }}>{AUDIENCE_LABELS[k]}</span>
                    <span style={{ fontSize: 11, color: ink(3), fontFamily: FONT_MONO }}>
                      · {planQty} previsti / {confQty} confermati
                    </span>
                  </label>
                  {row.enabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 8, alignItems: 'end' }}>
                      <div>
                        <PaperLabel>Prezzo unitario</PaperLabel>
                        <div style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute', left: 12, top: 0, bottom: 0,
                            display: 'flex', alignItems: 'center', fontFamily: FONT_MONO, fontSize: 14, color: ink(3),
                          }}>€</span>
                          <PaperInput
                            type="number" min={0} step="0.01"
                            value={row.unit_price || ''}
                            onChange={e => setDraft({
                              ...draft, [k]: { ...row, unit_price: parseFloat(e.target.value) || 0 },
                            })}
                            placeholder="0"
                            style={{ paddingLeft: 28, fontFamily: FONT_MONO }}
                          />
                        </div>
                      </div>
                      <div>
                        <PaperLabel>IVA %</PaperLabel>
                        <PaperInput
                          type="number" min={0} max={100} step="0.5"
                          value={row.tax_rate}
                          onChange={e => setDraft({
                            ...draft, [k]: { ...row, tax_rate: parseFloat(e.target.value) || 0 },
                          })}
                          style={{ fontFamily: FONT_MONO }}
                        />
                      </div>
                      <div>
                        <PaperLabel>Modalità IVA</PaperLabel>
                        <PaperSelect
                          value={row.tax_inclusive ? 'incl' : 'excl'}
                          onChange={v => setDraft({
                            ...draft, [k]: { ...row, tax_inclusive: v === 'incl' },
                          })}
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
          </>
        )}

        {mode === 'fixed' && (
          <>
            <div style={{ fontSize: 12, color: ink(3) }}>
              Imposta un importo totale fisso. Non verrà ricalcolato in base al numero di invitati.
            </div>
            <div style={{
              border: `1px solid ${border(true)}`, borderRadius: 10,
              background: surface(), padding: '14px 16px',
              display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 10, alignItems: 'end',
            }}>
              <div>
                <PaperLabel>Importo totale</PaperLabel>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 12, top: 0, bottom: 0,
                    display: 'flex', alignItems: 'center', fontFamily: FONT_MONO, fontSize: 14, color: ink(3),
                  }}>€</span>
                  <PaperInput
                    type="number" min={0} step="0.01"
                    value={fixedAmount || ''}
                    onChange={e => setFixedAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    style={{ paddingLeft: 28, fontFamily: FONT_MONO }}
                  />
                </div>
              </div>
              <div>
                <PaperLabel>IVA %</PaperLabel>
                <PaperInput
                  type="number" min={0} max={100} step="0.5"
                  value={fixedTaxRate}
                  onChange={e => setFixedTaxRate(parseFloat(e.target.value) || 0)}
                  style={{ fontFamily: FONT_MONO }}
                />
              </div>
              <div>
                <PaperLabel>Modalità IVA</PaperLabel>
                <PaperSelect
                  value={fixedTaxInclusive ? 'incl' : 'excl'}
                  onChange={v => setFixedTaxInclusive(v === 'incl')}
                  options={[
                    { value: 'incl', label: 'Inclusa nel prezzo' },
                    { value: 'excl', label: 'Da aggiungere' },
                  ]}
                />
              </div>
            </div>
            {(() => {
              const gross = fixedTaxInclusive
                ? fixedAmount
                : fixedAmount * (1 + (fixedTaxRate || 0) / 100);
              return (
                <div style={{
                  padding: '14px 16px', background: 'hsl(var(--paper-brand-tint))',
                  border: `1px solid ${border()}`, borderRadius: 10,
                  display: 'grid', gap: 4,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 13, color: ink(2) }}>Totale (IVA inclusa)</span>
                    <span style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 500, color: ink() }}>
                      {fmtEUR(gross)}
                    </span>
                  </div>
                  {!fixedTaxInclusive && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: ink(3), fontSize: 12 }}>
                      <span>Imponibile {fmtEUR(fixedAmount)} + IVA {fixedTaxRate}%</span>
                      <span style={{ fontFamily: FONT_MONO }}>+{fmtEUR(gross - fixedAmount)}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </PaperModal>
  );
};

export function buildDraft(lineItems: LineItem[]): AudienceMap {
  const base: AudienceMap = {
    adults:   { enabled: false, unit_price: 0, tax_rate: 10, tax_inclusive: true },
    children: { enabled: false, unit_price: 0, tax_rate: 10, tax_inclusive: true },
    staff:    { enabled: false, unit_price: 0, tax_rate: 22, tax_inclusive: true },
  };
  for (const li of lineItems) {
    const k = li.quantity_type as Key;
    if (k !== 'adults' && k !== 'children' && k !== 'staff') continue;
    base[k] = {
      enabled: true,
      unit_price: Number(li.unit_price) || 0,
      tax_rate: Number(li.tax_rate) || 0,
      tax_inclusive: !!li.price_is_tax_inclusive,
    };
  }
  return base;
}
