import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// ---- Minimal inlined scenario logic (mirrors src/lib/guestScenarios.ts) ----
type Guest = {
  id: string;
  rsvp_status: string | null;
  is_child: boolean | null;
  is_staff: boolean | null;
  is_couple_member: boolean | null;
  allow_plus_one: boolean | null;
  plus_one_name: string | null;
  plus_one_of_guest_id: string | null;
  dietary_restrictions?: string | null;
};

const isConfirmed = (s: string | null | undefined) =>
  s === "Confermato" || s === "confirmed";
const isDeclined = (s: string | null | undefined) =>
  s === "Rifiutato" || s === "declined";

function tallyConfirmed(guests: Guest[]) {
  const promoted = new Set(
    guests.filter((g) => g.plus_one_of_guest_id).map((g) => g.plus_one_of_guest_id as string),
  );
  let adults = 0, children = 0;
  for (const g of guests) {
    if (g.is_staff) continue;
    const confirmed = g.is_couple_member === true || isConfirmed(g.rsvp_status);
    if (!confirmed) continue;
    if (g.is_child) children += 1;
    else adults += 1;
    if (g.allow_plus_one && g.plus_one_name && !promoted.has(g.id)) adults += 1;
  }
  return { adults, children };
}
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tok, error: tokErr } = await supabase
      .from("progress_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (tokErr || !tok || !tok.is_active || new Date(tok.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "invalid_or_expired" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weddingId = tok.wedding_id as string;

    const { data: w } = await supabase
      .from("weddings")
      .select(
        "partner1_name, partner2_name, wedding_date, ceremony_start_time, ceremony_venue_name, ceremony_venue_address, reception_venue_name, reception_venue_address, reception_start_time, location, logistical_notes, dress_code, target_adults, target_children, target_staff",
      )
      .eq("id", weddingId)
      .maybeSingle();

    const wedding = w
      ? {
          partner1: w.partner1_name,
          partner2: w.partner2_name,
          date: w.wedding_date,
          ceremony_start_time: w.ceremony_start_time,
          ceremony_venue_name: w.ceremony_venue_name,
          ceremony_venue_address: w.ceremony_venue_address,
          reception_venue_name: w.reception_venue_name,
          reception_venue_address: w.reception_venue_address,
          reception_start_time: w.reception_start_time,
          location: w.location,
          logistical_notes: (w as any).logistical_notes ?? null,
          dress_code: (w as any).dress_code ?? null,
        }
      : null;

    const payload: Record<string, unknown> = {
      audience: tok.audience,
      label: tok.label,
      flags: {
        show_countdown: tok.show_countdown,
        show_timeline: tok.show_timeline,
        show_location: tok.show_location,
        show_dress_code: tok.show_dress_code,
        show_memories_qr: tok.show_memories_qr,
        show_addresses: tok.show_addresses,
        show_vendor_contacts: tok.show_vendor_contacts,
        show_operational_numbers: tok.show_operational_numbers,
      },
      wedding,
    };

    if (tok.show_timeline) {
      const { data: ev } = await supabase
        .from("timeline_events")
        .select("id, time, title, description, location")
        .eq("wedding_id", weddingId)
        .order("time", { ascending: true });
      payload.events = ev || [];
    }

    if (tok.show_memories_qr) {
      const { data: cam } = await supabase
        .from("disposable_cameras")
        .select("token")
        .eq("wedding_id", weddingId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      payload.cameraToken = cam?.token ?? null;
    }

    if (tok.show_vendor_contacts && wedding) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("wedding_id", weddingId)
        .in("role", ["co_planner", "planner"]);
      const ids = (roles || []).map((r: any) => r.user_id);
      let profiles: any[] = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", ids);
        profiles = p || [];
      }
      const contacts: { name: string; role: string }[] = [
        { name: `${wedding.partner1} & ${wedding.partner2}`, role: "Coppia" },
      ];
      (roles || []).forEach((r: any) => {
        const p = profiles.find((x) => x.id === r.user_id);
        if (!p) return;
        const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim();
        if (!fullName) return;
        contacts.push({
          name: fullName,
          role: r.role === "co_planner" ? "Co-planner" : "Wedding planner",
        });
      });
      payload.contacts = contacts;

      // Rubrica fornitori (solo confermati). Nessun dato finanziario.
      const { data: vs } = await supabase
        .from("vendors")
        .select("name, contact_name, email, phone, status, category:expense_categories(name)")
        .eq("wedding_id", weddingId)
        .eq("status", "confirmed");
      payload.vendorContacts = (vs || []).map((v: any) => ({
        category: v.category?.name ?? null,
        name: v.name || v.contact_name || "Fornitore",
        phone: v.phone ?? null,
        email: v.email ?? null,
      }));
    }

    if (tok.show_operational_numbers) {
      const [guestsRes, vendorsRes, tablesRes] = await Promise.all([
        supabase
          .from("guests")
          .select(
            "id, rsvp_status, is_child, is_staff, is_couple_member, allow_plus_one, plus_one_name, plus_one_of_guest_id, dietary_restrictions",
          )
          .eq("wedding_id", weddingId),
        supabase.from("vendors").select("staff_meals_count").eq("wedding_id", weddingId),
        supabase
          .from("tables")
          .select("id", { count: "exact", head: true })
          .eq("wedding_id", weddingId),
      ]);
      const guests = ((guestsRes.data || []) as Guest[]);
      const vendors = (vendorsRes.data || []) as { staff_meals_count: number | null }[];
      const staff = vendors.reduce((s, v) => s + Number(v?.staff_meals_count || 0), 0);
      const heads = tallyConfirmed(guests);
      const dietary_count = guests.filter(
        (g) => !g.is_staff && (g.dietary_restrictions || "").toString().trim().length > 0,
      ).length;
      payload.ops = {
        adults: heads.adults,
        children: heads.children,
        staff,
        total: heads.adults + heads.children + staff,
        dietary_count,
        tables: tablesRes.count || 0,
      };
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("progress-public-data error", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
