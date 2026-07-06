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
  name: "list_guests",
  title: "Elenca ospiti",
  description:
    "Elenca gli ospiti di un matrimonio con nome, RSVP e nucleo. Filtra opzionalmente per stato RSVP.",
  inputSchema: {
    wedding_id: z.string().uuid().describe("ID del matrimonio"),
    rsvp_status: z
      .enum(["pending", "confirmed", "declined", "maybe"])
      .optional()
      .describe("Filtra per stato RSVP"),
    limit: z.number().int().min(1).max(500).default(200),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ wedding_id, rsvp_status, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Non autenticato" }], isError: true };
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("guests")
      .select("id, first_name, last_name, party_name, rsvp_status, is_child, is_staff, email, phone")
      .eq("wedding_id", wedding_id)
      .limit(limit);
    if (rsvp_status) q = q.eq("rsvp_status", rsvp_status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `${data?.length ?? 0} ospiti\n${JSON.stringify(data, null, 2)}` }],
      structuredContent: { guests: data ?? [] },
    };
  },
});
