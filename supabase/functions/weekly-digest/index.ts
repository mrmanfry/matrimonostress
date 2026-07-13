import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  assigned_to?: string | null;
}

interface Payment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  vendor_name?: string | null;
  installment_label?: string | null;
}

interface Appointment {
  id: string;
  title: string;
  appointment_date: string;
  appointment_time: string | null;
  location: string | null;
  purpose: string | null;
  vendor_name?: string;
}

interface RecipientInfo {
  email: string;
  user_id: string;
  partner_role: string | null;
  digest_enabled: boolean;
  first_name: string | null;
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
  const testWeddingId = url.searchParams.get("wedding_id"); // Wedding ID specifico per test

  // Validate cron secret - required for ALL invocations (test mode no longer bypasses auth)
  {
    const cronSecret = req.headers.get("X-Cron-Secret");
    const expectedSecret = Deno.env.get("CRON_SHARED_TOKEN") ?? Deno.env.get("CRON_SECRET");

    if (!expectedSecret || cronSecret !== expectedSecret) {
      console.error("Unauthorized cron request - invalid or missing secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  console.log(`Weekly digest invoked - testMode: ${testMode}, testEmail: ${testEmail || 'none'}, testWeddingId: ${testWeddingId || 'none'}`);

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

    let weddingsQuery = supabase
      .from("weddings")
      .select(`
        id,
        partner1_name,
        partner2_name,
        wedding_date,
        created_by,
        user_roles!wedding_id(
          user_id,
          role,
          partner_role
        )
      `)
      .gte("wedding_date", todayStr);
    
    // In test mode, filter by specific wedding if provided
    if (testMode && testWeddingId) {
      weddingsQuery = weddingsQuery.eq("id", testWeddingId);
    }
    
    const { data: weddings, error: weddingsError } = await weddingsQuery;

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
      // Collect recipient info with partner_role and digest preferences
      const recipientInfos: RecipientInfo[] = [];
      
      // Get creator info
      const { data: creatorAuth } = await supabase.auth.admin.getUserById(wedding.created_by);
      if (creatorAuth?.user?.email) {
        // Get creator's profile
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("digest_enabled, first_name")
          .eq("id", wedding.created_by)
          .single();
        
        // Get creator's role in this wedding
        const creatorRole = (wedding.user_roles || []).find((r: any) => r.user_id === wedding.created_by);
        
        if (creatorProfile?.digest_enabled !== false) {
          recipientInfos.push({
            email: creatorAuth.user.email,
            user_id: wedding.created_by,
            partner_role: creatorRole?.partner_role || null,
            digest_enabled: creatorProfile?.digest_enabled ?? true,
            first_name: creatorProfile?.first_name || null,
          });
        }
      }

      // Get other collaborators
      for (const role of wedding.user_roles || []) {
        if ((role.role === 'co_planner' || role.role === 'manager') && role.user_id !== wedding.created_by) {
          const { data: userAuth } = await supabase.auth.admin.getUserById(role.user_id);
          
          if (userAuth?.user?.email && !recipientInfos.find(r => r.email === userAuth.user.email)) {
            // Get user's profile
            const { data: userProfile } = await supabase
              .from("profiles")
              .select("digest_enabled, first_name")
              .eq("id", role.user_id)
              .single();
            
            if (userProfile?.digest_enabled !== false) {
              recipientInfos.push({
                email: userAuth.user.email,
                user_id: role.user_id,
                partner_role: role.partner_role || null,
                digest_enabled: userProfile?.digest_enabled ?? true,
                first_name: userProfile?.first_name || null,
              });
            }
          }
        }
      }

      if (recipientInfos.length === 0) {
        console.log(`No recipients with digest enabled for wedding ${wedding.id}`);
        continue;
      }

      // Fetch tasks con vendor info (una sola volta per wedding)
      const { data: tasksRaw } = await supabase
        .from("checklist_tasks")
        .select(`
          id, title, due_date, status, priority, category, assigned_to,
          vendors(name)
        `)
        .eq("wedding_id", wedding.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true });

      const allTasks: Task[] = (tasksRaw || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        status: t.status,
        priority: t.priority,
        category: t.category,
        assigned_to: t.assigned_to,
        vendor_name: t.vendors?.name,
      }));

      // Fetch payments (una sola volta per wedding) + vendor via expense_items
      const { data: expenseItems } = await supabase
        .from("expense_items")
        .select("id, description, vendor_id, vendors(name)")
        .eq("wedding_id", wedding.id);

      const expenseMap = new Map<string, { vendorName: string | null; expenseDesc: string | null }>();
      (expenseItems || []).forEach((e: any) => {
        expenseMap.set(e.id, {
          vendorName: e.vendors?.name ?? null,
          expenseDesc: e.description ?? null,
        });
      });
      const expenseIds = Array.from(expenseMap.keys());

      let allPayments: Payment[] = [];
      if (expenseIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("id, description, amount, due_date, status, expense_item_id")
          .in("expense_item_id", expenseIds)
          .eq("status", "Da Pagare")
          .lte("due_date", endOfWeekStr)
          .order("due_date", { ascending: true });

        allPayments = (paymentsData || []).map((p: any) => {
          const info = expenseMap.get(p.expense_item_id);
          return {
            id: p.id,
            description: p.description,
            amount: p.amount,
            due_date: p.due_date,
            status: p.status,
            vendor_name: info?.vendorName ?? info?.expenseDesc ?? null,
            installment_label: p.description ?? null,
          };
        });
      }

      // Fetch appointments for this week
      const { data: appointmentsRaw } = await supabase
        .from("vendor_appointments")
        .select(`
          id, title, appointment_date, appointment_time, location, purpose,
          vendors(name)
        `)
        .eq("wedding_id", wedding.id)
        .eq("status", "scheduled")
        .gte("appointment_date", todayStr)
        .lte("appointment_date", endOfWeekStr)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      const allAppointments: Appointment[] = (appointmentsRaw || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        appointment_date: a.appointment_date,
        appointment_time: a.appointment_time,
        location: a.location,
        purpose: a.purpose,
        vendor_name: a.vendors?.name,
      }));

      const weddingDate = new Date(wedding.wedding_date);
      const daysUntilWedding = Math.ceil((weddingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const weddingName = `${wedding.partner1_name} & ${wedding.partner2_name}`;
      const appUrl = Deno.env.get("APP_URL") || "https://stenders.cloud";

      // In test mode con email specifica, filtra per quell'utente
      let recipients = recipientInfos;
      if (testMode && testEmail) {
        recipients = recipientInfos.filter(r => r.email === testEmail);
        if (recipients.length === 0) {
          console.log(`Test email ${testEmail} not found in wedding ${wedding.id} recipients`);
          continue;
        }
      }

      // Invia email personalizzata a ogni destinatario
      for (const recipient of recipients) {
        // Filtra task per questo destinatario in base al partner_role
        let personalTasks = allTasks;
        let sharedTasks: Task[] = [];
        
        if (recipient.partner_role) {
          // Task assegnati a questo partner O task condivisi (assigned_to = null)
          personalTasks = allTasks.filter(t => 
            t.assigned_to === recipient.partner_role
          );
          sharedTasks = allTasks.filter(t => 
            t.assigned_to === null || t.assigned_to === ''
          );
        }

        const overdueTasks = personalTasks.filter(t => 
          t.due_date && new Date(t.due_date) < today
        );
        const upcomingTasks = personalTasks.filter(t => 
          t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= endOfWeek
        ).slice(0, 10); // Top 10

        const overdueSharedTasks = sharedTasks.filter(t => 
          t.due_date && new Date(t.due_date) < today
        );
        const upcomingSharedTasks = sharedTasks.filter(t => 
          t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= endOfWeek
        ).slice(0, 5); // Top 5 shared

        const overduePayments = allPayments.filter(p => 
          new Date(p.due_date) < today
        );
        const upcomingPayments = allPayments.filter(p => 
          new Date(p.due_date) >= today && new Date(p.due_date) <= endOfWeek
        );

        // Skip se non c'è nulla da segnalare per questo destinatario
        if (overdueTasks.length === 0 && upcomingTasks.length === 0 && 
            overdueSharedTasks.length === 0 && upcomingSharedTasks.length === 0 &&
            overduePayments.length === 0 && upcomingPayments.length === 0 &&
            allAppointments.length === 0) {
          console.log(`No items to report for ${recipient.email} in wedding ${wedding.id}`);
          continue;
        }

        // Messaggio motivazionale casuale
        const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        
        // Consiglio contestuale
        const weeklyTip = getTip(daysUntilWedding);

        // Nome personalizzato
        const recipientName = recipient.first_name || 
          (recipient.partner_role === 'partner1' ? wedding.partner1_name : 
           recipient.partner_role === 'partner2' ? wedding.partner2_name : 
           'Ciao');

        const formatDate = (s: string) =>
          new Date(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
        const formatCurrency = (n: number) =>
          new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

        const overduePaymentsAmount = overduePayments.reduce((s, p) => s + p.amount, 0);
        const paymentsTotalAmount = [...overduePayments, ...upcomingPayments]
          .reduce((s, p) => s + p.amount, 0);

        const templateData = {
          recipientName,
          weddingName,
          daysToWedding: daysUntilWedding,
          motivationalMessage: randomMessage,
          weeklyTip,
          hasPartnerRole: !!recipient.partner_role,
          overdueTasksCount: overdueTasks.length,
          overduePaymentsTotal: overduePaymentsAmount > 0 ? formatCurrency(overduePaymentsAmount) : '',
          upcomingTasks: upcomingTasks.map(t => ({
            title: t.title,
            dueDate: t.due_date ? formatDate(t.due_date) : null,
            priority: t.priority,
            vendorName: t.vendor_name ?? null,
            category: t.category ?? null,
          })),
          sharedTasks: [...overdueSharedTasks, ...upcomingSharedTasks].slice(0, 5).map(t => ({
            title: t.title,
            dueDate: t.due_date ? formatDate(t.due_date) : null,
            vendorName: t.vendor_name ?? null,
          })),
          payments: [...overduePayments, ...upcomingPayments].slice(0, 8).map(p => ({
            description: p.description,
            amount: formatCurrency(p.amount),
            dueDate: formatDate(p.due_date),
            overdue: new Date(p.due_date) < today,
          })),
          paymentsTotal: paymentsTotalAmount > 0 ? formatCurrency(paymentsTotalAmount) : '',
          appointments: allAppointments.map(a => ({
            title: a.title,
            date: formatDate(a.appointment_date),
            time: a.appointment_time ? a.appointment_time.slice(0, 5) : null,
            location: a.location,
            vendorName: a.vendor_name ?? null,
          })),
          dashboardUrl: `${appUrl}/app/checklist`,
        };

        try {
          const finalEmail = testEmail || recipient.email;
          const totalItems = overdueTasks.length + upcomingTasks.length +
                            overdueSharedTasks.length + upcomingSharedTasks.length +
                            overduePayments.length + upcomingPayments.length +
                            allAppointments.length;

          const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'weekly-digest',
              recipientEmail: finalEmail,
              idempotencyKey: `weekly-digest-${wedding.id}-${recipient.user_id}-${todayStr}`,
              templateData,
            },
          });

          if (sendErr) throw sendErr;

          console.log(`Weekly digest queued for: ${finalEmail} for wedding ${wedding.id}`);
          digestsSent++;

          if (testMode) {
            return new Response(
              JSON.stringify({
                message: `Test digest queued for ${finalEmail}`,
                wedding: weddingName,
                recipient: recipientName,
                partnerRole: recipient.partner_role,
                totalItems,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (emailError) {
          console.error(`Failed to queue digest for ${recipient.email}:`, emailError);
        }
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

