import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payment {
  id: string;
  amount: number;
  due_date: string;
  description: string;
  expense_id: string;
  expenses: {
    description: string;
    wedding_id: string;
    weddings: {
      partner1_name: string;
      partner2_name: string;
      user_roles: Array<{
        profiles: {
          id: string;
          first_name: string;
          last_name: string;
        }
      }>;
    };
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate cron secret for scheduled invocations
  const cronSecret = req.headers.get("X-Cron-Secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  
  if (!expectedSecret || cronSecret !== expectedSecret) {
    console.error("Unauthorized cron request - invalid or missing secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    console.log("🔍 Starting payment reminders check...");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const formattedDate = targetDate.toISOString().split('T')[0];

    console.log(`📅 Checking for payments due on: ${formattedDate}`);

    const { data: payments, error } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        due_date,
        description,
        expense_id,
        expenses!inner (
          description,
          wedding_id,
          weddings!inner (
            partner1_name,
            partner2_name,
            user_roles!inner (
              profiles!inner (
                id,
                first_name,
                last_name
              )
            )
          )
        )
      `)
      .eq("status", "pending")
      .eq("due_date", formattedDate);

    if (error) {
      console.error("❌ Database error:", error);
      throw error;
    }

    if (!payments || payments.length === 0) {
      console.log("✅ No payments due in 7 days");
      return new Response(
        JSON.stringify({ message: "No reminders to send", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 Found ${payments.length} payment(s) requiring reminders`);

    let sentCount = 0;

    for (const payment of payments as unknown as Payment[]) {
      try {
        const wedding = payment.expenses.weddings;
        const coPlanner = wedding.user_roles[0]?.profiles;

        if (!coPlanner) {
          console.warn(`⚠️ No co-planner found for payment ${payment.id}`);
          continue;
        }

        const recipientEmail = "onboarding@resend.dev";

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">💍 Promemoria Pagamento - WedsApp</h2>
            <p>Ciao <strong>${coPlanner.first_name}</strong>,</p>
            <p>Ti ricordiamo che tra <strong>7 giorni</strong> scadrà il seguente pagamento:</p>
            
            <div style="background: #F3F4F6; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1F2937;">📋 ${payment.expenses.description}</h3>
              <p style="margin: 5px 0;"><strong>Descrizione:</strong> ${payment.description}</p>
              <p style="margin: 5px 0;"><strong>Importo:</strong> €${payment.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              <p style="margin: 5px 0;"><strong>Scadenza:</strong> ${new Date(payment.due_date).toLocaleDateString('it-IT')}</p>
            </div>

            <p>Accedi alla piattaforma per gestire i tuoi pagamenti:</p>
            <a href="https://stenders.cloud/app/budget" 
               style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0;">
              Vai al Budget
            </a>

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
            <p style="color: #6B7280; font-size: 14px;">
              Matrimonio: <strong>${wedding.partner1_name} & ${wedding.partner2_name}</strong><br>
              Questo è un messaggio automatico da WedsApp
            </p>
          </div>
        `;

        const { error: emailError } = await resend.emails.send({
          from: "WedsApp <onboarding@resend.dev>",
          to: [recipientEmail],
          subject: `💰 Promemoria: Pagamento in scadenza tra 7 giorni`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`❌ Email send error for payment ${payment.id}:`, emailError);
        } else {
          console.log(`✅ Reminder sent for payment ${payment.id} to ${recipientEmail}`);
          sentCount++;
        }
      } catch (emailError) {
        console.error(`❌ Error processing payment ${payment.id}:`, emailError);
      }
    }

    console.log(`🎉 Reminders process completed. Sent: ${sentCount}/${payments.length}`);

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} reminder(s)`,
        count: sentCount,
        total: payments.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("💥 Fatal error in check-payment-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
