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
  name: "budget_summary",
  title: "Riepilogo budget",
  description:
    "Restituisce il budget totale, la somma delle spese pianificate e la somma dei pagamenti registrati.",
  inputSchema: { wedding_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ wedding_id }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Non autenticato" }], isError: true };
    const sb = supabaseForUser(ctx);
    const [w, exp, pay] = await Promise.all([
      sb.from("weddings").select("total_budget, partner1_name, partner2_name, wedding_date").eq("id", wedding_id).maybeSingle(),
      sb.from("expense_items").select("id, name, amount, estimated_cost, actual_cost").eq("wedding_id", wedding_id),
      sb.from("payments").select("amount, is_paid, expense_item_id").eq("wedding_id", wedding_id),
    ]);
    if (w.error) return { content: [{ type: "text", text: w.error.message }], isError: true };
    const expenses = exp.data ?? [];
    const payments = pay.data ?? [];
    const totalExpenses = expenses.reduce(
      (s, e: any) => s + Number(e.amount ?? e.actual_cost ?? e.estimated_cost ?? 0),
      0,
    );
    const totalPaid = payments
      .filter((p: any) => p.is_paid)
      .reduce((s, p: any) => s + Number(p.amount ?? 0), 0);
    const totalPlanned = payments.reduce((s, p: any) => s + Number(p.amount ?? 0), 0);
    const summary = {
      wedding: w.data,
      total_budget: Number(w.data?.total_budget ?? 0),
      total_expenses: totalExpenses,
      total_planned_payments: totalPlanned,
      total_paid: totalPaid,
      remaining_to_pay: totalPlanned - totalPaid,
      expense_count: expenses.length,
      payment_count: payments.length,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
