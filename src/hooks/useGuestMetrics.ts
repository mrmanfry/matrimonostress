import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GuestMetrics {
  // Conteggi base
  totalInvitations: number;    // Righe DB (buste da spedire)
  totalHeadCount: number;      // Persone fisiche (coperti catering)
  
  // Breakdown Composizione
  adultsCount: number;
  childrenCount: number;
  coupleCount: number;         // Sposi (sempre 2)
  staffCount: number;          // Da vendors.staff_meals_count
  
  // Plus Ones
  plusOnesPotential: number;   // Ospiti con allow_plus_one = true
  plusOnesConfirmed: number;   // Ospiti con plus_one_name compilato
  
  // RSVP Status
  confirmedCount: number;
  pendingCount: number;
  declinedCount: number;
  
  // Conteggi per RSVP (adulti + bambini)
  confirmedHeadCount: number;
  pendingHeadCount: number;
  declinedHeadCount: number;
  
  // Dati incompleti (warning)
  unclassifiedCount: number;
  
  // Stati loading/error
  isLoading: boolean;
  error: Error | null;
  
  // Funzione per refresh manuale
  refetch: () => void;
}

export function useGuestMetrics(): GuestMetrics {
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.weddingId : null;

  // Query per ospiti
  const { 
    data: guestsData, 
    isLoading: guestsLoading, 
    error: guestsError,
    refetch: refetchGuests 
  } = useQuery({
    queryKey: ["guest-metrics", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      
      const { data, error } = await supabase
        .from("guests")
        .select("id, is_child, is_staff, is_couple_member, rsvp_status, allow_plus_one, plus_one_name, adults_count, children_count")
        .eq("wedding_id", weddingId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId,
    staleTime: 30000, // 30 secondi
  });

  // Query per staff dai vendors
  const { 
    data: vendorsData, 
    isLoading: vendorsLoading, 
    error: vendorsError,
    refetch: refetchVendors 
  } = useQuery({
    queryKey: ["vendor-staff-metrics", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      
      const { data, error } = await supabase
        .from("vendors")
        .select("id, staff_meals_count")
        .eq("wedding_id", weddingId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId,
    staleTime: 30000,
  });

  const guests = guestsData || [];
  const vendors = vendorsData || [];

  // Escludiamo i membri della coppia per i conteggi standard
  const analyzableGuests = guests.filter(g => !g.is_couple_member);
  
  // Conteggio sposi
  const coupleCount = guests.filter(g => g.is_couple_member).length || 2;

  // Conteggio staff dai vendors
  const staffFromVendors = vendors.reduce((sum, v) => sum + (v.staff_meals_count || 0), 0);
  
  // Conteggio staff legacy (dal campo is_staff nella tabella guests)
  const staffFromGuests = analyzableGuests.filter(g => g.is_staff).length;
  
  // Totale staff (vendors + eventuali legacy)
  const staffCount = staffFromVendors + staffFromGuests;

  // Ospiti "normali" (non staff, non coppia)
  const regularGuests = analyzableGuests.filter(g => !g.is_staff);

  // Conteggi adulti e bambini
  const adultsCount = regularGuests.filter(g => !g.is_child).length;
  const childrenCount = regularGuests.filter(g => g.is_child).length;

  // Plus ones
  const plusOnesPotential = regularGuests.filter(g => g.allow_plus_one).length;
  const plusOnesConfirmed = regularGuests.filter(g => g.plus_one_name && g.plus_one_name.trim() !== "").length;

  // RSVP Status conteggi per persona
  const confirmedGuests = regularGuests.filter(g => g.rsvp_status === "confirmed");
  const pendingGuests = regularGuests.filter(g => g.rsvp_status === "pending");
  const declinedGuests = regularGuests.filter(g => g.rsvp_status === "declined");

  const confirmedCount = confirmedGuests.length;
  const pendingCount = pendingGuests.length;
  const declinedCount = declinedGuests.length;

  // Conteggi HeadCount per RSVP (usando adults_count + children_count)
  const confirmedHeadCount = confirmedGuests.reduce(
    (sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0
  );
  const pendingHeadCount = pendingGuests.reduce(
    (sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0
  );
  const declinedHeadCount = declinedGuests.reduce(
    (sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0
  );

  // Ospiti non classificati (senza is_child definito o altro problema)
  const unclassifiedCount = analyzableGuests.filter(g => 
    g.is_child === null || g.rsvp_status === null
  ).length;

  // Total invitations = righe nel DB (esclusa coppia)
  const totalInvitations = analyzableGuests.length;

  // Total head count = persone fisiche per catering
  // Include: adulti + bambini + sposi + staff + plus ones confermati
  const totalHeadCount = 
    adultsCount + 
    childrenCount + 
    coupleCount + 
    staffCount + 
    plusOnesConfirmed;

  const refetch = () => {
    refetchGuests();
    refetchVendors();
  };

  return {
    totalInvitations,
    totalHeadCount,
    adultsCount,
    childrenCount,
    coupleCount,
    staffCount,
    plusOnesPotential,
    plusOnesConfirmed,
    confirmedCount,
    pendingCount,
    declinedCount,
    confirmedHeadCount,
    pendingHeadCount,
    declinedHeadCount,
    unclassifiedCount,
    isLoading: guestsLoading || vendorsLoading,
    error: (guestsError || vendorsError) as Error | null,
    refetch,
  };
}
