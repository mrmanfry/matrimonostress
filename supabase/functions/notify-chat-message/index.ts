import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const THROTTLE_MINUTES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wedding_id, sender_id, content, visibility } = await req.json();

    if (!wedding_id || !sender_id || !content) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const appUrl = Deno.env.get("APP_URL") || "https://matrimonostress.lovable.app";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get sender's role in this wedding
    const { data: senderRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", sender_id)
      .eq("wedding_id", wedding_id)
      .single();

    if (!senderRole) {
      return new Response(JSON.stringify({ skipped: true, reason: "no_role" }), {
        headers: corsHeaders,
      });
    }

    // 2. Determine recipients based on sender's role
    let recipientRoles: string[];
    if (senderRole.role === "planner" || senderRole.role === "manager") {
      // Planner/manager sends → notify co_planners (the couple)
      recipientRoles = ["co_planner"];
    } else if (senderRole.role === "co_planner") {
      // Couple sends → notify planner
      // If visibility is "couple", don't notify planner (private message)
      if (visibility === "couple") {
        return new Response(
          JSON.stringify({ skipped: true, reason: "couple_only" }),
          { headers: corsHeaders }
        );
      }
      recipientRoles = ["planner"];
    } else {
      return new Response(
        JSON.stringify({ skipped: true, reason: "role_not_handled" }),
        { headers: corsHeaders }
      );
    }

    // 3. Get recipient user IDs
    const { data: recipients } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("wedding_id", wedding_id)
      .in("role", recipientRoles);

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_recipients" }),
        { headers: corsHeaders }
      );
    }

    // 4. Get sender display name
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", sender_id)
      .single();

    const senderName =
      [senderProfile?.first_name, senderProfile?.last_name]
        .filter(Boolean)
        .join(" ") || "Un collaboratore";

    // 5. Get wedding info for context
    const { data: wedding } = await supabase
      .from("weddings")
      .select("partner1_name, partner2_name")
      .eq("id", wedding_id)
      .single();

    const weddingLabel = wedding
      ? `${wedding.partner1_name} & ${wedding.partner2_name}`
      : "Il tuo matrimonio";

    // 6. Throttle check — look at recent messages in this wedding from the same sender
    const throttleTime = new Date(
      Date.now() - THROTTLE_MINUTES * 60 * 1000
    ).toISOString();

    const { data: recentMsgs } = await supabase
      .from("messages")
      .select("id")
      .eq("wedding_id", wedding_id)
      .eq("sender_id", sender_id)
      .gt("created_at", throttleTime)
      .order("created_at", { ascending: false })
      .limit(2);

    // If there are 2+ recent messages from same sender, skip (conversation is active)
    if (recentMsgs && recentMsgs.length >= 2) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "throttled" }),
        { headers: corsHeaders }
      );
    }

    // 7. Send email to each recipient
    const contentPreview =
      content.length > 200 ? content.substring(0, 200) + "…" : content;

    const chatUrl =
      senderRole.role === "planner" || senderRole.role === "manager"
        ? `${appUrl}/app/chat`
        : `${appUrl}/app/inbox`;

    let emailsSent = 0;

    for (const recipient of recipients) {
      // Skip self-notification
      if (recipient.user_id === sender_id) continue;

      // Get recipient email
      const { data: userData } = await supabase.auth.admin.getUserById(
        recipient.user_id
      );

      if (!userData?.user?.email) continue;

      const recipientEmail = userData.user.email;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1,#818cf8);padding:28px 24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">💬 Nuovo Messaggio</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${weddingLabel}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:28px 24px;">
          <p style="margin:0 0 16px;color:#18181b;font-size:15px;line-height:1.5;">
            <strong>${senderName}</strong> ti ha inviato un messaggio:
          </p>
          <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 24px;">
            <p style="margin:0;color:#3f3f46;font-size:14px;line-height:1.6;white-space:pre-wrap;">${contentPreview}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${chatUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
                Vai alla Chat →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 24px;border-top:1px solid #e4e4e7;text-align:center;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">WedsApp — Il tuo wedding planner digitale</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "WedsApp <noreply@notify.wedsapp.it>",
          to: [recipientEmail],
          subject: `💬 Nuovo messaggio da ${senderName} — ${weddingLabel}`,
          html,
        }),
      });

      if (res.ok) emailsSent++;
    }

    return new Response(
      JSON.stringify({ success: true, emails_sent: emailsSent }),
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("notify-chat-message error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
