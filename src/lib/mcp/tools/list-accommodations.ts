import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_accommodations",
  title: "Elenca stanze e assegnazioni",
  description:
    "Elenca le stanze prenotate per un matrimonio (hotel/vendor, tipo, capienza, notti, prezzo) e per ciascuna gli ospiti assegnati.",
  inputSchema: {
    wedding_id: z.string().uuid().describe("ID del matrimonio"),
    vendor_id: z
      .string()
      .uuid()
      .optional()
      .describe("Filtra per hotel/fornitore specifico"),
    only_unassigned: z
      .boolean()
      .optional()
      .describe("Se true, restituisce solo le stanze senza ospiti"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ wedding_id, vendor_id, only_unassigned }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Non autenticato" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("accommodation_rooms")
      .select(
        "id, room_name, room_type, capacity, nights, price_per_night, notes, vendors(id, name), accommodation_assignments(guests(id, first_name, last_name, party_name))",
      )
      .eq("wedding_id", wedding_id)
      .order("order_index", { ascending: true });
    if (vendor_id) q = q.eq("vendor_id", vendor_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rooms = (data ?? []).map((r: any) => {
      const guests = (r.accommodation_assignments ?? []).map((a: any) => ({
        id: a.guests?.id,
        name: `${a.guests?.first_name ?? ""} ${a.guests?.last_name ?? ""}`.trim(),
        party_name: a.guests?.party_name ?? null,
      }));
      return {
        room_id: r.id,
        room_name: r.room_name,
        room_type: r.room_type,
        capacity: r.capacity,
        occupied: guests.length,
        free_beds: Math.max(0, (r.capacity ?? 0) - guests.length),
        nights: r.nights,
        price_per_night: r.price_per_night,
        total_price: Number(r.price_per_night ?? 0) * Number(r.nights ?? 0),
        hotel: r.vendors?.name ?? null,
        vendor_id: r.vendors?.id ?? null,
        notes: r.notes,
        guests,
      };
    });

    const filtered = only_unassigned ? rooms.filter((r) => r.occupied === 0) : rooms;

    const summary = `${filtered.length} stanze — ${filtered.reduce(
      (s, r) => s + r.occupied,
      0,
    )} ospiti assegnati, ${filtered.reduce((s, r) => s + r.free_beds, 0)} posti liberi`;

    return {
      content: [
        { type: "text", text: `${summary}\n${JSON.stringify(filtered, null, 2)}` },
      ],
      structuredContent: { rooms: filtered },
    };
  },
});
