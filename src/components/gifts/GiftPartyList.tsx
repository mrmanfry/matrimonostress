import { useState } from 'react';
import { Clock, Check, Gift, X, CheckCheck, Trash2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    try {
      await deleteGift.mutateAsync(giftId);
      toast.success('Regalo rimosso');
    } catch {
      toast.error('Errore nella rimozione');
    }
  };

  const handleThankYou = async (giftId: string, currentStatus: string) => {
    const next = currentStatus === 'sent' ? 'pending' : 'sent';
    try {
      await updateThankYou.mutateAsync({ giftId, status: next });
    } catch {
      toast.error('Errore aggiornamento stato');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Nuclei Familiari</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {parties.map((party) => {
              const status = partyStatus(party, gifts);
              const partyGifts = gifts.filter((g) => g.party_id === party.id);
              const cashGift = partyGifts.find((g) => g.gift_category === 'cash');

              return (
                <div key={party.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <StatusIcon status={status} />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{party.party_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <RsvpBadge status={party.rsvp_status} />
                      </div>

                      {/* Gifts list */}
                      {partyGifts.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {partyGifts.map((g) => (
                            <div key={g.id} className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground capitalize">
                                {g.gift_category === 'cash' ? 'Contanti' : g.gift_category === 'physical_registry' ? 'Lista nozze' : 'Altro'}
                                {g.amount != null && !isPrivate ? ` — ${fmt(g.amount)}` : g.amount != null ? ' — ***€' : ''}
                              </span>
                              <button
                                onClick={() => handleThankYou(g.id, g.thank_you_status)}
                                title={g.thank_you_status === 'sent' ? 'Ringraziamento inviato' : 'Segna ringraziamento inviato'}
                                className={`transition-colors ${g.thank_you_status === 'sent' ? 'text-green-600' : 'text-muted-foreground hover:text-foreground'}`}
                              >
                                <Mail className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(g.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title="Rimuovi regalo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Estimated value */}
                      {status === 'simulated' && avgEstimate > 0 && (
                        <div className="text-xs text-yellow-600 mt-0.5">
                          Stima: {isPrivate ? '***€' : fmt(avgEstimate)}
                        </div>
                      )}
                    </div>
                  </div>

                  {status !== 'declined' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-xs h-7 px-2"
                      onClick={() => setDialogParty(party)}
                    >
                      + Regalo
                    </Button>
                  )}
                </div>
              );
            })}

            {parties.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nessun nucleo familiare trovato.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
  switch (status) {
    case 'cash':
      return <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />;
    case 'physical':
      return <Gift className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
    case 'declined':
      return <X className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />;
    default:
      return <Clock className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />;
  }
}

function RsvpBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    'Confermato': { label: 'Confermato', className: 'bg-green-100 text-green-700' },
    'In attesa': { label: 'In attesa', className: 'bg-yellow-100 text-yellow-700' },
    'Rifiutato': { label: 'Declinato', className: 'bg-gray-100 text-gray-500' },
  };
  const config = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
