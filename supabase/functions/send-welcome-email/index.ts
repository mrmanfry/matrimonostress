import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") || "https://matrimonostress.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find weddings where welcome_email_sent = false and created recently (last 24h)
    const { data: weddings, error: weddingsError } = await supabase
      .from("weddings")
      .select("id, partner1_name, partner2_name, wedding_date, trial_ends_at, created_by, welcome_email_sent")
      .eq("welcome_email_sent", false)
      .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    if (weddingsError) throw weddingsError;
    if (!weddings || weddings.length === 0) {
      return new Response(JSON.stringify({ message: "No welcome emails to send" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const wedding of weddings) {
      try {
        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(wedding.created_by);
        if (!userData?.user?.email) continue;

        const userEmail = userData.user.email;
        const firstName = userData.user.user_metadata?.first_name || wedding.partner1_name;
        const trialEndDate = wedding.trial_ends_at 
          ? new Date(wedding.trial_ends_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })
          : "30 giorni da oggi";

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:24px;margin-bottom:24px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:40px 32px;text-align:center;">
      <h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;">💍 Benvenuti su WedsApp!</h1>
      <p style="color:#e0e7ff;font-size:16px;margin:0;">${wedding.partner1_name} & ${wedding.partner2_name}</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="font-size:16px;color:#333;line-height:1.6;margin-top:0;">
        Ciao <strong>${firstName}</strong>,
      </p>
      <p style="font-size:16px;color:#333;line-height:1.6;">
        Il vostro account <strong>Premium gratuito</strong> è attivo! Avete 30 giorni per esplorare tutte le funzionalità senza limiti.
      </p>

      <div style="background:#f0f4ff;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid #6366f1;">
        <p style="font-size:14px;color:#4338ca;margin:0;font-weight:600;">
          ⏰ La vostra prova gratuita scade il ${trialEndDate}
        </p>
      </div>

      <h2 style="font-size:20px;color:#333;margin:32px 0 16px;">🚀 I vostri primi 3 passi</h2>
      
      <div style="margin-bottom:16px;">
        <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
          <span style="background:#6366f1;color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;margin-right:12px;flex-shrink:0;">1</span>
          <div>
            <strong style="color:#333;">Aggiungi i tuoi invitati</strong>
            <p style="color:#666;font-size:14px;margin:4px 0 0;">Importa da Excel, testo libero o aggiungi uno per uno.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
          <span style="background:#6366f1;color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;margin-right:12px;flex-shrink:0;">2</span>
          <div>
            <strong style="color:#333;">Imposta il budget</strong>
            <p style="color:#666;font-size:14px;margin:4px 0 0;">Definisci il budget totale e inizia a monitorare le spese.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;margin-bottom:12px;">
          <span style="background:#6366f1;color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;margin-right:12px;flex-shrink:0;">3</span>
          <div>
            <strong style="color:#333;">Invita il/la partner</strong>
            <p style="color:#666;font-size:14px;margin:4px 0 0;">Vai nelle Impostazioni → Team e invia un invito.</p>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <a href="${appUrl}/app/dashboard" style="background:#6366f1;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
          Vai alla Dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        WedsApp — Il tuo Project Manager per il matrimonio
      </p>
    </div>
  </div>
</body>
</html>`;

        const { error: sendError } = await resend.emails.send({
          from: "WedsApp <noreply@resend.dev>",
          to: [userEmail],
          subject: `💍 Benvenuti ${wedding.partner1_name} & ${wedding.partner2_name}! Il vostro matrimonio vi aspetta`,
          html: emailHtml,
        });

        if (sendError) {
          console.error(`Error sending welcome email to ${userEmail}:`, sendError);
          continue;
        }

        // Mark as sent
        await supabase
          .from("weddings")
          .update({ welcome_email_sent: true })
          .eq("id", wedding.id);

        sent++;
        console.log(`Welcome email sent to ${userEmail} for wedding ${wedding.id}`);
      } catch (innerError) {
        console.error(`Error processing wedding ${wedding.id}:`, innerError);
      }
    }

    return new Response(JSON.stringify({ message: `Sent ${sent} welcome emails` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Welcome email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});