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
  name: "list_vendors",
  title: "Elenca fornitori",
  description: "Elenca i fornitori di un matrimonio con nome, categoria e stato.",
  inputSchema: {
    wedding_id: z.string().uuid().describe("ID del matrimonio"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ wedding_id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Non autenticato" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("vendors")
      .select("id, name, status, email, phone, expense_categories(name)")
      .eq("wedding_id", wedding_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        { type: "text", text: `${data?.length ?? 0} fornitori\n${JSON.stringify(data, null, 2)}` },
      ],
      structuredContent: { vendors: data ?? [] },
    };
  },
});
