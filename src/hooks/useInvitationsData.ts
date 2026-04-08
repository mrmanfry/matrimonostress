import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getEffectiveStatus } from "@/lib/nucleusStatusHelper";

export interface InvitationGuest {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  party_id: string | null;
  unique_rsvp_token: string | null;
  rsvp_status: string | null;
  rsvp_send_status: string;
  is_couple_member: boolean;
  save_the_date_sent_at: string | null;
  formal_invite_sent_at: string | null;
  last_reminder_sent_at: string | null;
  std_response: string | null;
  std_responded_at: string | null;
}

export interface InvitationParty {
  id: string;
  party_name: string;
  wedding_id: string;
  rsvp_status: string;
  guests: InvitationGuest[];
}

export interface FunnelStats {
  draft: number;
  std_sent: number;
  std_likely_yes: number;
  std_likely_no: number;
  std_unsure: number;
  std_no_response: number;
  invited: number;
  confirmed: number;
  declined: number;
  totalRegular: number;
}

export function useInvitationsData() {
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.activeWeddingId : null;

  const { data: guestsData, isLoading: guestsLoading, refetch: refetchGuests } = useQuery({
    queryKey: ["invitations-guests", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      const { data, error } = await supabase
        .from("guests")
        .select("id, first_name, last_name, phone, party_id, unique_rsvp_token, rsvp_status, rsvp_send_status, is_couple_member, save_the_date_sent_at, formal_invite_sent_at, last_reminder_sent_at, std_response, std_responded_at")
        .eq("wedding_id", weddingId);
      if (error) throw error;
      return (data || []) as InvitationGuest[];
    },
    enabled: !!weddingId,
    staleTime: 30000,
  });

  const { data: partiesData, isLoading: partiesLoading, refetch: refetchParties } = useQuery({
    queryKey: ["invitations-parties", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      const { data, error } = await supabase
        .from("invite_parties")
        .select("id, party_name, wedding_id, rsvp_status")
        .eq("wedding_id", weddingId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId,
    staleTime: 30000,
  });

  const { data: weddingData, refetch: refetchWedding } = useQuery({
    queryKey: ["invitations-wedding", weddingId],
    queryFn: async () => {
      if (!weddingId) return null;
      const { data, error } = await supabase
        .from("weddings")
        .select("id, partner1_name, partner2_name, wedding_date, campaigns_config, rsvp_config")
        .eq("id", weddingId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!weddingId,
    staleTime: 60000,
  });

  const guests = (guestsData || []) as InvitationGuest[];
  const rawParties = partiesData || [];

  // Build parties with their guests
  const parties: InvitationParty[] = rawParties.map(p => ({
    ...p,
    rsvp_status: p.rsvp_status as string,
    guests: guests.filter(g => g.party_id === p.id),
  }));

  // Funnel stats
  const regularGuests = guests.filter(g => !g.is_couple_member);
  const coupleMembers = guests.filter(g => g.is_couple_member);

  const funnelStats: FunnelStats = {
    draft: regularGuests.filter(g => {
      const s = getEffectiveStatus(g, guests);
      return !s.hasStdSent && !s.hasFormalInvite;
    }).length,
    std_sent: regularGuests.filter(g => {
      const s = getEffectiveStatus(g, guests);
      return s.hasStdSent && !s.hasFormalInvite;
    }).length,
    std_likely_yes: regularGuests.filter(g => {
      const s = getEffectiveStatus(g, guests);
      return s.hasStdSent && !s.hasFormalInvite && g.std_response === 'likely_yes';
    }).length,
    std_likely_no: regularGuests.filter(g => {
      const s = getEffectiveStatus(g, guests);
      return s.hasStdSent && !s.hasFormalInvite && g.std_response === 'likely_no';
    }).length,
    std_unsure: regularGuests.filter(g => {
      const s = getEffectiveStatus(g, guests);
      return s.hasStdSent && !s.hasFormalInvite && g.std_response === 'unsure';
    }).length,
    std_no_response: regularGuests.filter(g => {
      const s = getEffectiveStatus(g, guests);
      return s.hasStdSent && !s.hasFormalInvite && !g.std_response;
    }).length,
    invited: regularGuests.filter(g => {
      const s = getEffectiveStatus(g, guests);
      return s.hasFormalInvite && (!g.rsvp_status || g.rsvp_status === 'pending');
    }).length,
    confirmed: coupleMembers.length + regularGuests.filter(g => g.rsvp_status === 'confirmed').length,
    declined: regularGuests.filter(g => g.rsvp_status === 'declined').length,
    totalRegular: regularGuests.length,
  };

  // Count parties with at least one guest with phone
  const partiesReadyToSend = parties.filter(p => 
    p.guests.length > 0 && p.guests.some(g => g.phone && !g.is_couple_member)
  ).length;

  // Campaign stats from guest data
  const campaignStats = {
    save_the_date: {
      sent: regularGuests.filter(g => g.save_the_date_sent_at).length,
      responded: regularGuests.filter(g => g.std_response).length,
    },
    rsvp: {
      sent: regularGuests.filter(g => g.formal_invite_sent_at).length,
      responded: regularGuests.filter(g => g.rsvp_status === 'confirmed' || g.rsvp_status === 'declined').length,
    },
  };

  // Campaigns config with defaults
  const campaignsConfig = (weddingData?.campaigns_config as any) || null;

  const refetch = () => {
    refetchGuests();
    refetchParties();
    refetchWedding();
  };

  return {
    guests,
    parties,
    wedding: weddingData,
    funnelStats,
    partiesReadyToSend,
    campaignStats,
    campaignsConfig,
    isLoading: guestsLoading || partiesLoading,
    refetch,
    weddingId,
  };
}
