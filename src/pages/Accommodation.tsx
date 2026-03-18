import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AccommodationKPIs } from "@/components/accommodation/AccommodationKPIs";
import { HotelCard } from "@/components/accommodation/HotelCard";
import { Hotel } from "lucide-react";

const Accommodation = () => {
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.activeWeddingId : null;

  // Fetch vendors marked as accommodation OR that have rooms in the DB
  const { data: hotels = [] } = useQuery({
    queryKey: ["accommodation-vendors", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      // Get vendors flagged as accommodation
      const { data: flagged, error: e1 } = await supabase
        .from("vendors")
        .select("id, name, contact_name")
        .eq("wedding_id", weddingId)
        .eq("is_accommodation", true)
        .order("name");
      if (e1) throw e1;

      // Also get vendor IDs that have rooms (safety net)
      const { data: roomVendors } = await supabase
        .from("accommodation_rooms")
        .select("vendor_id")
        .eq("wedding_id", weddingId);
      const roomVendorIds = new Set((roomVendors || []).map((r: any) => r.vendor_id));

      // Find vendor IDs with rooms but not flagged
      const flaggedIds = new Set((flagged || []).map(v => v.id));
      const missingIds = Array.from(roomVendorIds).filter(id => !flaggedIds.has(id));

      let extra: typeof flagged = [];
      if (missingIds.length > 0) {
        const { data: extraData } = await supabase
          .from("vendors")
          .select("id, name, contact_name")
          .in("id", missingIds);
        extra = extraData || [];
      }

      return [...(flagged || []), ...extra];
    },
    enabled: !!weddingId,
  });

  // Fetch all rooms with assignments
  const { data: roomsRaw = [] } = useQuery({
    queryKey: ["accommodation-rooms", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      const { data, error } = await supabase
        .from("accommodation_rooms")
        .select("*, accommodation_assignments(guest_id)")
        .eq("wedding_id", weddingId)
        .order("order_index");
      if (error) throw error;
      return data || [];
    },
    enabled: !!weddingId,
  });

  // Fetch guest names for assigned guests
  const allAssignedIds = useMemo(() => {
    const ids = new Set<string>();
    roomsRaw.forEach((r: any) => {
      r.accommodation_assignments?.forEach((a: any) => ids.add(a.guest_id));
    });
    return ids;
  }, [roomsRaw]);

  const { data: assignedGuestNames = {} } = useQuery({
    queryKey: ["accommodation-guest-names", Array.from(allAssignedIds)],
    queryFn: async () => {
      if (allAssignedIds.size === 0) return {};
      const { data } = await supabase
        .from("guests")
        .select("id, first_name, last_name")
        .in("id", Array.from(allAssignedIds));
      const map: Record<string, { first_name: string; last_name: string }> = {};
      data?.forEach(g => { map[g.id] = { first_name: g.first_name, last_name: g.last_name }; });
      return map;
    },
    enabled: allAssignedIds.size > 0,
  });

  // Fetch all guests for assignment dialog
  const { data: allGuests = [] } = useQuery({
    queryKey: ["accommodation-all-guests", weddingId],
    queryFn: async () => {
      if (!weddingId) return [];
      const { data } = await supabase
        .from("guests")
        .select("id, first_name, last_name, rsvp_status")
        .eq("wedding_id", weddingId)
        .eq("is_child", false)
        .eq("is_staff", false)
        .order("last_name");
      return data || [];
    },
    enabled: !!weddingId,
  });

  // Build rooms grouped by vendor
  const roomsByVendor = useMemo(() => {
    const map: Record<string, any[]> = {};
    roomsRaw.forEach((r: any) => {
      if (!map[r.vendor_id]) map[r.vendor_id] = [];
      map[r.vendor_id].push({
        ...r,
        assignments: (r.accommodation_assignments || []).map((a: any) => ({
          guest_id: a.guest_id,
          guest_first_name: (assignedGuestNames as any)[a.guest_id]?.first_name || "?",
          guest_last_name: (assignedGuestNames as any)[a.guest_id]?.last_name || "",
        })),
      });
    });
    return map;
  }, [roomsRaw, assignedGuestNames]);

  // KPI calculations
  const totalRooms = roomsRaw.length;
  const assignedGuests = allAssignedIds.size;
  const totalGuests = allGuests.length;
  const totalCost = roomsRaw.reduce((sum: number, r: any) => sum + (r.price_per_night || 0) * (r.nights || 1), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Hotel className="w-6 h-6 text-primary" />
          Pernotto
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestisci alloggi e assegnazione ospiti alle camere
        </p>
      </div>

      <AccommodationKPIs
        totalRooms={totalRooms}
        assignedGuests={assignedGuests}
        totalGuests={totalGuests}
        totalCost={totalCost}
      />

      {hotels.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Hotel className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-semibold text-lg">Nessuna struttura configurata</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Per iniziare, vai nella sezione <strong>Fornitori</strong>, crea un fornitore e attiva il flag
            "Struttura ricettiva" nella scheda del fornitore. Apparirà automaticamente qui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {hotels.map(hotel => (
            <HotelCard
              key={hotel.id}
              vendor={hotel}
              rooms={roomsByVendor[hotel.id] || []}
              guests={allGuests}
              allAssignedGuestIds={allAssignedIds}
              weddingId={weddingId!}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Accommodation;
