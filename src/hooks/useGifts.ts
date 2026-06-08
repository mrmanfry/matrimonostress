import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Gift = Database['public']['Tables']['gifts']['Row'];
export type GiftInsert = Database['public']['Tables']['gifts']['Insert'];
export type GiftCategory = Database['public']['Enums']['gift_category_enum'];
export type ThankYouStatus = Database['public']['Enums']['thank_you_status_enum'];

export interface GiftForecast {
  total_cash_received: number;
  total_expenses: number;
  eligible_parties_count: number;
  total_forecast: number;
  projected_liquidity: number;
  net_budget_coverage: number;
}

export function useGifts(weddingId: string | null) {
  return useQuery({
    queryKey: ['gifts', weddingId],
    enabled: !!weddingId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .eq('wedding_id', weddingId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Gift[];
    },
  });
}

export function useGiftForecast(weddingId: string | null, avgEstimate: number) {
  return useQuery({
    queryKey: ['gift_forecast', weddingId, avgEstimate],
    enabled: !!weddingId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_gift_forecast', {
        p_wedding_id: weddingId!,
        p_avg_estimate: avgEstimate,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total_cash_received: Number(row?.total_cash_received ?? 0),
        total_expenses: Number(row?.total_expenses ?? 0),
        eligible_parties_count: Number(row?.eligible_parties_count ?? 0),
        total_forecast: Number(row?.total_forecast ?? 0),
        projected_liquidity: Number(row?.projected_liquidity ?? 0),
        net_budget_coverage: Number(row?.net_budget_coverage ?? 0),
      } as GiftForecast;
    },
  });
}

export function useAddGift(weddingId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (gift: Omit<GiftInsert, 'wedding_id'>) => {
      const { data, error } = await supabase
        .from('gifts')
        .insert({ ...gift, wedding_id: weddingId! })
        .select()
        .single();
      if (error) throw error;
      return data as Gift;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gifts', weddingId] });
      qc.invalidateQueries({ queryKey: ['gift_forecast', weddingId] });
    },
  });
}

export function useDeleteGift(weddingId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (giftId: string) => {
      const { error } = await supabase.from('gifts').delete().eq('id', giftId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gifts', weddingId] });
      qc.invalidateQueries({ queryKey: ['gift_forecast', weddingId] });
    },
  });
}

export function useUpdateGiftThankYou(weddingId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ giftId, status }: { giftId: string; status: ThankYouStatus }) => {
      const { error } = await supabase
        .from('gifts')
        .update({ thank_you_status: status })
        .eq('id', giftId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gifts', weddingId] });
    },
  });
}
