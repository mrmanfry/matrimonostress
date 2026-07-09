import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") ?? "https://wedsapp.it";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const formatAmount = (n: number) =>
  `€ ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = req.headers.get("X-Cron-Secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Send reminders at 7 and 3 days before due date
    const windows = [7, 3];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalSent = 0;
    let totalFound = 0;

    for (const daysUntil of windows) {
      const target = new Date(today);
      target.setDate(target.getDate() + daysUntil);
      const formattedDate = target.toISOString().split("T")[0];

      console.log(`🔍 Checking payments due on ${formattedDate} (${daysUntil}d)`);

      const { data: payments, error } = await supabase
        .from("payments")
        .select(`
          id, amount, due_date, description,
          expense_items!inner (
            description,
            wedding_id,
            vendors ( name ),
            weddings!inner (
              partner1_name, partner2_name,
              user_roles!inner (
                role,
                profiles!inner ( id, first_name )
              )
            )
          )
        `)
        .eq("status", "pending")
        .eq("due_date", formattedDate);

      if (error) throw error;
      if (!payments?.length) continue;
      totalFound += payments.length;

      for (const p of payments as any[]) {
        try {
          const ei = p.expense_items;
          const wedding = ei.weddings;
          const vendorName = ei.vendors?.name ?? ei.description ?? "Fornitore";

          // Notify all co_planners of the wedding
          const recipients = (wedding.user_roles ?? []).filter(
            (r: any) => r.role === "co_planner" && r.profiles?.id
          );

          for (const r of recipients) {
            const { data: userLookup } = await supabase.auth.admin.getUserById(r.profiles.id);
            const recipientEmail = userLookup?.user?.email;
            if (!recipientEmail) continue;

            const { error: sendErr } = await supabase.functions.invoke(
              "send-transactional-email",
              {
                body: {
                  templateName: "payment-reminder",
                  recipientEmail,
                  idempotencyKey: `payment-reminder-${p.id}-${daysUntil}d-${r.profiles.id}`,
                  templateData: {
                    vendorName,
                    amount: formatAmount(Number(p.amount) || 0),
                    dueDate: formatDate(p.due_date),
                    daysUntil,
                    treasuryUrl: `${appUrl}/app/treasury`,
                  },
                },
              }
            );

            if (sendErr) {
              console.error(`❌ send error payment ${p.id}:`, sendErr);
            } else {
              totalSent++;
            }
          }
        } catch (e) {
          console.error(`❌ Processing payment ${p.id}:`, e);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${totalSent} reminder(s)`, sent: totalSent, found: totalFound }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("💥 check-payment-reminders fatal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
