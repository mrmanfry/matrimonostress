import { useEffect, useState, useMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Load parties
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
    total_cash_received: 0,
    total_expenses: 0,
    eligible_parties_count: 0,
    total_forecast: 0,
    projected_liquidity: 0,
    net_budget_coverage: 0,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regali & Net Budget</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Traccia i regali ricevuti e simula la copertura del budget
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePrivacy}
          title={isPrivate ? 'Mostra valori' : 'Nascondi valori'}
        >
          {isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <GiftCoverageWidget
            forecast={forecast ?? defaultForecast}
            isPrivate={isPrivate}
          />

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
  );
}
