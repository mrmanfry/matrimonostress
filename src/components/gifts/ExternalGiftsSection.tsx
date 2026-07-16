// src/components/gifts/ExternalGiftsSection.tsx
import { useState } from 'react';
import { Check, Gift as GiftIcon, Trash2, Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddGiftDialog } from './AddGiftDialog';
import type { Gift as GiftRow } from '@/hooks/useGifts';
import { useDeleteGift, useUpdateGiftThankYou } from '@/hooks/useGifts';
import { toast } from 'sonner';

interface Props {
  gifts: GiftRow[];
  weddingId: string;
  isPrivate: boolean;
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function ExternalGiftsSection({ gifts, weddingId, isPrivate }: Props) {
  const [open, setOpen] = useState(false);
  const external = gifts.filter((g) => !g.party_id);
  const deleteGift = useDeleteGift(weddingId);
  const updateThankYou = useUpdateGiftThankYou(weddingId);

  const handleDelete = async (id: string) => {
    try { await deleteGift.mutateAsync(id); toast.success('Regalo rimosso'); }
    catch { toast.error('Errore nella rimozione'); }
  };
  const handleThankYou = async (id: string, current: string) => {
    const next = current === 'sent' ? 'pending' : 'sent';
    try { await updateThankYou.mutateAsync({ giftId: id, status: next }); }
    catch { toast.error('Errore aggiornamento stato'); }
  };

  return (
    <>
      <div style={{
        background: 'hsl(var(--paper-surface))',
        border: '1px solid hsl(var(--paper-border))',
        borderRadius: 14,
        boxShadow: '0 1px 2px hsl(24 14% 15% / 0.04)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--paper-border))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 17, letterSpacing: '-0.01em', color: 'hsl(var(--paper-ink))' }}>
              Regali esterni
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'hsl(var(--paper-ink-3))' }}>
              Regali ricevuti da persone non presenti nella lista invitati.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2.5 rounded-lg"
            style={{ borderColor: 'hsl(var(--paper-border-strong))', color: 'hsl(var(--paper-ink))' }}
            onClick={() => setOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Aggiungi
          </Button>
        </div>

        {external.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'hsl(var(--paper-ink-3))' }}>
            Nessun regalo esterno registrato.
          </div>
        ) : (
          <div>
            {external.map((g, i) => (
              <div
                key={g.id}
                style={{
                  padding: '12px 20px',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  borderBottom: i < external.length - 1 ? '1px solid hsl(var(--paper-border))' : 'none',
                }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: g.gift_category === 'cash' ? 'hsl(var(--paper-success) / 0.12)' : 'hsl(var(--paper-info) / 0.12)',
                  color: g.gift_category === 'cash' ? 'hsl(var(--paper-success))' : 'hsl(var(--paper-info))',
                }}>
                  {g.gift_category === 'cash' ? <Check className="w-3.5 h-3.5" /> : <GiftIcon className="w-3.5 h-3.5" />}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--paper-ink))' }}>
                    {(g as any).donor_name || 'Anonimo'}
                  </div>
                  <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'hsl(var(--paper-ink-2))' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {g.gift_category === 'cash' ? 'Contanti / Bonifico' : g.gift_category === 'physical_registry' ? 'Lista nozze' : 'Altro'}
                      {g.amount != null && !isPrivate ? ` — ${fmt(g.amount)}` : g.amount != null ? ' — ***€' : ''}
                    </span>
                    <button
                      onClick={() => handleThankYou(g.id, g.thank_you_status)}
                      title={g.thank_you_status === 'sent' ? 'Ringraziamento inviato' : 'Segna ringraziamento inviato'}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex',
                        color: g.thank_you_status === 'sent' ? 'hsl(var(--paper-success))' : 'hsl(var(--paper-ink-3))' }}
                    >
                      <Mail className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      title="Rimuovi regalo"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', color: 'hsl(var(--paper-ink-3))' }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {g.notes && (
                    <div style={{ marginTop: 4, fontSize: 12, color: 'hsl(var(--paper-ink-3))' }}>{g.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddGiftDialog
        open={open}
        onOpenChange={setOpen}
        partyId={null}
        weddingId={weddingId}
      />
    </>
  );
}
