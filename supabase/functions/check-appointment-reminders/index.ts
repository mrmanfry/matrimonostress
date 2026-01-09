import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Appointment {
  id: string;
  title: string;
  appointment_date: string;
  appointment_time: string | null;
  location: string | null;
  purpose: string | null;
  vendor_id: string;
  wedding_id: string;
  vendors: {
    name: string;
  } | { name: string }[] | null;
}

interface Wedding {
  id: string;
  partner1_name: string;
  partner2_name: string;
  created_by: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appUrl = Deno.env.get("APP_URL") || "https://lovable.dev";

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    console.log(`Checking appointments for: ${tomorrowStr}`);

    // Fetch appointments scheduled for tomorrow that are still "scheduled"
    const { data: appointments, error: appointmentsError } = await supabase
      .from("vendor_appointments")
      .select(`
        id,
        title,
        appointment_date,
        appointment_time,
        location,
        purpose,
        vendor_id,
        wedding_id,
        vendors(name)
      `)
      .eq("appointment_date", tomorrowStr)
      .eq("status", "scheduled");

    if (appointmentsError) {
      throw appointmentsError;
    }

    if (!appointments || appointments.length === 0) {
      console.log("No appointments found for tomorrow");
      return new Response(
        JSON.stringify({ success: true, message: "No appointments for tomorrow", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${appointments.length} appointments for tomorrow`);

    // Group appointments by wedding_id
    const appointmentsByWedding = new Map<string, Appointment[]>();
    for (const apt of appointments as Appointment[]) {
      const existing = appointmentsByWedding.get(apt.wedding_id) || [];
      existing.push(apt);
      appointmentsByWedding.set(apt.wedding_id, existing);
    }

    let emailsSent = 0;
    const errors: string[] = [];

    // For each wedding, get the owner and send a reminder email
    for (const [weddingId, weddingAppointments] of appointmentsByWedding) {
      try {
        // Get wedding details
        const { data: wedding, error: weddingError } = await supabase
          .from("weddings")
          .select("id, partner1_name, partner2_name, created_by")
          .eq("id", weddingId)
          .single();

        if (weddingError || !wedding) {
          console.error(`Wedding not found: ${weddingId}`);
          continue;
        }

        // Get user email
        const { data: userData, error: userError } = await supabase.rpc(
          "get_user_email",
          { _user_id: wedding.created_by }
        );

        if (userError || !userData) {
          console.error(`User email not found for wedding ${weddingId}`);
          continue;
        }

        const userEmail = userData as string;

        // Build email content
        const appointmentListHtml = weddingAppointments
        .map((apt) => {
            const timeStr = apt.appointment_time
              ? apt.appointment_time.slice(0, 5)
              : "Orario da definire";
            const vendorsData = apt.vendors;
            const vendorName = Array.isArray(vendorsData) 
              ? vendorsData[0]?.name || "Fornitore"
              : vendorsData?.name || "Fornitore";
            const locationStr = apt.location
              ? `<br/>📍 ${apt.location}`
              : "";
            const purposeStr = apt.purpose
              ? `<br/>📋 ${apt.purpose}`
              : "";

            return `
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #8B5CF6;">
                <div style="font-weight: 600; color: #1f2937; font-size: 16px;">
                  ${apt.title}
                </div>
                <div style="color: #6b7280; margin-top: 8px; font-size: 14px;">
                  🏢 ${vendorName}<br/>
                  🕐 ${timeStr}
                  ${locationStr}
                  ${purposeStr}
                </div>
              </div>
            `;
          })
          .join("");

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f9fafb; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">
                  📅 Promemoria Appuntamenti
                </h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">
                  Matrimonio di ${wedding.partner1_name} & ${wedding.partner2_name}
                </p>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">
                  Ciao! 👋<br/><br/>
                  Ti ricordiamo che <strong>domani</strong> hai ${weddingAppointments.length === 1 ? "un appuntamento" : `${weddingAppointments.length} appuntamenti`}:
                </p>
                
                ${appointmentListHtml}
                
                <div style="margin-top: 32px; text-align: center;">
                  <a href="${appUrl}/app/calendar" 
                     style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Vedi Calendario
                  </a>
                </div>
                
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 32px;">
                  Buona organizzazione! 💜
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        // Send email
        const { error: emailError } = await resend.emails.send({
          from: "Wedding Planner <noreply@resend.dev>",
          to: [userEmail],
          subject: `📅 Promemoria: ${weddingAppointments.length === 1 ? "Appuntamento domani" : `${weddingAppointments.length} appuntamenti domani`}`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Failed to send email to ${userEmail}:`, emailError);
          errors.push(`Failed to send to ${userEmail}: ${emailError.message}`);
        } else {
          console.log(`Reminder sent to ${userEmail} for ${weddingAppointments.length} appointments`);
          emailsSent++;
        }
      } catch (weddingError) {
        console.error(`Error processing wedding ${weddingId}:`, weddingError);
        errors.push(`Error for wedding ${weddingId}: ${String(weddingError)}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${appointmentsByWedding.size} weddings`,
        emailsSent,
        appointmentsFound: appointments.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-appointment-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
