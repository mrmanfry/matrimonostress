// Confirmation dialog for deleting a vendor with cascade preview.
import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { PaperModal, PaperButton, PaperInput, PaperLabel, ink, border, surface, warn } from './PaperUI';
import { previewVendorDeletion, deleteVendorCascade, VendorDeletionPreview } from '@/lib/vendorAggregates';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  vendorId: string | null;
  weddingId: string | null;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteVendorDialog: React.FC<Props> = ({ open, vendorId, weddingId, onClose, onDeleted }) => {
  const { toast } = useToast();
  const [preview, setPreview] = React.useState<VendorDeletionPreview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');

  React.useEffect(() => {
    if (!open || !vendorId) { setPreview(null); setConfirmText(''); return; }
    setLoading(true);
    previewVendorDeletion(vendorId)
      .then(setPreview)
      .finally(() => setLoading(false));
  }, [open, vendorId]);

  const blocked = preview && preview.accommodationRooms > 0;
  const canDelete = !!preview && !blocked && confirmText.trim().toLowerCase() === (preview?.vendorName || '').trim().toLowerCase();

  const handleDelete = async () => {
    if (!vendorId || !weddingId || !canDelete) return;
    setDeleting(true);
    try {
      const res = await deleteVendorCascade(vendorId, weddingId);
      if (res.blocked) {
        toast({ title: 'Impossibile eliminare', description: res.blocked, variant: 'destructive' });
        return;
      }
      toast({ title: 'Fornitore eliminato', description: `${preview?.vendorName} e tutti i dati collegati sono stati rimossi.` });
      onDeleted();
      onClose();
    } catch (e: any) {
      toast({ title: 'Errore', description: e?.message || 'Eliminazione fallita', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PaperModal
      open={open}
      onClose={deleting ? () => {} : onClose}
      title="Elimina fornitore"
      subtitle="Operazione irreversibile. Verranno rimossi anche i dati collegati."
      width={520}
      footer={
        <>
          <PaperButton variant="ghost" onClick={onClose} disabled={deleting}>Annulla</PaperButton>
          <PaperButton variant="danger" onClick={handleDelete} disabled={!canDelete || deleting}>
            {deleting ? 'Eliminazione…' : 'Elimina definitivamente'}
          </PaperButton>
        </>
      }
    >
      {loading || !preview ? (
        <div style={{ padding: 24, textAlign: 'center', color: ink(3), fontSize: 13 }}>Caricamento…</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{
            display: 'flex', gap: 12, padding: '12px 14px',
            background: 'hsl(var(--paper-warn) / 0.08)',
            border: `1px solid ${warn()}`, borderRadius: 10,
          }}>
            <AlertTriangle size={18} style={{ color: warn(), flex: '0 0 auto', marginTop: 2 }}/>
            <div style={{ fontSize: 13, color: ink(), lineHeight: 1.5 }}>
              Stai per eliminare <b>{preview.vendorName}</b>. Questa azione non può essere annullata.
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: ink(3), letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              Cosa verrà eliminato
            </div>
            <div style={{
              border: `1px solid ${border()}`, borderRadius: 10, background: surface(),
              overflow: 'hidden',
            }}>
              <Row label="Voci di spesa" value={preview.expenseItems} />
              <Row label="Rate di pagamento" value={preview.payments} />
              <Row label="Contratti" value={preview.contracts} suffix={preview.storageFiles > 0 ? `+ ${preview.storageFiles} file su storage` : undefined} />
              <Row label="Appuntamenti" value={preview.appointments} />
              <Row label="Comunicazioni" value={preview.communications} />
              <Row label="Attività in checklist" value={preview.checklistTasks} suffix={preview.checklistTasks > 0 ? 'verranno scollegate, non eliminate' : undefined} last />
            </div>
          </div>

          {blocked && (
            <div style={{
              padding: '12px 14px', background: 'hsl(0 73% 35% / 0.08)',
              border: `1px solid hsl(0 73% 35%)`, borderRadius: 10,
              fontSize: 13, color: 'hsl(0 73% 25%)', lineHeight: 1.5,
            }}>
              Questo fornitore ha <b>{preview.accommodationRooms} camera/e</b> collegata/e in Pernotto. Rimuovile dalla sezione Pernotto prima di poter eliminare il fornitore.
            </div>
          )}

          {!blocked && (
            <div>
              <PaperLabel required>
                Per confermare, digita il nome del fornitore: <b>{preview.vendorName}</b>
              </PaperLabel>
              <PaperInput
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={preview.vendorName}
                autoFocus
              />
            </div>
          )}
        </div>
      )}
    </PaperModal>
  );
};

const Row: React.FC<{ label: string; value: number; suffix?: string; last?: boolean }> = ({ label, value, suffix, last }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    padding: '10px 14px',
    borderBottom: last ? 'none' : `1px solid ${border()}`,
    fontSize: 13,
  }}>
    <span style={{ color: ink(2) }}>{label}</span>
    <span style={{ color: ink(), fontWeight: 500 }}>
      {value}
      {suffix && <span style={{ marginLeft: 8, color: ink(3), fontSize: 11, fontWeight: 400 }}>{suffix}</span>}
    </span>
  </div>
);
