// New "Paper" vendor add/edit modal — wraps the existing Supabase save flow.
import * as React from 'react';
import { Phone, Mail, Home, Plus, Check, X, Hotel, Users, Trash2 } from 'lucide-react';
import {
  PaperModal, PaperButton, PaperLabel, PaperInput, PaperTextarea, PaperSelect, PaperDivider,
  ink, surface, border,
} from './PaperUI';
import { VENDOR_STATUSES, normalizeStatus } from '@/lib/vendorAggregates';

export interface VendorFormValues {
  name: string;
  category_id: string | null;
  status: string;
  contact_name: string;
  contact_role: string; // not persisted yet (no column) but kept for UI parity
  phone: string;
  email: string;
  website: string;       // not persisted (no column) — stored in notes prefix optionally
  address: string;       // mapped to indirizzo_sede_legale if present
  notes: string;
  is_accommodation: boolean;
  staff_meals_count: number;
}

export interface VendorRow {
  id?: string;
  name: string | null;
  category_id: string | null;
  status: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  indirizzo_sede_legale?: string | null;
  is_accommodation?: boolean | null;
  staff_meals_count?: number | null;
}

interface VendorFormModalProps {
  open: boolean;
  onClose: () => void;
  vendor: VendorRow | null;
  categories: { id: string; name: string }[];
  onSave: (values: VendorFormValues, vendorId?: string) => Promise<void>;
  /** Optional: create a new category inline. Returns new category id. */
  onCreateCategory?: (name: string) => Promise<{ id: string; name: string } | null>;
}

const emptyForm: VendorFormValues = {
  name: '', category_id: null, status: 'evaluating',
  contact_name: '', contact_role: '', phone: '', email: '',
  website: '', address: '', notes: '',
  is_accommodation: false, staff_meals_count: 0,
};

const CREATE_CAT_VALUE = '__create__';

export const VendorFormModal: React.FC<VendorFormModalProps> = ({
  open, onClose, vendor, categories, onSave, onCreateCategory,
}) => {
  const isEdit = !!vendor?.id;
  const [form, setForm] = React.useState<VendorFormValues>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [creatingCat, setCreatingCat] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState('');
  const [savingCat, setSavingCat] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (vendor) {
      setForm({
        name: vendor.name || '',
        category_id: vendor.category_id,
        status: normalizeStatus(vendor.status || ''),
        contact_name: vendor.contact_name || '',
        contact_role: '',
        phone: vendor.phone || '',
        email: vendor.email || '',
        website: '',
        address: vendor.indirizzo_sede_legale || '',
        notes: vendor.notes || '',
        is_accommodation: !!vendor.is_accommodation,
        staff_meals_count: Number(vendor.staff_meals_count || 0),
      });
    } else {
      setForm(emptyForm);
    }
    setCreatingCat(false);
    setNewCatName('');
  }, [vendor, open]);

  const upd = <K extends keyof VendorFormValues>(k: K, v: VendorFormValues[K]) =>
    setForm(s => ({ ...s, [k]: v }));

  const valid = form.name.trim().length > 1;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(form, vendor?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!onCreateCategory) return;
    const name = newCatName.trim();
    if (name.length < 2) return;
    setSavingCat(true);
    try {
      const created = await onCreateCategory(name);
      if (created) {
        upd('category_id', created.id);
      }
      setCreatingCat(false);
      setNewCatName('');
    } finally {
      setSavingCat(false);
    }
  };

  return (
    <PaperModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Modifica fornitore' : 'Nuovo fornitore'}
      subtitle={isEdit
        ? 'Aggiorna i dettagli del fornitore.'
        : 'Aggiungi un fornitore alla tua lista. Potrai inserire le spese in un secondo momento.'}
      width={620}
      footer={(
        <>
          <PaperButton variant="ghost" onClick={onClose}>Annulla</PaperButton>
          <PaperButton variant="primary" disabled={!valid || saving} onClick={handleSave}>
            {saving ? 'Salvataggio…' : isEdit ? 'Salva modifiche' : 'Aggiungi fornitore'}
          </PaperButton>
        </>
      )}
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <PaperDivider label="Identità"/>
        <div>
          <PaperLabel required>Nome fornitore</PaperLabel>
          <PaperInput
            value={form.name}
            onChange={e => upd('name', e.target.value)}
            placeholder="Es. Fiori di Sant'Elia"
            autoFocus
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <PaperLabel required>Categoria</PaperLabel>
            {creatingCat ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <PaperInput
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Nome categoria"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={savingCat || newCatName.trim().length < 2}
                  title="Salva categoria"
                  style={{
                    flex: '0 0 32px', height: 36, borderRadius: 8,
                    border: `1px solid ${border()}`, background: surface(),
                    color: ink(), cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                ><Check size={14}/></button>
                <button
                  type="button"
                  onClick={() => { setCreatingCat(false); setNewCatName(''); }}
                  title="Annulla"
                  style={{
                    flex: '0 0 32px', height: 36, borderRadius: 8,
                    border: `1px solid ${border()}`, background: surface(),
                    color: ink(2), cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                ><X size={14}/></button>
              </div>
            ) : (
              <PaperSelect
                value={form.category_id || ''}
                onChange={v => {
                  if (v === CREATE_CAT_VALUE) {
                    setCreatingCat(true);
                    return;
                  }
                  upd('category_id', v || null);
                }}
                options={[
                  { value: '', label: '— Nessuna —' },
                  ...categories.map(c => ({ value: c.id, label: c.name })),
                  ...(onCreateCategory ? [{ value: CREATE_CAT_VALUE, label: '+ Crea nuova categoria…' }] : []),
                ]}
              />
            )}
          </div>
          <div>
            <PaperLabel>Stato</PaperLabel>
            <PaperSelect
              value={form.status}
              onChange={v => upd('status', v)}
              options={VENDOR_STATUSES.map(s => ({ value: s.id, label: s.label }))}
            />
          </div>
        </div>

        <PaperDivider label="Contatto"/>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <PaperLabel>Referente</PaperLabel>
            <PaperInput
              value={form.contact_name}
              onChange={e => upd('contact_name', e.target.value)}
              placeholder="Nome e cognome"
            />
          </div>
          <div>
            <PaperLabel>Telefono</PaperLabel>
            <PaperInput
              iconLeft={<Phone size={14}/>}
              value={form.phone}
              onChange={e => upd('phone', e.target.value)}
              placeholder="+39…"
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <PaperLabel>Email</PaperLabel>
            <PaperInput
              iconLeft={<Mail size={14}/>}
              value={form.email}
              onChange={e => upd('email', e.target.value)}
              placeholder="nome@dominio.it"
            />
          </div>
          <div>
            <PaperLabel>Indirizzo</PaperLabel>
            <PaperInput
              iconLeft={<Home size={14}/>}
              value={form.address}
              onChange={e => upd('address', e.target.value)}
              placeholder="Via, città"
            />
          </div>
        </div>

        <PaperDivider label="Logistica"/>
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
          border: `1px solid ${border()}`, borderRadius: 10, background: surface(),
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <input
            type="checkbox"
            checked={form.is_accommodation}
            onChange={e => upd('is_accommodation', e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: ink(), display: 'flex', alignItems: 'center', gap: 6 }}>
              <Hotel size={14}/> Struttura ricettiva (gestisce camere)
            </div>
            <div style={{ fontSize: 11, color: ink(3), marginTop: 4 }}>
              Se attivo, il fornitore appare nella sezione <b>Pernotto</b>: le camere e il prezzo totale
              sono gestiti da lì. Nella scheda Spese l'importo sarà bloccato — potrai però gestire il
              piano pagamenti.
            </div>
          </div>
        </label>

        <div>
          <PaperLabel hint="Quante persone del fornitore mangeranno al ricevimento (es. fotografo + assistente)">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Users size={12}/> Pasti staff fornitore
            </span>
          </PaperLabel>
          <PaperInput
            type="number"
            min={0}
            value={form.staff_meals_count || ''}
            onChange={e => upd('staff_meals_count', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </div>

        <PaperDivider label="Note"/>
        <PaperTextarea
          value={form.notes}
          onChange={e => upd('notes', e.target.value)}
          placeholder="Condizioni, preferenze, ricordi importanti…"
          rows={3}
        />
      </div>
    </PaperModal>
  );
};
