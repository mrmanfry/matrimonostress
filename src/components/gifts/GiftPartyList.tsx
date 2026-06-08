// src/components/gifts/GiftPartyList.tsx — RESTYLED (paper tokens, Fraunces, soft badges)
import { useState } from 'react';
import { Clock, Check, Gift, X, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddGiftDialog } from './AddGiftDialog';
import type { Gift as GiftRow } from '@/hooks/useGifts';
import { useDeleteGift, useUpdateGiftThankYou } from '@/hooks/useGifts';
import { toast } from 'sonner';

export interface PartyRow {
  id: string;
  party_name: string;
  rsvp_status: string;
}

interface Props {
  parties: PartyRow[];
  gifts: GiftRow[];
  weddingId: string;
  avgEstimate: number;
  isPrivate: boolean;
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function partyStatus(party: PartyRow, gifts: GiftRow[]) {
  const partyGifts = gifts.filter((g) => g.party_id === party.id);
  if (party.rsvp_status === 'Rifiutato') return 'declined';
  if (partyGifts.some((g) => g.gift_category === 'cash')) return 'cash';
  if (partyGifts.length > 0) return 'physical';
  return 'simulated';
}

export function GiftPartyList({ parties, gifts, weddingId, avgEstimate, isPrivate }: Props) {
  const [dialogParty, setDialogParty] = useState<PartyRow | null>(null);
  const deleteGift = useDeleteGift(weddingId);
  const updateThankYou = useUpdateGiftThankYou(weddingId);

  const handleDelete = async (giftId: string) => {
    try { await deleteGift.mutateAsync(giftId); toast.success('Regalo rimosso'); }
    catch { toast.error('Errore nella rimozione'); }
  };
  const handleThankYou = async (giftId: string, currentStatus: string) => {
    const next = currentStatus === 'sent' ? 'pending' : 'sent';
    try { await updateThankYou.mutateAsync({ giftId, status: next }); }
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
        <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--paper-border))' }}>
          <h2 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 17, letterSpacing: '-0.01em', color: 'hsl(var(--paper-ink))' }}>
            Nuclei Familiari
          </h2>
        </div>

        <div>
          {parties.map((party, i) => {
            const status = partyStatus(party, gifts);
            const partyGifts = gifts.filter((g) => g.party_id === party.id);

            return (
              <div
                key={party.id}
                style={{
                  padding: '14px 20px',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                  borderBottom: i < parties.length - 1 ? '1px solid hsl(var(--paper-border))' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                  <StatusIcon status={status} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--paper-ink))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {party.party_name}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <RsvpBadge status={party.rsvp_status} />
                    </div>

                    {partyGifts.length > 0 && (
                      <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                        {partyGifts.map((g) => (
                          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'hsl(var(--paper-ink-2))' }}>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                              {g.gift_category === 'cash' ? 'Contanti' : g.gift_category === 'physical_registry' ? 'Lista nozze' : 'Altro'}
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
                        ))}
                      </div>
                    )}

                    {status === 'simulated' && avgEstimate > 0 && (
                      <div style={{ fontSize: 12, color: 'hsl(var(--paper-gold))', marginTop: 4 }}>
                        Stima: {isPrivate ? '***€' : fmt(avgEstimate)}
                      </div>
                    )}
                  </div>
                </div>

                {status !== 'declined' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs h-7 px-2.5 rounded-lg"
                    style={{ borderColor: 'hsl(var(--paper-border-strong))', color: 'hsl(var(--paper-ink))' }}
                    onClick={() => setDialogParty(party)}
                  >
                    + Regalo
                  </Button>
                )}
              </div>
            );
          })}

          {parties.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'hsl(var(--paper-ink-3))' }}>
              Nessun nucleo familiare trovato.
            </div>
          )}
        </div>
      </div>

      {dialogParty && (
        <AddGiftDialog
          open={!!dialogParty}
          onOpenChange={(v) => { if (!v) setDialogParty(null); }}
          partyId={dialogParty.id}
          partyName={dialogParty.party_name}
          weddingId={weddingId}
        />
      )}
    </>
  );
}

function StatusIcon({ status }: { status: string }) {
  const wrap = (color: string, node: React.ReactNode) => (
    <span style={{
      width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: `hsl(var(--paper-${color}) / 0.12)`, color: `hsl(var(--paper-${color}))`,
    }}>{node}</span>
  );
  switch (status) {
    case 'cash':     return wrap('success', <Check className="w-3.5 h-3.5" />);
    case 'physical': return wrap('info', <Gift className="w-3.5 h-3.5" />);
    case 'declined': return (
      <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'hsl(var(--paper-surface-muted))', color: 'hsl(var(--paper-ink-3))' }}>
        <X className="w-3.5 h-3.5" />
      </span>
    );
    default:         return wrap('gold', <Clock className="w-3.5 h-3.5" />);
  }
}

function RsvpBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; fg: string; bd: string }> = {
    'Confermato': { label: 'Confermato', bg: 'hsl(var(--paper-success-tint))', fg: 'hsl(var(--paper-success))', bd: 'hsl(138 36% 86%)' },
    'In attesa':  { label: 'In attesa',  bg: 'hsl(var(--paper-warn-tint))',    fg: 'hsl(var(--paper-warn))',    bd: 'hsl(39 60% 84%)' },
    'Rifiutato':  { label: 'Declinato',  bg: 'hsl(var(--paper-surface-muted))', fg: 'hsl(var(--paper-ink-3))',  bd: 'hsl(var(--paper-border))' },
  };
  const c = map[status] ?? { label: status, bg: 'hsl(var(--paper-surface-muted))', fg: 'hsl(var(--paper-ink-3))', bd: 'hsl(var(--paper-border))' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: c.bg, color: c.fg, border: `1px solid ${c.bd}` }}>
      {c.label}
    </span>
  );
}
