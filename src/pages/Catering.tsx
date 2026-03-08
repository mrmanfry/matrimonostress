import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isConfirmed, isDeclined } from "@/lib/rsvpHelpers";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CateringKPIs } from "@/components/catering/CateringKPIs";
import { CateringGuestTable, type CateringGuestRow } from "@/components/catering/CateringGuestTable";
import { CateringByTable } from "@/components/catering/CateringByTable";
import { CateringDietarySettings, type CateringConfig } from "@/components/catering/CateringDietarySettings";
import { CateringExportMenu } from "@/components/catering/CateringExportMenu";
import { Loader2, ChefHat } from "lucide-react";

const DEFAULT_CONFIG: CateringConfig = {
  dietary_options: [
    { id: "vegetariano", label: "Vegetariano", enabled: true, is_custom: false },
    { id: "vegano", label: "Vegano", enabled: true, is_custom: false },
    { id: "celiaco", label: "Celiaco / Senza Glutine", enabled: true, is_custom: false },
  ],
  show_allergy_field: true,
  show_dietary_notes: true,
};

const Catering = () => {
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.activeWeddingId : null;

  const [guests, setGuests] = useState<CateringGuestRow[]>([]);
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [cateringConfig, setCateringConfig] = useState<CateringConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weddingId) return;
    const load = async () => {
      setLoading(true);

      // Fetch wedding config
      const { data: wedding } = await supabase
        .from("weddings")
        .select("catering_config")
        .eq("id", weddingId)
        .single();
      if (wedding?.catering_config) {
        setCateringConfig(wedding.catering_config as unknown as CateringConfig);
      }

      // Fetch guests (excluding couple members and staff)
      const { data: guestsData } = await supabase
        .from("guests")
        .select("id, first_name, last_name, menu_choice, dietary_restrictions, is_child, rsvp_status, notes, party_id")
        .eq("wedding_id", weddingId)
        .eq("is_couple_member", false)
        .eq("is_staff", false);

      // Fetch table assignments
      const { data: assignments } = await supabase
        .from("table_assignments")
        .select("guest_id, table_id");

      // Fetch tables
      const { data: tables } = await supabase
        .from("tables")
        .select("id, name")
        .eq("wedding_id", weddingId);

      // Fetch parties for nucleus names + rsvp_status
      const { data: parties } = await supabase
        .from("invite_parties")
        .select("id, party_name, rsvp_status")
        .eq("wedding_id", weddingId);

      const tableMap = new Map((tables || []).map(t => [t.id, t.name]));
      const assignMap = new Map((assignments || []).map(a => [a.guest_id, a.table_id]));
      const partyMap = new Map((parties || []).map(p => [p.id, p.party_name]));

      const enriched: CateringGuestRow[] = (guestsData || []).map(g => ({
        id: g.id,
        first_name: g.first_name,
        last_name: g.last_name,
        menu_choice: g.menu_choice,
        dietary_restrictions: g.dietary_restrictions,
        is_child: g.is_child,
        rsvp_status: g.rsvp_status,
        notes: g.notes,
        table_name: assignMap.has(g.id) ? (tableMap.get(assignMap.get(g.id)!) || null) : null,
        party_name: g.party_id ? (partyMap.get(g.party_id) || null) : null,
      }));

      setGuests(enriched);
      setTableNames(Array.from(new Set((tables || []).map(t => t.name))).sort());
      setLoading(false);
    };
    load();
  }, [weddingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="w-6 h-6" /> Catering
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestisci preferenze alimentari e report per il catering
          </p>
        </div>
        <CateringExportMenu guests={guests} />
      </div>

      <Tabs defaultValue="riepilogo" className="space-y-4">
        <TabsList>
          <TabsTrigger value="riepilogo">Riepilogo</TabsTrigger>
          <TabsTrigger value="dettaglio">Dettaglio Ospiti</TabsTrigger>
          <TabsTrigger value="tavoli">Per Tavolo</TabsTrigger>
          <TabsTrigger value="impostazioni">Impostazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="riepilogo" className="space-y-6">
          <CateringKPIs guests={guests} />
          {/* Distribution chart placeholder - can add recharts pie later */}
        </TabsContent>

        <TabsContent value="dettaglio">
          <CateringGuestTable guests={guests} tables={tableNames} />
        </TabsContent>

        <TabsContent value="tavoli">
          <CateringByTable guests={guests} />
        </TabsContent>

        <TabsContent value="impostazioni">
          {weddingId && (
            <CateringDietarySettings
              weddingId={weddingId}
              config={cateringConfig}
              onConfigChange={setCateringConfig}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Catering;
