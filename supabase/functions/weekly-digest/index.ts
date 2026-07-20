import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") || "https://wedsapp.it";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------- Types ----------
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

type AreaPermission = { view: boolean; edit: boolean; create: boolean };
type PermissionsConfig = Record<string, AreaPermission>;

interface RecipientAggregate {
  email: string;
  user_id: string;
  first_name: string | null;
  digest_enabled: boolean;
  weddings: WeddingBlock[];
}

interface WeddingBlock {
  wedding_id: string;
  wedding_name: string;
  wedding_date: string;
  days_to_wedding: number;
  role: string;
  partner_role: string | null;
  permissions_config: PermissionsConfig | null;
  // filtered payloads
  overdue_tasks: Task[];
  upcoming_tasks: Task[];
  shared_tasks: Task[];
  payments: Payment[];      // overdue + upcoming, marked
  appointments: Appointment[];
  // flags
  can_finance: boolean;
  can_appointments: boolean;
  can_checklist: boolean;
}

// ---------- Copy ----------
const motivationalMessages = [
  "Un passo alla volta, sei sulla strada giusta.",
  "Ogni dettaglio conta. Ci sei quasi.",
  "Il matrimonio perfetto si costruisce settimana dopo settimana.",
  "Respira, pianifica, conquista.",
  "Buona settimana di lavoro.",
];

const getTip = (days: number): string => {
  if (days > 180) return "È il momento perfetto per bloccare i fornitori chiave: i migliori si prenotano con largo anticipo.";
  if (days > 90) return "Inizia a pensare alle partecipazioni e al Save the Date.";
  if (days > 60) return "Conferma tutti i dettagli con i fornitori e inizia a raccogliere le conferme RSVP.";
  if (days > 30) return "Ultimo mese di preparativi. Verifica pagamenti finali e conferme.";
  if (days > 7) return "Ultima settimana: goditi il momento.";
  return "Il grande giorno è quasi arrivato.";
};

// ---------- Permissions ----------
function isPrivileged(role: string | null | undefined) {
  return role === "co_planner" || role === "planner";
}
function canView(role: string, cfg: PermissionsConfig | null, area: string): boolean {
  if (isPrivileged(role)) return true;
  if (!cfg) return false;
  return !!cfg[area]?.view;
}

// ---------- Handler ----------
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const testMode = url.searchParams.get("test") === "true";
  const testEmail = url.searchParams.get("email");
  const testUserId = url.searchParams.get("user_id");

  const cronSecret = req.headers.get("X-Cron-Secret");
  const expectedSecret = Deno.env.get("CRON_SHARED_TOKEN") ?? Deno.env.get("CRON_SECRET");
  if (!expectedSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = new Date();
    const getNextSunday = (d: Date) => {
      const r = new Date(d);
      const day = r.getDay();
      r.setDate(r.getDate() + (day === 0 ? 0 : 7 - day));
      r.setHours(23, 59, 59, 999);
      return r;
    };
    const endOfWeek = getNextSunday(today);
    const todayStr = today.toISOString().split("T")[0];
    const endOfWeekStr = endOfWeek.toISOString().split("T")[0];

    // Fetch all active weddings with their roles
    const { data: weddings, error: wErr } = await supabase
      .from("weddings")
      .select(`
        id, partner1_name, partner2_name, wedding_date, created_by,
        user_roles!wedding_id ( user_id, role, partner_role, permissions_config )
      `)
      .gte("wedding_date", todayStr);

    if (wErr) throw wErr;
    if (!weddings?.length) {
      return new Response(JSON.stringify({ message: "No active weddings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregator: user_id -> RecipientAggregate
    const aggregates = new Map<string, RecipientAggregate>();
    // Email cache to dedup people with same email but different accounts is impossible;
    // dedup by user_id here — one email per authenticated user identity.

    for (const wedding of weddings) {
      const weddingName = `${wedding.partner1_name} & ${wedding.partner2_name}`;
      const wedDate = new Date(wedding.wedding_date);
      const daysToWedding = Math.ceil((wedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Determine relevant roles for this wedding
      const roleRows: Array<{ user_id: string; role: string; partner_role: string | null; permissions_config: any }> = [];

      // Include creator via user_roles (always present since assign_co_planner_role trigger)
      for (const r of (wedding.user_roles || []) as any[]) {
        // Only include roles that logically receive a digest: co_planner, planner, manager
        if (r.role === "co_planner" || r.role === "planner" || r.role === "manager") {
          roleRows.push({
            user_id: r.user_id,
            role: r.role,
            partner_role: r.partner_role || null,
            permissions_config: r.permissions_config || null,
          });
        }
      }

      if (roleRows.length === 0) continue;

      // Fetch tasks (pending) once per wedding
      const { data: tasksRaw } = await supabase
        .from("checklist_tasks")
        .select(`id, title, due_date, status, priority, category, assigned_to, vendors(name)`)
        .eq("wedding_id", wedding.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true });
      const allTasks: Task[] = (tasksRaw || []).map((t: any) => ({
        id: t.id, title: t.title, due_date: t.due_date, status: t.status,
        priority: t.priority, category: t.category, assigned_to: t.assigned_to,
        vendor_name: t.vendors?.name,
      }));

      // Fetch payments (pending) once per wedding
      const { data: expenseItems } = await supabase
        .from("expense_items")
        .select("id, description, vendor_id, vendors(name)")
        .eq("wedding_id", wedding.id);
      const expenseMap = new Map<string, { vendorName: string | null; expenseDesc: string | null }>();
      (expenseItems || []).forEach((e: any) => {
        expenseMap.set(e.id, { vendorName: e.vendors?.name ?? null, expenseDesc: e.description ?? null });
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
            id: p.id, description: p.description, amount: Number(p.amount) || 0,
            due_date: p.due_date, status: p.status,
            vendor_name: info?.vendorName ?? info?.expenseDesc ?? null,
            installment_label: p.description ?? null,
          };
        });
      }

      // Fetch appointments (this week)
      const { data: apRaw } = await supabase
        .from("vendor_appointments")
        .select(`id, title, appointment_date, appointment_time, location, purpose, vendors(name)`)
        .eq("wedding_id", wedding.id)
        .eq("status", "scheduled")
        .gte("appointment_date", todayStr)
        .lte("appointment_date", endOfWeekStr)
        .order("appointment_date", { ascending: true });
      const allAppointments: Appointment[] = (apRaw || []).map((a: any) => ({
        id: a.id, title: a.title, appointment_date: a.appointment_date,
        appointment_time: a.appointment_time, location: a.location, purpose: a.purpose,
        vendor_name: a.vendors?.name,
      }));

      // Build a block per role, respecting SoD
      for (const rr of roleRows) {
        const cfg: PermissionsConfig | null = rr.permissions_config;
        const canChecklist = canView(rr.role, cfg, "checklist");
        const canBudget = canView(rr.role, cfg, "budget");
        const canVendorCosts = canView(rr.role, cfg, "vendor_costs");
        const canFinance = canBudget && canVendorCosts;
        const canAppointments = canView(rr.role, cfg, "vendors");

        // Task filtering
        let personalTasks: Task[] = [];
        let sharedTasks: Task[] = [];
        if (canChecklist) {
          if (isPrivileged(rr.role)) {
            // full view; personal = assigned to my partner_role (if any) or all if no partner_role
            if (rr.partner_role) {
              personalTasks = allTasks.filter(t => t.assigned_to === rr.partner_role || t.assigned_to === "both");
              sharedTasks = allTasks.filter(t => !t.assigned_to);
            } else {
              personalTasks = allTasks;
              sharedTasks = [];
            }
          } else {
            // manager: only shared tasks (assigned_to matches strings partner1/partner2/both, not user_id)
            personalTasks = [];
            sharedTasks = allTasks.filter(t => !t.assigned_to);
          }
        }

        const overdueTasks = personalTasks.filter(t => t.due_date && new Date(t.due_date) < today);
        const upcomingTasks = personalTasks
          .filter(t => t.due_date && new Date(t.due_date) >= today && new Date(t.due_date) <= endOfWeek)
          .slice(0, 10);
        const filteredSharedTasks = sharedTasks
          .filter(t => t.due_date && new Date(t.due_date) <= endOfWeek)
          .slice(0, 8);

        const payments = canFinance ? allPayments : [];
        const appointments = canAppointments ? allAppointments : [];

        // Skip block if nothing to say for this recipient on this wedding
        const hasContent =
          overdueTasks.length + upcomingTasks.length + filteredSharedTasks.length +
          payments.length + appointments.length > 0;
        if (!hasContent) continue;

        // Fetch email + profile (cache by user)
        let agg = aggregates.get(rr.user_id);
        if (!agg) {
          const { data: userAuth } = await supabase.auth.admin.getUserById(rr.user_id);
          const email = userAuth?.user?.email;
          if (!email) continue;

          const { data: prof } = await supabase
            .from("profiles")
            .select("digest_enabled, first_name")
            .eq("id", rr.user_id)
            .single();
          if (prof?.digest_enabled === false) continue;

          agg = {
            email,
            user_id: rr.user_id,
            first_name: prof?.first_name || null,
            digest_enabled: prof?.digest_enabled ?? true,
            weddings: [],
          };
          aggregates.set(rr.user_id, agg);
        }

        agg.weddings.push({
          wedding_id: wedding.id,
          wedding_name: weddingName,
          wedding_date: wedding.wedding_date,
          days_to_wedding: daysToWedding,
          role: rr.role,
          partner_role: rr.partner_role,
          permissions_config: cfg,
          overdue_tasks: overdueTasks,
          upcoming_tasks: upcomingTasks,
          shared_tasks: filteredSharedTasks,
          payments,
          appointments,
          can_finance: canFinance,
          can_appointments: canAppointments,
          can_checklist: canChecklist,
        });
      }
    }

    // Test-mode filter
    let toSend = Array.from(aggregates.values());
    if (testMode) {
      if (testUserId) toSend = toSend.filter(a => a.user_id === testUserId);
      if (testEmail) toSend = toSend.filter(a => a.email === testEmail);
    }

    // Format & send
    const formatDate = (s: string) =>
      new Date(s).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    const formatCurrency = (n: number) =>
      new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

    let sent = 0;
    for (const agg of toSend) {
      if (agg.weddings.length === 0) continue;

      // Sort weddings by days_to_wedding asc
      agg.weddings.sort((a, b) => a.days_to_wedding - b.days_to_wedding);

      const nearest = agg.weddings[0];
      const randomMsg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      const weeklyTip = getTip(nearest.days_to_wedding);

      const weddingsPayload = agg.weddings.map(w => {
        const overduePayments = w.payments.filter(p => new Date(p.due_date) < today);
        const upcomingPayments = w.payments.filter(p => new Date(p.due_date) >= today);
        const overduePaymentsAmount = overduePayments.reduce((s, p) => s + p.amount, 0);
        const paymentsTotalAmount = w.payments.reduce((s, p) => s + p.amount, 0);

        return {
          weddingName: w.wedding_name,
          daysToWedding: w.days_to_wedding,
          role: w.role,
          hasPartnerRole: !!w.partner_role,
          canFinance: w.can_finance,
          canAppointments: w.can_appointments,
          canChecklist: w.can_checklist,
          overdueTasksCount: w.overdue_tasks.length,
          overduePaymentsTotal: w.can_finance && overduePaymentsAmount > 0 ? formatCurrency(overduePaymentsAmount) : "",
          upcomingTasks: w.upcoming_tasks.map(t => ({
            title: t.title,
            dueDate: t.due_date ? formatDate(t.due_date) : null,
            priority: t.priority,
            vendorName: t.vendor_name ?? null,
            category: t.category ?? null,
          })),
          sharedTasks: w.shared_tasks.map(t => ({
            title: t.title,
            dueDate: t.due_date ? formatDate(t.due_date) : null,
            vendorName: t.vendor_name ?? null,
          })),
          payments: w.can_finance ? [...overduePayments, ...upcomingPayments].slice(0, 8).map(p => ({
            description: p.description,
            amount: formatCurrency(p.amount),
            dueDate: formatDate(p.due_date),
            overdue: new Date(p.due_date) < today,
            vendorName: p.vendor_name ?? null,
            installmentLabel: p.installment_label ?? null,
          })) : [],
          paymentsTotal: w.can_finance && paymentsTotalAmount > 0 ? formatCurrency(paymentsTotalAmount) : "",
          appointments: w.appointments.map(a => ({
            title: a.title,
            date: formatDate(a.appointment_date),
            time: a.appointment_time ? a.appointment_time.slice(0, 5) : null,
            location: a.location,
            vendorName: a.vendor_name ?? null,
          })),
        };
      });

      const templateData = {
        recipientName: agg.first_name || "Ciao",
        motivationalMessage: randomMsg,
        weeklyTip,
        dashboardUrl: `${appUrl}/app/checklist`,
        weddings: weddingsPayload,
      };

      try {
        const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "weekly-digest",
            recipientEmail: agg.email,
            idempotencyKey: `weekly-digest-${agg.user_id}-${todayStr}`,
            templateData,
          },
        });
        if (sendErr) throw sendErr;
        sent++;
        console.log(`Weekly digest queued for ${agg.email} — ${agg.weddings.length} wedding(s)`);

        if (testMode) {
          return new Response(JSON.stringify({
            message: `Test digest queued for ${agg.email}`,
            weddings: agg.weddings.length,
            payload: templateData,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (e) {
        console.error(`Failed to send to ${agg.email}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sent} weekly digest(s)`, recipients: toSend.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Weekly digest error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
