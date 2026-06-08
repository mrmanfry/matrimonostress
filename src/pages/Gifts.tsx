// src/pages/Gifts.tsx — RESTYLED to WedsApp "paper" design system
// Drop-in replacement. Same data hooks & components; only layout/typography aligned.
import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useGifts, useGiftForecast } from '@/hooks/useGifts';
import { GiftCoverageWidget } from '@/components/gifts/GiftCoverageWidget';
import { GiftSimulatorSlider } from '@/components/gifts/GiftSimulatorSlider';
import { GiftPartyList, type PartyRow } from '@/components/gifts/GiftPartyList';

const PRIVACY_KEY = 'gifts_privacy_enabled';
const ESTIMATE_KEY = 'gifts_avg_estimate';

export default function Gifts() {
  const { authState } = useAuth();
  const weddingId = authState.status === 'authenticated' ? authState.activeWeddingId : null;

  const [parties, setParties] = useState<PartyRow[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(true);

  const [isPrivate, setIsPrivate] = useState(() => {
    try { return localStorage.getItem(PRIVACY_KEY) === 'true'; } catch { return false; }
  });
  const [avgEstimate, setAvgEstimate] = useState(() => {
    try { return Number(localStorage.getItem(ESTIMATE_KEY) ?? '200'); } catch { return 200; }
  });

  const { data: gifts = [], isLoading: giftsLoading } = useGifts(weddingId);
  const { data: forecast, isLoading: forecastLoading } = useGiftForecast(weddingId, avgEstimate);

  useEffect(() => {
    if (!weddingId) return;
    setPartiesLoading(true);
    supabase
      .from('invite_parties')
      .select('id, party_name, rsvp_status')
      .eq('wedding_id', weddingId)
      .order('party_name')
      .then(({ data, error }) => {
        if (!error && data) setParties(data as PartyRow[]);
        setPartiesLoading(false);
      });
  }, [weddingId]);

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
    total_cash_received: 0, total_expenses: 0, eligible_parties_count: 0,
    total_forecast: 0, projected_liquidity: 0, net_budget_coverage: 0,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--paper-bg))' }}>
      <div
        className="gifts-body"
        style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px', display: 'grid', gap: 20 }}
      >
        {/* Header — same language as BudgetHero (eyebrow + Fraunces title) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--paper-ink-3))', marginBottom: 8 }}>
              Regali · Ludovica & Filippo
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
            />
            {weddingId && (
              <GiftPartyList
                parties={parties}
                gifts={gifts}
                weddingId={weddingId}
                avgEstimate={avgEstimate}
                isPrivate={isPrivate}
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
