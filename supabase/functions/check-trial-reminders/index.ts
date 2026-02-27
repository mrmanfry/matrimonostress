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
    const now = new Date();

    // Find weddings in trial that are about to expire
    const { data: weddings, error: weddingsError } = await supabase
      .from("weddings")
      .select("id, partner1_name, partner2_name, trial_ends_at, created_by, trial_reminder_5d_sent, trial_reminder_2d_sent, subscription_status")
      .eq("subscription_status", "trialing")
      .not("trial_ends_at", "is", null);

    if (weddingsError) throw weddingsError;
    if (!weddings || weddings.length === 0) {
      return new Response(JSON.stringify({ message: "No trial reminders to send" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent5d = 0;
    let sent2d = 0;

    for (const wedding of weddings) {
      try {
        const trialEnd = new Date(wedding.trial_ends_at);
        const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Determine which reminder to send
        let reminderType: "5d" | "2d" | null = null;
        if (daysLeft <= 5 && daysLeft > 2 && !wedding.trial_reminder_5d_sent) {
          reminderType = "5d";
        } else if (daysLeft <= 2 && daysLeft > 0 && !wedding.trial_reminder_2d_sent) {
          reminderType = "2d";
        }

        if (!reminderType) continue;

        // Get user email
        const { data: userData } = await supabase.auth.admin.getUserById(wedding.created_by);
        if (!userData?.user?.email) continue;

        const userEmail = userData.user.email;
        const firstName = userData.user.user_metadata?.first_name || wedding.partner1_name;
        const trialEndDate = trialEnd.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

        const is5Day = reminderType === "5d";
        const subject = is5Day
          ? `⏰ ${firstName}, la tua prova scade tra ${daysLeft} giorni`
          : `🔴 ${firstName}, la tua prova scade tra ${daysLeft} giorn${daysLeft === 1 ? 'o' : 'i'}!`;

        const urgencyColor = is5Day ? "#f59e0b" : "#ef4444";
        const urgencyBg = is5Day ? "#fffbeb" : "#fef2f2";
        const urgencyBorder = is5Day ? "#f59e0b" : "#ef4444";

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:24px;margin-bottom:24px;">
    
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
      <h1 style="color:#ffffff;font-size:24px;margin:0;">⏰ La tua prova sta per scadere</h1>
    </div>

    <div style="padding:32px;">
      <p style="font-size:16px;color:#333;line-height:1.6;margin-top:0;">
        Ciao <strong>${firstName}</strong>,
      </p>

      <div style="background:${urgencyBg};border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid ${urgencyBorder};">
        <p style="font-size:16px;color:${urgencyColor};margin:0;font-weight:700;">
          ${is5Day ? '⚠️' : '🔴'} La tua prova gratuita scade il ${trialEndDate}
        </p>
        <p style="font-size:14px;color:#666;margin:8px 0 0;">
          ${is5Day 
            ? 'Ti restano pochi giorni per passare a Premium e continuare a organizzare il tuo matrimonio senza interruzioni.'
            : 'Dopo la scadenza, non potrai più aggiungere o modificare dati. Tutti i tuoi dati restano al sicuro e pronti quando decidi di attivare Premium.'}
        </p>
      </div>

      <h3 style="color:#333;margin:24px 0 12px;">Ecco cosa perderesti:</h3>
      <ul style="color:#666;font-size:14px;line-height:1.8;padding-left:20px;">
        <li>Gestione completa invitati e RSVP</li>
        <li>Tesoreria e piani di pagamento</li>
        <li>Checklist intelligente con scadenze</li>
        <li>Collaborazione con il partner</li>
        <li>Digest settimanale via email</li>
      </ul>

      <div style="text-align:center;margin:32px 0;">
        <a href="${appUrl}/app/upgrade" style="background:#6366f1;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
          Passa a Premium — 49€/anno →
        </a>
        <p style="font-size:12px;color:#9ca3af;margin:12px 0 0;">
          Meno di 1€ a settimana per organizzare il tuo matrimonio senza stress
        </p>
      </div>
    </div>

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
          subject,
          html: emailHtml,
        });

        if (sendError) {
          console.error(`Error sending trial reminder to ${userEmail}:`, sendError);
          continue;
        }

        // Mark as sent (idempotent)
        const updateData: Record<string, boolean> = {};
        if (reminderType === "5d") {
          updateData.trial_reminder_5d_sent = true;
          sent5d++;
        } else {
          updateData.trial_reminder_2d_sent = true;
          sent2d++;
        }

        await supabase
          .from("weddings")
          .update(updateData)
          .eq("id", wedding.id);

        console.log(`Trial ${reminderType} reminder sent to ${userEmail} for wedding ${wedding.id}`);
      } catch (innerError) {
        console.error(`Error processing wedding ${wedding.id}:`, innerError);
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sent5d} 5-day and ${sent2d} 2-day trial reminders` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Trial reminder error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});