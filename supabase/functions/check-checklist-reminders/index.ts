import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChecklistTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  wedding: {
    id: string;
    partner1_name: string;
    partner2_name: string;
    created_by: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
    user_roles: Array<{
      user_id: string;
      role: string;
      profiles: {
        first_name: string;
        last_name: string;
      };
    }>;
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Calcola la data di domani (per i promemoria)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateString = tomorrow.toISOString().split('T')[0];

    console.log(`Checking for checklist tasks due on: ${tomorrowDateString}`);

    // Query per task in scadenza domani e ancora pending
    const { data: tasks, error } = await supabase
      .from("checklist_tasks")
      .select(`
        id,
        title,
        description,
        due_date,
        wedding:weddings!inner(
          id,
          partner1_name,
          partner2_name,
          created_by,
          profiles!created_by(first_name, last_name),
          user_roles!wedding_id(
            user_id,
            role,
            profiles!user_id(first_name, last_name)
          )
        )
      `)
      .eq("status", "pending")
      .eq("due_date", tomorrowDateString);

    if (error) {
      console.error("Error fetching tasks:", error);
      throw error;
    }

    if (!tasks || tasks.length === 0) {
      console.log("No checklist reminders to send");
      return new Response(
        JSON.stringify({ message: "No reminders to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${tasks.length} checklist task(s) due tomorrow`);

    let remindersSent = 0;

    // Raggruppa i task per wedding per inviare un'email unica per matrimonio
    const tasksByWedding = tasks.reduce((acc: { [key: string]: ChecklistTask[] }, task: any) => {
      const weddingId = task.wedding.id;
      if (!acc[weddingId]) {
        acc[weddingId] = [];
      }
      acc[weddingId].push(task as ChecklistTask);
      return acc;
    }, {});

    // Invia un'email per ogni matrimonio
    for (const [weddingId, weddingTasks] of Object.entries(tasksByWedding)) {
      const wedding = weddingTasks[0].wedding;
      
      // Raccogli tutti gli email dei co-planner e manager
      const recipients: string[] = [];
      
      // Aggiungi il creatore del matrimonio
      const { data: creatorAuth } = await supabase.auth.admin.getUserById(wedding.created_by);
      if (creatorAuth?.user?.email) {
        recipients.push(creatorAuth.user.email);
      }

      // Aggiungi co-planner e manager
      for (const role of wedding.user_roles) {
        if (role.role === 'co_planner' || role.role === 'manager') {
          const { data: userAuth } = await supabase.auth.admin.getUserById(role.user_id);
          if (userAuth?.user?.email && !recipients.includes(userAuth.user.email)) {
            recipients.push(userAuth.user.email);
          }
        }
      }

      if (recipients.length === 0) {
        console.log(`No recipients for wedding ${weddingId}`);
        continue;
      }

      // Costruisci l'HTML dell'email
      const weddingName = `${wedding.partner1_name} & ${wedding.partner2_name}`;
      const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "";
      
      let tasksHtml = weddingTasks.map(task => `
        <li style="margin-bottom: 15px;">
          <strong style="color: #333;">${task.title}</strong>
          ${task.description ? `<br/><span style="color: #666; font-size: 14px;">${task.description}</span>` : ''}
          <br/><span style="color: #999; font-size: 13px;">Scadenza: ${new Date(task.due_date).toLocaleDateString('it-IT')}</span>
        </li>
      `).join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">💍 Promemoria Checklist</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Ciao! 👋
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Ci sono <strong>${weddingTasks.length}</strong> attività in scadenza domani per il matrimonio <strong>${weddingName}</strong>:
            </p>
            
            <ul style="background: white; padding: 20px 30px; border-radius: 8px; border-left: 4px solid #667eea;">
              ${tasksHtml}
            </ul>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${appUrl}/app/checklist" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
                Visualizza Checklist
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
              Ricevi questa email perché sei un organizzatore del matrimonio ${weddingName}.
            </p>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: "Matrimonio Senza Stress <info@stenders.cloud>",
          to: recipients,
          subject: `⏰ Promemoria: ${weddingTasks.length} attività in scadenza domani`,
          html: emailHtml,
        });

        console.log(`Checklist reminder sent to: ${recipients.join(", ")}`);
        remindersSent++;
      } catch (emailError) {
        console.error(`Failed to send checklist reminder for wedding ${weddingId}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Sent ${remindersSent} checklist reminder(s)`,
        tasksDue: tasks.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-checklist-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
