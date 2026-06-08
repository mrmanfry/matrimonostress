// src/components/gifts/GiftPartyList.tsx — RESTYLED + filters
import { useState, useMemo } from 'react';
import { Clock, Check, Gift, X, Trash2, Mail, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  personsPerParty: Record<string, number>;
  guestNamesByParty?: Record<string, string[]>;
}

const fmt = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

type RsvpFilter = 'all' | 'Confermato' | 'In attesa' | 'Rifiutato';
type GiftFilter = 'all' | 'registered' | 'missing' | 'cash' | 'physical';

function partyStatus(party: PartyRow, gifts: GiftRow[]) {
  const partyGifts = gifts.filter((g) => g.party_id === party.id);
  if (party.rsvp_status === 'Rifiutato') return 'declined';
  if (partyGifts.some((g) => g.gift_category === 'cash')) return 'cash';
  if (partyGifts.length > 0) return 'physical';
  return 'simulated';
}

export function GiftPartyList({ parties, gifts, weddingId, avgEstimate, isPrivate, personsPerParty, guestNamesByParty }: Props) {
  const [dialogParty, setDialogParty] = useState<PartyRow | null>(null);
  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('all');
  const [giftFilter, setGiftFilter] = useState<GiftFilter>('all');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parties.filter((p) => {
      if (q) {
        const inPartyName = p.party_name.toLowerCase().includes(q);
        const names = guestNamesByParty?.[p.id] ?? [];
        const inGuestNames = names.some((n) => n.toLowerCase().includes(q));
        if (!inPartyName && !inGuestNames) return false;
      }
      if (rsvpFilter !== 'all' && p.rsvp_status !== rsvpFilter) return false;
      const partyGifts = gifts.filter((g) => g.party_id === p.id);
      const hasGift = partyGifts.length > 0;
      switch (giftFilter) {
        case 'registered': if (!hasGift) return false; break;
        case 'missing':    if (hasGift) return false; break;
        case 'cash':       if (!partyGifts.some(g => g.gift_category === 'cash')) return false; break;
        case 'physical':   if (!partyGifts.some(g => g.gift_category === 'physical_registry')) return false; break;
      }
      return true;
    });
  }, [parties, gifts, search, rsvpFilter, giftFilter, guestNamesByParty]);

  const anyFilter = !!search || rsvpFilter !== 'all' || giftFilter !== 'all';

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
          <h2 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 500, fontSize: 17, letterSpacing: '-0.01em', color: 'hsl(var(--paper-ink))' }}>
            Nuclei Familiari
          </h2>
          <span style={{ fontSize: 12, color: 'hsl(var(--paper-ink-3))', fontFamily: "'JetBrains Mono', monospace" }}>
            {filtered.length} {filtered.length === parties.length ? `nucle${parties.length === 1 ? 'o' : 'i'}` : `su ${parties.length}`}
          </span>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid hsl(var(--paper-border))', background: 'hsl(var(--paper-bg) / 0.4)', display: 'grid', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search className="w-4 h-4" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--paper-ink-3))' }} />
            <Input
              placeholder="Cerca per nucleo o nome e cognome…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-paper-surface border-paper-border text-paper-ink placeholder:text-paper-ink-3"
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <ChipGroup
              label="RSVP"
              value={rsvpFilter}
              onChange={(v) => setRsvpFilter(v as RsvpFilter)}
              options={[
                { v: 'all', l: 'Tutti' },
                { v: 'Confermato', l: 'Confermato' },
                { v: 'In attesa', l: 'In attesa' },
                { v: 'Rifiutato', l: 'Rifiutato' },
              ]}
            />
            <ChipGroup
              label="Regalo"
              value={giftFilter}
              onChange={(v) => setGiftFilter(v as GiftFilter)}
              options={[
                { v: 'all', l: 'Tutti' },
                { v: 'registered', l: 'Registrato' },
                { v: 'missing', l: 'Da registrare' },
                { v: 'cash', l: 'Solo contanti' },
                { v: 'physical', l: 'Solo lista' },
              ]}
            />
            {anyFilter && (
              <button
                onClick={() => { setSearch(''); setRsvpFilter('all'); setGiftFilter('all'); }}
                style={{
                  marginLeft: 'auto', fontSize: 11.5, color: 'hsl(var(--paper-brand))',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px',
                }}
              >
                Azzera filtri
              </button>
            )}
          </div>
        </div>

        <div>
          {filtered.map((party, i) => {
            const status = partyStatus(party, gifts);
            const partyGifts = gifts.filter((g) => g.party_id === party.id);
            const personCount = personsPerParty[party.id] ?? 0;
            const estimateForParty = avgEstimate * personCount;

            return (
              <div
                key={party.id}
                style={{
                  padding: '14px 20px',
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                  borderBottom: i < filtered.length - 1 ? '1px solid hsl(var(--paper-border))' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                  <StatusIcon status={status} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'hsl(var(--paper-ink))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {party.party_name}
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <RsvpBadge status={party.rsvp_status} />
                      {personCount > 0 && (
                        <span style={{ fontSize: 11, color: 'hsl(var(--paper-ink-3))' }}>
                          · {personCount} {personCount === 1 ? 'persona' : 'persone'}
                        </span>
                      )}
                    </div>

                    {partyGifts.length > 0 && (
                      <div style={{ marginTop: 6, display: 'grid', gap: 4 }}>
                        {partyGifts.map((g) => (
                          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'hsl(var(--paper-ink-2))' }}>
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
                        ))}
                      </div>
                    )}

                    {status === 'simulated' && estimateForParty > 0 && (
                      <div style={{ fontSize: 12, color: 'hsl(var(--paper-gold))', marginTop: 4 }}>
                        Stima: {isPrivate ? '***€' : fmt(estimateForParty)}
                        <span style={{ color: 'hsl(var(--paper-ink-3))' }}> ({personCount} × {isPrivate ? '***€' : fmt(avgEstimate)})</span>
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

          {filtered.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'hsl(var(--paper-ink-3))' }}>
              {parties.length === 0 ? 'Nessun nucleo familiare trovato.' : 'Nessun nucleo corrisponde ai filtri.'}
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

function ChipGroup({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--paper-ink-3))', fontWeight: 600 }}>{label}</span>
      {options.map((o) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              fontSize: 11.5,
              padding: '4px 10px',
              borderRadius: 999,
              border: '1px solid',
              borderColor: active ? 'hsl(var(--paper-brand))' : 'hsl(var(--paper-border))',
              background: active ? 'hsl(var(--paper-brand-tint))' : 'hsl(var(--paper-surface))',
              color: active ? 'hsl(var(--paper-brand-ink))' : 'hsl(var(--paper-ink-2))',
              cursor: 'pointer',
              fontWeight: active ? 600 : 500,
            }}
          >
            {o.l}
          </button>
        );
      })}
    </div>
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
