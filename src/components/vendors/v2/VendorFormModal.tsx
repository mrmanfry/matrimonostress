// New "Paper" vendor add/edit modal — wraps the existing Supabase save flow.
import * as React from 'react';
import { Phone, Mail, Link as LinkIcon, Home } from 'lucide-react';
import {
  PaperModal, PaperButton, PaperLabel, PaperInput, PaperTextarea, PaperSelect, PaperDivider,
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
}

interface VendorFormModalProps {
  open: boolean;
  onClose: () => void;
  vendor: VendorRow | null;
  categories: { id: string; name: string }[];
  onSave: (values: VendorFormValues, vendorId?: string) => Promise<void>;
}

const emptyForm: VendorFormValues = {
  name: '', category_id: null, status: 'evaluating',
  contact_name: '', contact_role: '', phone: '', email: '',
  website: '', address: '', notes: '',
};

export const VendorFormModal: React.FC<VendorFormModalProps> = ({
  open, onClose, vendor, categories, onSave,
}) => {
  const isEdit = !!vendor?.id;
  const [form, setForm] = React.useState<VendorFormValues>(emptyForm);
  const [saving, setSaving] = React.useState(false);

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
      });
    } else {
      setForm(emptyForm);
    }
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
            <PaperSelect
              value={form.category_id || ''}
              onChange={v => upd('category_id', v || null)}
              options={[{ value: '', label: '— Nessuna —' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
            />
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
