import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  weddingId: string;
  weddingNames: string;
  weddingDate: string;
  role: string;
  accessCode: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user's JWT and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, weddingId, weddingNames, weddingDate, role, accessCode, inviterName }: InvitationEmailRequest = await req.json();

    // Verify the user is a co-planner for this wedding
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("wedding_id", weddingId)
      .eq("role", "co_planner")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "You must be a co-planner to send invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending wedding invitation to:", email, "by user:", user.id);
    
    const roleLabel = role === 'co_planner' ? 'Co-Planner' : role === 'manager' ? 'Manager' : 'Guest';

    const emailResponse = await resend.emails.send({
      from: "Matrimonio Senza Stress <info@stenders.cloud>",
      to: [email],
      subject: `${inviterName} ti ha invitato a collaborare al matrimonio!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px 20px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
              .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">💍 Invito a Collaborare</h1>
              </div>
              <div class="content">
                <p style="font-size: 18px;"><strong>${inviterName}</strong> ti ha invitato a collaborare come <strong>${roleLabel}</strong> per il matrimonio di:</p>
                
                <div class="info-box">
                  <h2 style="margin-top: 0; color: #667eea;">👰🤵 ${weddingNames}</h2>
                  <p style="margin: 0;"><strong>📅 Data:</strong> ${new Date(weddingDate).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <p><strong>Il tuo ruolo:</strong> Come ${roleLabel}, avrai accesso a tutte le funzionalità dell'app per aiutare a pianificare questo evento speciale!</p>

                <div class="info-box" style="background: #f0f9ff; border-color: #3b82f6;">
                  <h2 style="margin-top: 0; color: #667eea;">🔐 Codice di Accesso</h2>
                  <p style="font-size: 28px; font-weight: bold; text-align: center; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace; margin: 20px 0;">
                    ${accessCode}
                  </p>
                </div>

                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Come accedere:</strong></p>
                  <ol style="margin: 0; padding-left: 20px;">
                    <li>Vai su <a href="https://stenders.cloud" style="color: #667eea;">stenders.cloud</a></li>
                    <li>Fai login o registrati</li>
                    <li>Inserisci il codice quando richiesto</li>
                  </ol>
                </div>

                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  💡 <strong>Suggerimento:</strong> Salva questo codice! Potrai usarlo in qualsiasi momento per accedere.<br>
                  Il codice non scade mai e può essere condiviso con altri collaboratori.
                </p>

                <p style="font-size: 14px; color: #6b7280;">
                  Se non hai richiesto questo invito, puoi ignorare questa email.
                </p>
              </div>
              <div class="footer">
                Wedding Planner App - Organizza il tuo matrimonio perfetto
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
