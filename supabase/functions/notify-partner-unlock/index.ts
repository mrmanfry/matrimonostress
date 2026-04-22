import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const appUrl = Deno.env.get("APP_URL") || "https://matrimonostress.lovable.app";

const log = (s: string, d?: unknown) =>
  console.log(`[NOTIFY-PARTNER-UNLOCK] ${s}${d ? " - " + JSON.stringify(d) : ""}`);

interface Body {
  weddingId: string;
  payerUserId: string;
  partnerEmailHint?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: Body = await req.json();
    const { weddingId, payerUserId, partnerEmailHint } = body;
    if (!weddingId || !payerUserId) throw new Error("weddingId and payerUserId required");

    // Fetch wedding
    const { data: wedding } = await supabase
      .from("weddings")
      .select("partner1_name, partner2_name, partner_unlocked_email")
      .eq("id", weddingId)
      .maybeSingle();
    if (!wedding) throw new Error("Wedding not found");

    // Already notified? skip
    if (wedding.partner_unlocked_email) {
      log("Already notified", { weddingId, email: wedding.partner_unlocked_email });
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get payer info
    const { data: payerData } = await supabase.auth.admin.getUserById(payerUserId);
    const payerEmail = payerData?.user?.email || "";
    const payerFirstName =
      payerData?.user?.user_metadata?.first_name || wedding.partner1_name || "Il/La tuo/a partner";

    // Find the partner: another co_planner on this wedding (not the payer)
    const { data: otherRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("wedding_id", weddingId)
      .eq("role", "co_planner")
      .neq("user_id", payerUserId);

    let partnerEmail: string | null = null;
    if (otherRoles && otherRoles.length > 0) {
      const { data: partnerUser } = await supabase.auth.admin.getUserById(otherRoles[0].user_id);
      partnerEmail = partnerUser?.user?.email || null;
    }

    // Fallback: pending invitation email or hint
    if (!partnerEmail) {
      const { data: invites } = await supabase
        .from("wedding_invitations")
        .select("email")
        .eq("wedding_id", weddingId)
        .eq("role", "co_planner")
        .order("created_at", { ascending: false })
        .limit(1);
      if (invites && invites.length > 0) partnerEmail = invites[0].email;
    }
    if (!partnerEmail && partnerEmailHint) partnerEmail = partnerEmailHint;

    if (!partnerEmail || partnerEmail.toLowerCase() === payerEmail.toLowerCase()) {
      log("No distinct partner email found", { weddingId });
      // Still record attempt
      await supabase
        .from("weddings")
        .update({ partner_unlocked_at: new Date().toISOString() })
        .eq("id", weddingId);
      return new Response(JSON.stringify({ noPartner: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `💍 ${payerFirstName} ha sbloccato WedsApp Premium per te`;
    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 28px;text-align:center;">
      <h1 style="color:#fff;font-size:24px;margin:0 0 6px;">💍 Sorpresa!</h1>
      <p style="color:#e0e7ff;font-size:15px;margin:0;">${wedding.partner1_name} & ${wedding.partner2_name}</p>
    </div>
    <div style="padding:28px;">
      <p style="font-size:16px;color:#333;line-height:1.6;margin-top:0;">
        <strong>${payerFirstName}</strong> ha attivato il piano <strong>Premium</strong> di WedsApp,
        e ha sbloccato l'accesso completo anche per te.
      </p>
      <p style="font-size:15px;color:#444;line-height:1.6;">
        Hai a disposizione un anno completo di funzionalità premium: gestione invitati illimitata,
        budget intelligente, foto del matrimonio, partecipazioni digitali e molto altro.
      </p>
      <div style="background:#f0f4ff;border-left:4px solid #6366f1;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;color:#4338ca;font-size:14px;">
          ✨ Non devi pagare nulla — è un regalo del/della tuo/a partner.
        </p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/auth" style="background:#6366f1;color:#fff;padding:13px 28px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
          Entra in WedsApp →
        </a>
      </div>
      <p style="font-size:13px;color:#888;line-height:1.5;margin-top:24px;">
        Se non hai ancora un account, registrati con questa stessa email (${partnerEmail}) per accedere
        automaticamente al matrimonio.
      </p>
    </div>
    <div style="padding:18px;background:#f9fafb;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">WedsApp — Nozze senza stress</p>
    </div>
  </div>
</body></html>`;

    const { error: sendError } = await resend.emails.send({
      from: "WedsApp <noreply@resend.dev>",
      to: [partnerEmail],
      subject,
      html,
    });
    if (sendError) {
      log("Resend error", sendError);
      throw sendError;
    }

    await supabase
      .from("weddings")
      .update({
        partner_unlocked_email: partnerEmail,
        partner_unlocked_at: new Date().toISOString(),
      })
      .eq("id", weddingId);

    log("Partner notified", { weddingId, partnerEmail });

    return new Response(JSON.stringify({ success: true, partnerEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("Error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
