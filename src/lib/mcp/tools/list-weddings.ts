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
  name: "list_weddings",
  title: "Elenca matrimoni",
  description:
    "Elenca i matrimoni a cui l'utente autenticato ha accesso (via user_roles), con data e sposi.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Non autenticato" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data: roles, error: rolesError } = await sb
      .from("user_roles")
      .select("wedding_id, role")
      .eq("user_id", ctx.getUserId());
    if (rolesError)
      return { content: [{ type: "text", text: rolesError.message }], isError: true };
    const ids = Array.from(new Set((roles ?? []).map((r) => r.wedding_id).filter(Boolean)));
    if (ids.length === 0)
      return {
        content: [{ type: "text", text: "Nessun matrimonio trovato." }],
        structuredContent: { weddings: [] },
      };
    const { data: weddings, error } = await sb
      .from("weddings")
      .select("id, partner1_name, partner2_name, wedding_date, reception_venue_name, ceremony_venue_name, location")
      .in("id", ids);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (weddings ?? []).map((w) => ({
      ...w,
      role: roles?.find((r) => r.wedding_id === w.id)?.role,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { weddings: rows },
    };
  },
});
