import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  weddingNames: string;
  weddingDate: string;
  role: string;
  token: string;
  inviterName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, weddingNames, weddingDate, role, token, inviterName }: InvitationEmailRequest = await req.json();
    
    console.log("Sending wedding invitation to:", email);

    const acceptUrl = `https://matrimonostress.lovable.app/accept-invite?token=${token}`;
    
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

                <div style="text-align: center;">
                  <a href="${acceptUrl}" class="button">
                    ✨ Accetta l'Invito
                  </a>
                </div>

                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                  ⏰ Questo invito scadrà tra 7 giorni.<br>
                  Se non hai richiesto questo invito, puoi ignorare questa email.
                </p>

                <p style="font-size: 14px; color: #6b7280;">
                  Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br>
                  <span style="color: #667eea; word-break: break-all;">${acceptUrl}</span>
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
