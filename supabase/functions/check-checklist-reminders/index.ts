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
  assigned_to: string | null;
  wedding: {
    id: string;
    partner1_name: string;
    partner2_name: string;
    created_by: string;
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

interface RecipientTasks {
  email: string;
  firstName: string;
  personalTasks: ChecklistTask[];
  sharedTasks: ChecklistTask[];
  partnerName: string; // Name of the other partner for "condivise con X"
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateString = tomorrow.toISOString().split('T')[0];

    console.log(`Checking for checklist tasks due on: ${tomorrowDateString}`);

    // Query tasks with assigned_to field
    const { data: tasks, error } = await supabase
      .from("checklist_tasks")
      .select(`
        id,
        title,
        description,
        due_date,
        assigned_to,
        wedding:weddings!inner(
          id,
          partner1_name,
          partner2_name,
          created_by,
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

    // Group tasks by wedding first
    const tasksByWedding = tasks.reduce((acc: { [key: string]: ChecklistTask[] }, task: any) => {
      const weddingId = task.wedding.id;
      if (!acc[weddingId]) {
        acc[weddingId] = [];
      }
      acc[weddingId].push(task as ChecklistTask);
      return acc;
    }, {});

    // Process each wedding
    for (const [weddingId, weddingTasks] of Object.entries(tasksByWedding)) {
      const wedding = weddingTasks[0].wedding;
      
      // Build map of partner name -> co-planner email and user info
      const partnerEmailMap: { [partnerKey: string]: { email: string; firstName: string } } = {};
      
      // Get all co-planners for this wedding
      const coplanners = wedding.user_roles.filter(r => r.role === 'co_planner');
      
      for (const coplanner of coplanners) {
        const { data: userAuth } = await supabase.auth.admin.getUserById(coplanner.user_id);
        if (!userAuth?.user?.email) continue;
        
        const firstName = coplanner.profiles?.first_name || '';
        
        // Match first_name to partner1_name or partner2_name
        if (firstName.toLowerCase() === wedding.partner1_name.toLowerCase()) {
          partnerEmailMap['partner1'] = { email: userAuth.user.email, firstName };
        } else if (firstName.toLowerCase() === wedding.partner2_name.toLowerCase()) {
          partnerEmailMap['partner2'] = { email: userAuth.user.email, firstName };
        }
      }

      console.log(`Wedding ${weddingId} - Partner mapping:`, partnerEmailMap);

      // If no co-planners found with matching names, fallback to sending to all co-planners
      if (Object.keys(partnerEmailMap).length === 0) {
        console.log(`No partner name matches found, falling back to all co-planners`);
        
        // Fallback: send to all co-planners with generic email
        const recipients: string[] = [];
        for (const coplanner of coplanners) {
          const { data: userAuth } = await supabase.auth.admin.getUserById(coplanner.user_id);
          if (userAuth?.user?.email) {
            recipients.push(userAuth.user.email);
          }
        }
        
        if (recipients.length > 0) {
          const emailSent = await sendFallbackEmail(weddingTasks, wedding, recipients, resend);
          if (emailSent) remindersSent++;
        }
        continue;
      }

      // Build recipient-specific task lists
      const recipientTasks: { [email: string]: RecipientTasks } = {};
      
      // Initialize recipients
      for (const [partnerKey, { email, firstName }] of Object.entries(partnerEmailMap)) {
        const otherPartnerKey = partnerKey === 'partner1' ? 'partner2' : 'partner1';
        const otherPartnerName = partnerKey === 'partner1' ? wedding.partner2_name : wedding.partner1_name;
        
        recipientTasks[email] = {
          email,
          firstName,
          personalTasks: [],
          sharedTasks: [],
          partnerName: otherPartnerName
        };
      }

      // Categorize tasks
      for (const task of weddingTasks) {
        if (task.assigned_to === null) {
          // Shared task - add to both partners' shared lists
          for (const email of Object.keys(recipientTasks)) {
            recipientTasks[email].sharedTasks.push(task);
          }
        } else if (task.assigned_to === 'partner1' && partnerEmailMap['partner1']) {
          // Personal task for partner1
          recipientTasks[partnerEmailMap['partner1'].email].personalTasks.push(task);
        } else if (task.assigned_to === 'partner2' && partnerEmailMap['partner2']) {
          // Personal task for partner2
          recipientTasks[partnerEmailMap['partner2'].email].personalTasks.push(task);
        }
      }

      // Send personalized emails
      for (const [email, recipient] of Object.entries(recipientTasks)) {
        const totalTasks = recipient.personalTasks.length + recipient.sharedTasks.length;
        
        if (totalTasks === 0) continue;
        
        const emailHtml = buildPersonalizedEmail(
          recipient.firstName,
          recipient.personalTasks,
          recipient.sharedTasks,
          recipient.partnerName,
          wedding.partner1_name,
          wedding.partner2_name
        );

        try {
          await resend.emails.send({
            from: "Matrimonio Senza Stress <info@stenders.cloud>",
            to: [email],
            subject: `⏰ Promemoria: hai ${totalTasks} attività in scadenza domani`,
            html: emailHtml,
          });

          console.log(`Personalized reminder sent to: ${email} (${totalTasks} tasks)`);
          remindersSent++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${email}:`, emailError);
        }
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

function buildPersonalizedEmail(
  firstName: string,
  personalTasks: ChecklistTask[],
  sharedTasks: ChecklistTask[],
  partnerName: string,
  partner1Name: string,
  partner2Name: string
): string {
  const totalTasks = personalTasks.length + sharedTasks.length;
  const appUrl = "https://stenders.cloud";
  
  let tasksHtml = '';
  
  // Personal tasks section
  if (personalTasks.length > 0) {
    tasksHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #667eea; margin-bottom: 10px; font-size: 16px;">📌 Tue attività personali</h3>
        <ul style="background: white; padding: 15px 25px; border-radius: 8px; border-left: 4px solid #667eea; margin: 0;">
          ${personalTasks.map(task => `
            <li style="margin-bottom: 10px;">
              <strong style="color: #333;">${task.title}</strong>
              ${task.description ? `<br/><span style="color: #666; font-size: 14px;">${task.description}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }
  
  // Shared tasks section
  if (sharedTasks.length > 0) {
    tasksHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #764ba2; margin-bottom: 10px; font-size: 16px;">👥 Attività condivise (con ${partnerName})</h3>
        <ul style="background: white; padding: 15px 25px; border-radius: 8px; border-left: 4px solid #764ba2; margin: 0;">
          ${sharedTasks.map(task => `
            <li style="margin-bottom: 10px;">
              <strong style="color: #333;">${task.title}</strong>
              ${task.description ? `<br/><span style="color: #666; font-size: 14px;">${task.description}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  return `
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
          Ciao ${firstName}! 👋
        </p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Ci sono <strong>${totalTasks}</strong> attività in scadenza domani per il matrimonio <strong>${partner1Name} & ${partner2Name}</strong>:
        </p>
        
        ${tasksHtml}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${appUrl}/app/checklist" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
            Visualizza Checklist
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
          Ricevi questa email perché sei un organizzatore del matrimonio ${partner1Name} & ${partner2Name}.
        </p>
      </div>
    </body>
    </html>
  `;
}

async function sendFallbackEmail(
  tasks: ChecklistTask[],
  wedding: any,
  recipients: string[],
  resendClient: any
): Promise<boolean> {
  const appUrl = "https://stenders.cloud";
  const weddingName = `${wedding.partner1_name} & ${wedding.partner2_name}`;
  
  const tasksHtml = tasks.map(task => `
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
          Ci sono <strong>${tasks.length}</strong> attività in scadenza domani per il matrimonio <strong>${weddingName}</strong>:
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
    await resendClient.emails.send({
      from: "Matrimonio Senza Stress <info@stenders.cloud>",
      to: recipients,
      subject: `⏰ Promemoria: ${tasks.length} attività in scadenza domani`,
      html: emailHtml,
    });
    console.log(`Fallback reminder sent to: ${recipients.join(", ")}`);
    return true;
  } catch (emailError) {
    console.error(`Failed to send fallback reminder:`, emailError);
    return false;
  }
}
