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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      .in("role", ["co_planner", "planner"])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "You must be a co-planner to send invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending wedding invitation to:", email, "by user:", user.id);
    
    const roleLabel = role === 'co_planner' ? 'Co-Planner' : role === 'planner' ? 'Planner Professionista' : role === 'manager' ? 'Manager' : 'Collaboratore';

    const appUrl = "https://matrimonostress.lovable.app";
    const joinLink = `${appUrl}/app/dashboard?join=${encodeURIComponent(accessCode)}`;
    const formattedDate = new Date(weddingDate).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const emailResponse = await resend.emails.send({
      from: "WedsApp <info@stenders.cloud>",
      to: [email],
      subject: `${inviterName} ti ha invitato a collaborare su WedsApp`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

                    <!-- Logo -->
                    <tr>
                      <td align="center" style="padding-bottom: 24px;">
                        <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: hsl(243, 75%, 58%); letter-spacing: 2px;">💍 WedsApp</span>
                      </td>
                    </tr>

                    <!-- Main Card -->
                    <tr>
                      <td style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                        
                        <!-- Header -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="background: linear-gradient(135deg, hsl(243, 75%, 58%) 0%, hsl(250, 60%, 45%) 100%); padding: 32px 32px 28px; text-align: center;">
                              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: #ffffff; font-weight: 700;">
                                Invito a Collaborare
                              </h1>
                              <p style="margin: 8px 0 0; font-size: 15px; color: rgba(255,255,255,0.85);">
                                al matrimonio di <strong>${weddingNames}</strong>
                              </p>
                            </td>
                          </tr>
                        </table>

                        <!-- Body -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 32px;">
                              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6;">
                                Ciao! <strong>${inviterName}</strong> ti ha invitato come <strong>${roleLabel}</strong> per collaborare all'organizzazione del matrimonio.
                              </p>

                              <!-- Wedding Info Box -->
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                                <tr>
                                  <td style="background: #f8f7ff; border-left: 4px solid hsl(243, 75%, 58%); border-radius: 0 12px 12px 0; padding: 20px 24px;">
                                    <p style="margin: 0 0 4px; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; color: hsl(243, 75%, 58%); font-weight: 700;">
                                      👰🤵 ${weddingNames}
                                    </p>
                                    <p style="margin: 0; font-size: 14px; color: #555;">
                                      📅 ${formattedDate}
                                    </p>
                                  </td>
                                </tr>
                              </table>

                              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #555;">
                                Come <strong>${roleLabel}</strong>, potrai accedere all'app e aiutare a pianificare ogni dettaglio di questo evento speciale.
                              </p>

                              <!-- CTA Button -->
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td align="center" style="padding: 8px 0 28px;">
                                    <a href="${joinLink}" style="display: inline-block; background: hsl(243, 75%, 58%); color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">
                                      Accedi al Matrimonio →
                                    </a>
                                  </td>
                                </tr>
                              </table>

                              <!-- Manual Code -->
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px;">
                                <tr>
                                  <td style="background: #f0f4ff; border-radius: 12px; padding: 20px; text-align: center;">
                                    <p style="margin: 0 0 8px; font-size: 13px; color: #666; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
                                      Codice di accesso manuale
                                    </p>
                                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: hsl(243, 75%, 58%); letter-spacing: 4px; font-family: 'Courier New', monospace;">
                                      ${accessCode}
                                    </p>
                                    <p style="margin: 8px 0 0; font-size: 12px; color: #888;">
                                      Puoi anche inserirlo manualmente dall'app
                                    </p>
                                  </td>
                                </tr>
                              </table>

                              <p style="margin: 0; font-size: 13px; color: #999; line-height: 1.5;">
                                Se non hai richiesto questo invito, puoi semplicemente ignorare questa email.
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td align="center" style="padding: 24px 0 0;">
                        <p style="margin: 0; font-size: 12px; color: #999;">
                          WedsApp — Il tuo Wedding Planner digitale
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
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
