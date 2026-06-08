// src/pages/Gifts.tsx — RESTYLED to WedsApp "paper" design system
import { useEffect, useState, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useGifts, useGiftForecast } from '@/hooks/useGifts';
import { GiftCoverageWidget } from '@/components/gifts/GiftCoverageWidget';
import { GiftSimulatorSlider } from '@/components/gifts/GiftSimulatorSlider';
import { GiftPartyList, type PartyRow } from '@/components/gifts/GiftPartyList';

const PRIVACY_KEY = 'gifts_privacy_enabled';
const ESTIMATE_KEY = 'gifts_avg_estimate_per_person';

type GuestRow = { id: string; party_id: string | null; is_couple_member: boolean | null; is_staff: boolean | null };

export default function Gifts() {
  const { authState } = useAuth();
  const weddingId = authState.status === 'authenticated' ? authState.activeWeddingId : null;

  const [parties, setParties] = useState<PartyRow[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  const [guests, setGuests] = useState<GuestRow[]>([]);

  const [isPrivate, setIsPrivate] = useState(() => {
    try { return localStorage.getItem(PRIVACY_KEY) === 'true'; } catch { return false; }
  });
  const [avgEstimate, setAvgEstimate] = useState(() => {
    try {
      const v = localStorage.getItem(ESTIMATE_KEY);
      return v != null ? Number(v) : 100;
    } catch { return 100; }
  });

  const { data: gifts = [], isLoading: giftsLoading } = useGifts(weddingId);
  const { data: forecast, isLoading: forecastLoading } = useGiftForecast(weddingId, avgEstimate);

  useEffect(() => {
    if (!weddingId) return;
    setPartiesLoading(true);
    Promise.all([
      supabase.from('invite_parties').select('id, party_name, rsvp_status').eq('wedding_id', weddingId).order('party_name'),
      supabase.from('guests').select('id, party_id, is_couple_member, is_staff').eq('wedding_id', weddingId),
    ]).then(([pRes, gRes]) => {
      if (!pRes.error && pRes.data) setParties(pRes.data as PartyRow[]);
      if (!gRes.error && gRes.data) setGuests(gRes.data as GuestRow[]);
      setPartiesLoading(false);
    });
  }, [weddingId]);

  const personsPerParty = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of guests) {
      if (!g.party_id) continue;
      if (g.is_couple_member || g.is_staff) continue;
      map[g.party_id] = (map[g.party_id] ?? 0) + 1;
    }
    return map;
  }, [guests]);

  const togglePrivacy = () => {
    const next = !isPrivate;
    setIsPrivate(next);
    try { localStorage.setItem(PRIVACY_KEY, String(next)); } catch {}
  };
  const handleEstimateChange = (v: number) => {
    setAvgEstimate(v);
    try { localStorage.setItem(ESTIMATE_KEY, String(v)); } catch {}
  };

  const loading = giftsLoading || forecastLoading || partiesLoading;

  const defaultForecast = {
    total_cash_received: 0, total_expenses: 0, eligible_parties_count: 0, eligible_persons_count: 0,
    total_forecast: 0, projected_liquidity: 0, net_budget_coverage: 0,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--paper-bg))' }}>
      <div
        className="gifts-body"
        style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px', display: 'grid', gap: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--paper-ink-3))', marginBottom: 8 }}>
              Regali
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: 34, letterSpacing: '-0.02em', color: 'hsl(var(--paper-ink))' }}>
              Regali &amp; Net Budget
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: 'hsl(var(--paper-ink-2))' }}>
              Traccia i regali ricevuti e simula la copertura del budget.
            </p>
          </div>
          <button
            onClick={togglePrivacy}
            title={isPrivate ? 'Mostra valori' : 'Nascondi valori'}
            style={{
              width: 40, height: 40, flexShrink: 0, borderRadius: 10, cursor: 'pointer',
              background: 'hsl(var(--paper-surface))', border: '1px solid hsl(var(--paper-border))',
              color: 'hsl(var(--paper-ink-2))', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <GiftCoverageWidget forecast={forecast ?? defaultForecast} isPrivate={isPrivate} />
            <GiftSimulatorSlider
              value={avgEstimate}
              onChange={handleEstimateChange}
              eligibleCount={forecast?.eligible_parties_count ?? 0}
              eligiblePersons={forecast?.eligible_persons_count ?? 0}
            />
            {weddingId && (
              <GiftPartyList
                parties={parties}
                gifts={gifts}
                weddingId={weddingId}
                avgEstimate={avgEstimate}
                isPrivate={isPrivate}
                personsPerParty={personsPerParty}
              />
            )}
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .gifts-body { padding: 18px 12px 96px !important; gap: 16px !important; }
          .gifts-body h1 { font-size: 28px !important; }
        }
      `}</style>
    </div>
  );
}
