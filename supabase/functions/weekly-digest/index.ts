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
  vendor_name?: string;
  category?: string;
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

// Messaggi motivazionali casuali
const motivationalMessages = [
  "Un passo alla volta, sei sulla strada giusta! 💪",
  "Ogni dettaglio conta. Tu ce la stai mettendo tutta! ✨",
  "Il matrimonio perfetto si costruisce settimana dopo settimana 🌟",
  "Respira, pianifica, conquista! 🎯",
  "Questa sarà una settimana produttiva! 🚀",
];

// Consigli contestuali in base ai giorni mancanti
const getTip = (days: number): string => {
  if (days > 180) return "È il momento perfetto per bloccare i fornitori chiave! Ricorda: i migliori si prenotano con largo anticipo.";
  if (days > 90) return "Inizia a pensare alle partecipazioni e al Save the Date 💌";
  if (days > 60) return "Conferma tutti i dettagli con i fornitori e inizia a raccogliere le conferme RSVP.";
  if (days > 30) return "Ultimo mese di preparativi! Verifica i pagamenti finali e le conferme.";
  if (days > 7) return "Ultima settimana! Rilassati, hai fatto un ottimo lavoro. Ora goditi il momento 🎉";
  return "Il grande giorno è quasi arrivato! Respira e lasciati travolgere dalla gioia 💕";
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse URL per parametri test
  const url = new URL(req.url);
  const testMode = url.searchParams.get("test") === "true";
  const testEmail = url.searchParams.get("email"); // Email di test opzionale

  // Validate cron secret - skip in test mode
  if (!testMode) {
    const cronSecret = req.headers.get("X-Cron-Secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    
    if (!expectedSecret || cronSecret !== expectedSecret) {
      console.error("Unauthorized cron request - invalid or missing secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  console.log(`Weekly digest invoked - testMode: ${testMode}, testEmail: ${testEmail || 'none'}`);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const today = new Date();
    
    // Calcola la domenica successiva (fine settimana) come da PRD 3.2
    const getNextSunday = (date: Date): Date => {
      const result = new Date(date);
      const day = result.getDay();
      const diff = day === 0 ? 0 : 7 - day; // Se è domenica, 0; altrimenti giorni fino a domenica
      result.setDate(result.getDate() + diff);
      result.setHours(23, 59, 59, 999);
      return result;
    };
    
    const endOfWeek = getNextSunday(today);
    const todayStr = today.toISOString().split('T')[0];
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

    console.log(`Generating weekly digest for period: ${todayStr} to ${endOfWeekStr} (end of week)`);

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
      const recipients: string[] = [];
      
      const { data: creatorAuth } = await supabase.auth.admin.getUserById(wedding.created_by);
      if (creatorAuth?.user?.email) {
        recipients.push(creatorAuth.user.email);
      }

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

      // Fetch tasks con vendor info
      const { data: tasksRaw } = await supabase
        .from("checklist_tasks")
        .select(`
          id, title, due_date, status, priority, category,
          vendors(name)
        `)
        .eq("wedding_id", wedding.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true });

      const tasks: Task[] = (tasksRaw || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        status: t.status,
        priority: t.priority,
        category: t.category,
        vendor_name: t.vendors?.name,
      }));

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
          .lte("due_date", endOfWeekStr)
          .order("due_date", { ascending: true });
        
        payments = paymentsData || [];
      }

      const overdueTasks = (tasks || []).filter(t => 
        t.due_date && new Date(t.due_date) < today
      );
      const upcomingTasks = (tasks || []).filter(t => 
        t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= endOfWeek
      );
      const mustTasks = (tasks || []).filter(t => t.priority === 'must');

      const overduePayments = payments.filter(p => 
        new Date(p.due_date) < today
      );
      const upcomingPayments = payments.filter(p => 
        new Date(p.due_date) >= today && new Date(p.due_date) <= endOfWeek
      );

      if (overdueTasks.length === 0 && upcomingTasks.length === 0 && 
          overduePayments.length === 0 && upcomingPayments.length === 0) {
        console.log(`No items to report for wedding ${wedding.id}`);
        continue;
      }

      const weddingDate = new Date(wedding.wedding_date);
      const daysUntilWedding = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const weddingName = `${wedding.partner1_name} & ${wedding.partner2_name}`;
      const appUrl = Deno.env.get("APP_URL") || "https://stenders.cloud";
      
      // Messaggio motivazionale casuale
      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      
      // Consiglio contestuale
      const weeklyTip = getTip(daysUntilWedding);

      const emailHtml = buildDigestEmail({
        weddingName,
        partnerName: wedding.partner1_name,
        daysUntilWedding,
        overdueTasks,
        upcomingTasks,
        mustTasks,
        overduePayments,
        upcomingPayments,
        appUrl,
        motivationalMessage: randomMessage,
        weeklyTip,
      });

      try {
        // Subject dinamico come da PRD 4.1
        const taskCount = overdueTasks.length + upcomingTasks.length + overduePayments.length + upcomingPayments.length;
        
        // In test mode, invia solo all'email di test
        const finalRecipients = testEmail ? [testEmail] : recipients;
        
        await resend.emails.send({
          from: "Matrimonio Senza Stress <info@stenders.cloud>",
          to: finalRecipients,
          subject: `📅 Il tuo piano settimanale: ${taskCount} attività per ${weddingName}`,
          html: emailHtml,
        });

        console.log(`Weekly digest sent to: ${finalRecipients.join(", ")} for wedding ${wedding.id}`);
        digestsSent++;
        
        // In test mode, esci dopo il primo invio
        if (testMode) {
          return new Response(
            JSON.stringify({ 
              message: `Test digest sent to ${testEmail || recipients[0]}`,
              wedding: weddingName,
              items: taskCount,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
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
  partnerName: string;
  daysUntilWedding: number;
  overdueTasks: Task[];
  upcomingTasks: Task[];
  mustTasks: Task[];
  overduePayments: Payment[];
  upcomingPayments: Payment[];
  appUrl: string;
  motivationalMessage: string;
  weeklyTip: string;
}

function buildDigestEmail({
  weddingName,
  partnerName,
  daysUntilWedding,
  overdueTasks,
  upcomingTasks,
  mustTasks,
  overduePayments,
  upcomingPayments,
  appUrl,
  motivationalMessage,
  weeklyTip,
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

  // Colori PRD
  const OVERDUE_COLOR = '#e53e3e';   // Rosso
  const UPCOMING_COLOR = '#667eea';   // Blu/Viola
  
  let sectionsHtml = '';
  const overdueCount = overdueTasks.length + overduePayments.length;

  // Sezione "Scaduti" - PRD 4.2
  if (overdueTasks.length > 0 || overduePayments.length > 0) {
    sectionsHtml += `
      <div style="background: #FEE2E2; border-left: 4px solid ${OVERDUE_COLOR}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="color: ${OVERDUE_COLOR}; margin: 0 0 10px 0;">⚠️ Scaduti (${overdueCount})</h3>
        ${overdueTasks.length > 0 ? `
          <p style="margin: 5px 0; color: #7F1D1D;"><strong>${overdueTasks.length}</strong> task scaduti</p>
        ` : ''}
        ${overduePayments.length > 0 ? `
          <p style="margin: 5px 0; color: #7F1D1D;"><strong>${overduePayments.length}</strong> pagamenti scaduti (${formatCurrency(overduePayments.reduce((sum, p) => sum + p.amount, 0))})</p>
        ` : ''}
      </div>
    `;
  }

  // Sezione "Questa Settimana" - PRD 4.2 con card arricchite
  if (upcomingTasks.length > 0) {
    sectionsHtml += `
      <div style="margin-bottom: 25px;">
        <h3 style="color: #374151; margin-bottom: 15px; border-bottom: 2px solid ${UPCOMING_COLOR}; padding-bottom: 8px;">
          📅 Questa Settimana (${upcomingTasks.length})
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${upcomingTasks.slice(0, 10).map(task => `
            <li style="padding: 12px; margin-bottom: 8px; background: #F9FAFB; border-radius: 8px; border-left: 3px solid ${UPCOMING_COLOR};">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <strong style="color: #1F2937; display: block;">${task.title}</strong>
                  ${task.vendor_name ? `<span style="font-size: 12px; color: ${UPCOMING_COLOR};">🏢 ${task.vendor_name}</span>` : ''}
                  ${task.category && !task.vendor_name ? `<span style="font-size: 12px; color: #9CA3AF;">📁 ${task.category}</span>` : ''}
                </div>
                <div style="text-align: right;">
                  ${task.priority ? `<span style="font-size: 11px; display: block;">${getPriorityBadge(task.priority)}</span>` : ''}
                  ${task.due_date ? `<span style="font-size: 12px; color: #6B7280;">📅 ${formatDate(task.due_date)}</span>` : ''}
                </div>
              </div>
            </li>
          `).join('')}
        </ul>
        ${upcomingTasks.length > 10 ? `
          <p style="color: #6B7280; font-size: 13px; text-align: center; margin-top: 10px;">
            +${upcomingTasks.length - 10} altre attività...
          </p>
        ` : ''}
      </div>
    `;
  }

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

  // Sezione "Consiglio della Settimana"
  const tipSection = `
    <div style="background: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #0369A1; font-size: 14px;">
        💡 <strong>Consiglio:</strong> ${weeklyTip}
      </p>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #F3F4F6;">
      
      <!-- Header con saluto personalizzato e messaggio motivazionale -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0 0 8px 0; font-size: 24px;">Buon lunedì, ${partnerName}! 👋</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 0 0 12px 0; font-size: 14px; font-style: italic;">${motivationalMessage}</p>
        <p style="color: rgba(255,255,255,0.95); margin: 0; font-size: 16px;">Ecco il punto della situazione per <strong>${weddingName}</strong></p>
      </div>
      
      <!-- Countdown -->
      <div style="background: white; padding: 20px; text-align: center; border-bottom: 1px solid #E5E7EB;">
        <div style="font-size: 48px; font-weight: bold; color: #667eea;">${daysUntilWedding}</div>
        <div style="font-size: 14px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px;">giorni al matrimonio</div>
      </div>
      
      <!-- Content -->
      <div style="background: white; padding: 25px;">
        ${sectionsHtml || '<p style="text-align: center; color: #6B7280;">Nessuna attività in programma questa settimana! 🎉</p>'}
        
        <!-- Tip della settimana -->
        ${tipSection}
        
        <!-- CTA principale -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          <a href="${appUrl}/app/checklist" 
             style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 25px; font-weight: 600; font-size: 15px;">
            Gestisci Checklist
          </a>
        </div>
        
        <!-- Link rapidi -->
        <div style="text-align: center; margin-top: 20px;">
          <a href="${appUrl}/app/checklist" style="margin: 0 10px; color: #667eea; text-decoration: none; font-size: 13px;">📋 Checklist</a>
          <a href="${appUrl}/app/vendors" style="margin: 0 10px; color: #667eea; text-decoration: none; font-size: 13px;">🏢 Fornitori</a>
          <a href="${appUrl}/app/treasury" style="margin: 0 10px; color: #667eea; text-decoration: none; font-size: 13px;">💰 Tesoreria</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #F9FAFB; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
        <p style="font-size: 12px; color: #9CA3AF; margin: 0 0 8px 0;">
          Ricevi questa email ogni lunedì perché sei un organizzatore del matrimonio ${weddingName}.
        </p>
        <a href="${appUrl}/app/settings?tab=notifications" style="color: #667eea; text-decoration: underline; font-size: 12px;">
          Modifica preferenze email
        </a>
        <p style="font-size: 11px; color: #D1D5DB; margin-top: 15px;">
          Inviato con ❤️ da Matrimonio Senza Stress
        </p>
      </div>
    </body>
    </html>
  `;
}
