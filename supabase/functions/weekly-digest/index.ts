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

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: string | null;
}

interface Payment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
}

interface WeddingData {
  wedding_id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string;
  recipients: string[];
  tasks: Task[];
  payments: Payment[];
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get date ranges
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    console.log(`Generating weekly digest for period: ${todayStr} to ${nextWeekStr}`);

    // Get all active weddings with user roles
    const { data: weddings, error: weddingsError } = await supabase
      .from("weddings")
      .select(`
        id,
        partner1_name,
        partner2_name,
        wedding_date,
        created_by,
        user_roles!wedding_id(
          user_id,
          role
        )
      `)
      .gte("wedding_date", todayStr);

    if (weddingsError) {
      console.error("Error fetching weddings:", weddingsError);
      throw weddingsError;
    }

    if (!weddings || weddings.length === 0) {
      console.log("No active weddings found");
      return new Response(
        JSON.stringify({ message: "No active weddings" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${weddings.length} active wedding(s)`);

    let digestsSent = 0;

    for (const wedding of weddings) {
      // Collect recipients (co-planners and managers)
      const recipients: string[] = [];
      
      // Add wedding creator
      const { data: creatorAuth } = await supabase.auth.admin.getUserById(wedding.created_by);
      if (creatorAuth?.user?.email) {
        recipients.push(creatorAuth.user.email);
      }

      // Add other co-planners and managers
      for (const role of wedding.user_roles || []) {
        if (role.role === 'co_planner' || role.role === 'manager') {
          const { data: userAuth } = await supabase.auth.admin.getUserById(role.user_id);
          if (userAuth?.user?.email && !recipients.includes(userAuth.user.email)) {
            recipients.push(userAuth.user.email);
          }
        }
      }

      if (recipients.length === 0) {
        console.log(`No recipients for wedding ${wedding.id}`);
        continue;
      }

      // Fetch pending tasks
      const { data: tasks } = await supabase
        .from("checklist_tasks")
        .select("id, title, due_date, status, priority")
        .eq("wedding_id", wedding.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true });

      // Fetch pending payments with expense info
      const { data: expenseItems } = await supabase
        .from("expense_items")
        .select("id")
        .eq("wedding_id", wedding.id);

      const expenseIds = expenseItems?.map(e => e.id) || [];
      
      let payments: Payment[] = [];
      if (expenseIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("id, description, amount, due_date, status")
          .in("expense_item_id", expenseIds)
          .eq("status", "Da Pagare")
          .lte("due_date", nextWeekStr)
          .order("due_date", { ascending: true });
        
        payments = paymentsData || [];
      }

      // Calculate stats
      const overdueTasks = (tasks || []).filter(t => 
        t.due_date && new Date(t.due_date) < today
      );
      const upcomingTasks = (tasks || []).filter(t => 
        t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= nextWeek
      );
      const mustTasks = (tasks || []).filter(t => t.priority === 'must');

      const overduePayments = payments.filter(p => 
        new Date(p.due_date) < today
      );
      const upcomingPayments = payments.filter(p => 
        new Date(p.due_date) >= today && new Date(p.due_date) <= nextWeek
      );

      // Skip if nothing to report
      if (overdueTasks.length === 0 && upcomingTasks.length === 0 && 
          overduePayments.length === 0 && upcomingPayments.length === 0) {
        console.log(`No items to report for wedding ${wedding.id}`);
        continue;
      }

      // Calculate days until wedding
      const weddingDate = new Date(wedding.wedding_date);
      const daysUntilWedding = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Build email HTML
      const weddingName = `${wedding.partner1_name} & ${wedding.partner2_name}`;
      const appUrl = Deno.env.get("APP_URL") || "https://stenders.cloud";

      const emailHtml = buildDigestEmail({
        weddingName,
        daysUntilWedding,
        overdueTasks,
        upcomingTasks,
        mustTasks,
        overduePayments,
        upcomingPayments,
        appUrl,
      });

      try {
        await resend.emails.send({
          from: "Matrimonio Senza Stress <info@stenders.cloud>",
          to: recipients,
          subject: `📋 Digest Settimanale - ${weddingName} (${daysUntilWedding} giorni al matrimonio)`,
          html: emailHtml,
        });

        console.log(`Weekly digest sent to: ${recipients.join(", ")} for wedding ${wedding.id}`);
        digestsSent++;
      } catch (emailError) {
        console.error(`Failed to send digest for wedding ${wedding.id}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Sent ${digestsSent} weekly digest(s)`,
        totalWeddings: weddings.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in weekly-digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

interface DigestEmailParams {
  weddingName: string;
  daysUntilWedding: number;
  overdueTasks: Task[];
  upcomingTasks: Task[];
  mustTasks: Task[];
  overduePayments: Payment[];
  upcomingPayments: Payment[];
  appUrl: string;
}

function buildDigestEmail({
  weddingName,
  daysUntilWedding,
  overdueTasks,
  upcomingTasks,
  mustTasks,
  overduePayments,
  upcomingPayments,
  appUrl,
}: DigestEmailParams): string {
  
  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

  const getPriorityBadge = (priority: string | null) => {
    switch (priority) {
      case 'must': return '🔴 Must';
      case 'should': return '🟠 Should';
      case 'could': return '🔵 Could';
      default: return '';
    }
  };

  // Build sections
  let sectionsHtml = '';

  // Alert section for overdue items
  if (overdueTasks.length > 0 || overduePayments.length > 0) {
    sectionsHtml += `
      <div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="color: #DC2626; margin: 0 0 10px 0;">⚠️ Attenzione: Scadenze Superate</h3>
        ${overdueTasks.length > 0 ? `
          <p style="margin: 5px 0; color: #7F1D1D;"><strong>${overdueTasks.length}</strong> task scaduti</p>
        ` : ''}
        ${overduePayments.length > 0 ? `
          <p style="margin: 5px 0; color: #7F1D1D;"><strong>${overduePayments.length}</strong> pagamenti scaduti (${formatCurrency(overduePayments.reduce((sum, p) => sum + p.amount, 0))})</p>
        ` : ''}
      </div>
    `;
  }

  // Tasks section
  if (upcomingTasks.length > 0 || overdueTasks.length > 0) {
    const allTasks = [...overdueTasks, ...upcomingTasks].slice(0, 10);
    sectionsHtml += `
      <div style="margin-bottom: 25px;">
        <h3 style="color: #374151; margin-bottom: 15px; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">
          ✅ Checklist (${(tasks => tasks.length)(allTasks)} attività)
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${allTasks.map(task => `
            <li style="padding: 10px; margin-bottom: 8px; background: #F9FAFB; border-radius: 6px; border-left: 3px solid ${task.due_date && new Date(task.due_date) < new Date() ? '#DC2626' : '#10B981'};">
              <div style="display: flex; justify-content: space-between;">
                <strong style="color: #1F2937;">${task.title}</strong>
                ${task.priority ? `<span style="font-size: 12px;">${getPriorityBadge(task.priority)}</span>` : ''}
              </div>
              ${task.due_date ? `
                <span style="font-size: 13px; color: ${new Date(task.due_date) < new Date() ? '#DC2626' : '#6B7280'};">
                  📅 ${formatDate(task.due_date)}${new Date(task.due_date) < new Date() ? ' (SCADUTO)' : ''}
                </span>
              ` : ''}
            </li>
          `).join('')}
        </ul>
        ${(overdueTasks.length + upcomingTasks.length) > 10 ? `
          <p style="color: #6B7280; font-size: 13px; text-align: center; margin-top: 10px;">
            +${(overdueTasks.length + upcomingTasks.length) - 10} altre attività...
          </p>
        ` : ''}
      </div>
    `;
  }

  // Payments section
  if (upcomingPayments.length > 0 || overduePayments.length > 0) {
    const allPayments = [...overduePayments, ...upcomingPayments].slice(0, 8);
    const totalDue = allPayments.reduce((sum, p) => sum + p.amount, 0);
    
    sectionsHtml += `
      <div style="margin-bottom: 25px;">
        <h3 style="color: #374151; margin-bottom: 15px; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">
          💰 Pagamenti in Scadenza (${formatCurrency(totalDue)})
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${allPayments.map(payment => `
            <li style="padding: 10px; margin-bottom: 8px; background: #F9FAFB; border-radius: 6px; border-left: 3px solid ${new Date(payment.due_date) < new Date() ? '#DC2626' : '#F59E0B'};">
              <div style="display: flex; justify-content: space-between;">
                <strong style="color: #1F2937;">${payment.description}</strong>
                <span style="font-weight: bold; color: #1F2937;">${formatCurrency(payment.amount)}</span>
              </div>
              <span style="font-size: 13px; color: ${new Date(payment.due_date) < new Date() ? '#DC2626' : '#6B7280'};">
                📅 ${formatDate(payment.due_date)}${new Date(payment.due_date) < new Date() ? ' (SCADUTO)' : ''}
              </span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // Must-have priorities reminder
  if (mustTasks.length > 0 && mustTasks.length <= 5) {
    sectionsHtml += `
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <h4 style="color: #92400E; margin: 0 0 10px 0;">🎯 Priorità "Must Have"</h4>
        <p style="color: #78350F; margin: 0; font-size: 14px;">
          ${mustTasks.map(t => t.title).join(', ')}
        </p>
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
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #F3F4F6;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0 0 10px 0; font-size: 24px;">📋 Digest Settimanale</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">${weddingName}</p>
      </div>
      
      <!-- Countdown -->
      <div style="background: white; padding: 20px; text-align: center; border-bottom: 1px solid #E5E7EB;">
        <div style="font-size: 48px; font-weight: bold; color: #667eea;">${daysUntilWedding}</div>
        <div style="font-size: 14px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px;">giorni al matrimonio</div>
      </div>
      
      <!-- Content -->
      <div style="background: white; padding: 25px; border-radius: 0 0 12px 12px;">
        ${sectionsHtml || '<p style="text-align: center; color: #6B7280;">Nessuna attività in programma questa settimana! 🎉</p>'}
        
        <!-- CTA -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          <a href="${appUrl}/app/dashboard" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 15px;">
            Apri Dashboard
          </a>
        </div>
        
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 25px; text-align: center;">
          Ricevi questa email ogni lunedì perché sei un organizzatore del matrimonio ${weddingName}.
        </p>
      </div>
    </body>
    </html>
  `;
}
