import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGuestMetrics } from "@/hooks/useGuestMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Users,
  Euro,
  Package,
  CheckSquare,
  ChevronRight,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Insights — Vista strategica "salute del matrimonio"
 *
 * Principio: 4 moduli verticali, ogni modulo risponde a UNA domanda
 * e propone UNA azione operativa. Niente health score numerico, niente chart.
 */
const Insights = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const weddingId = authState.status === "authenticated" ? authState.activeWeddingId : null;

  const guestMetrics = useGuestMetrics();

  const [loading, setLoading] = useState(true);
  const [wedding, setWedding] = useState<{
    partner1_name: string;
    partner2_name: string;
    wedding_date: string;
    budget_estimated: number | null;
  } | null>(null);
  const [budgetSpent, setBudgetSpent] = useState(0);
  const [nextPayment, setNextPayment] = useState<{
    description: string;
    due_date: string;
    amount: number;
  } | null>(null);
  const [vendorTotal, setVendorTotal] = useState(0);
  const [vendorConfirmed, setVendorConfirmed] = useState(0);
  const [nextAppointment, setNextAppointment] = useState<{
    title: string;
    appointment_date: string;
  } | null>(null);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskCompleted, setTaskCompleted] = useState(0);
  const [criticalTasks, setCriticalTasks] = useState<
    { id: string; title: string; due_date: string | null }[]
  >([]);

  useEffect(() => {
    if (!weddingId) return;
    const load = async () => {
      setLoading(true);
      try {
        const todayIso = new Date().toISOString().slice(0, 10);

        const [weddingRes, paymentsRes, vendorsRes, apptsRes, tasksRes] = await Promise.all([
          supabase
            .from("weddings")
            .select("partner1_name, partner2_name, wedding_date, budget_estimated")
            .eq("id", weddingId)
            .single(),
          supabase
            .from("payments")
            .select("description, due_date, amount, status, expense_items!inner(wedding_id)")
            .eq("expense_items.wedding_id", weddingId),
          supabase
            .from("vendors")
            .select("id, status")
            .eq("wedding_id", weddingId),
          supabase
            .from("vendor_appointments")
            .select("title, appointment_date")
            .eq("wedding_id", weddingId)
            .gte("appointment_date", todayIso)
            .order("appointment_date", { ascending: true })
            .limit(1),
          supabase
            .from("checklist_tasks")
            .select("id, title, due_date, status")
            .eq("wedding_id", weddingId),
        ]);

        if (weddingRes.data) setWedding(weddingRes.data as any);

        if (paymentsRes.data) {
          const paid = paymentsRes.data
            .filter((p: any) => p.status === "paid")
            .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
          setBudgetSpent(paid);

          const upcoming = paymentsRes.data
            .filter((p: any) => p.status !== "paid" && p.due_date >= todayIso)
            .sort((a: any, b: any) => a.due_date.localeCompare(b.due_date))[0];
          if (upcoming) {
            setNextPayment({
              description: upcoming.description,
              due_date: upcoming.due_date,
              amount: Number(upcoming.amount || 0),
            });
          }
        }

        if (vendorsRes.data) {
          setVendorTotal(vendorsRes.data.length);
          setVendorConfirmed(vendorsRes.data.filter((v: any) => v.status === "confirmed").length);
        }

        if (apptsRes.data && apptsRes.data.length > 0) {
          setNextAppointment(apptsRes.data[0] as any);
        }

        if (tasksRes.data) {
          setTaskTotal(tasksRes.data.length);
          setTaskCompleted(tasksRes.data.filter((t: any) => t.status === "completed").length);
          const critical = tasksRes.data
            .filter((t: any) => t.status !== "completed" && t.due_date)
            .sort((a: any, b: any) => (a.due_date || "").localeCompare(b.due_date || ""))
            .slice(0, 3) as any;
          setCriticalTasks(critical);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [weddingId]);

  if (loading || guestMetrics.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calcoli derivati
  const daysUntil = wedding
    ? Math.max(
        0,
        Math.ceil(
          (new Date(wedding.wedding_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const greeting = (() => {
    if (daysUntil === 0) return "È oggi! Respira.";
    if (daysUntil <= 7) return "Ultima settimana — sei quasi arrivato.";
    if (daysUntil <= 30) return "Manca un mese. Tutto sotto controllo.";
    if (daysUntil <= 90) return "Tre mesi al traguardo.";
    if (daysUntil <= 180) return "Hai tempo, prosegui con calma.";
    return "Tanto tempo davanti, nessuna fretta.";
  })();

  const totalRegular = guestMetrics.confirmedCount + guestMetrics.pendingCount + guestMetrics.declinedCount;
  const rsvpConfirmedPct = totalRegular > 0 ? (guestMetrics.confirmedCount / totalRegular) * 100 : 0;
  const rsvpDeclinedPct = totalRegular > 0 ? (guestMetrics.declinedCount / totalRegular) * 100 : 0;
  const rsvpPendingPct = Math.max(0, 100 - rsvpConfirmedPct - rsvpDeclinedPct);

  const budgetTotal = wedding?.budget_estimated || 0;
  const budgetPct = budgetTotal > 0 ? Math.min(100, (budgetSpent / budgetTotal) * 100) : 0;

  const taskPct = taskTotal > 0 ? (taskCompleted / taskTotal) * 100 : 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header / saluto */}
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Insights</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          {wedding ? `${wedding.partner1_name} & ${wedding.partner2_name}` : "Il tuo matrimonio"}
        </h1>
        <p className="text-muted-foreground">
          {daysUntil > 0 ? (
            <>
              Mancano <strong className="text-foreground">{daysUntil}</strong> giorni — {greeting}
            </>
          ) : (
            greeting
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* RSVP */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-muted-foreground" />
              RSVP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">
                {guestMetrics.confirmedCount}
              </span>
              <span className="text-sm text-muted-foreground">
                confermati su {totalRegular}
              </span>
            </div>
            {totalRegular > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted flex">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${rsvpConfirmedPct}%` }}
                />
                <div
                  className="h-full bg-muted-foreground/30"
                  style={{ width: `${rsvpPendingPct}%` }}
                />
                <div
                  className="h-full bg-destructive/60"
                  style={{ width: `${rsvpDeclinedPct}%` }}
                />
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {guestMetrics.pendingCount} in attesa · {guestMetrics.declinedCount} rifiutati
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between -mx-2"
              onClick={() => navigate("/app/guests")}
            >
              Vai a invitati
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Euro className="w-4 h-4 text-muted-foreground" />
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">
                €{budgetSpent.toLocaleString("it-IT")}
              </span>
              {budgetTotal > 0 && (
                <span className="text-sm text-muted-foreground">
                  di €{budgetTotal.toLocaleString("it-IT")}
                </span>
              )}
            </div>
            {budgetTotal > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full transition-all",
                    budgetPct > 100 ? "bg-destructive" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(100, budgetPct)}%` }}
                />
              </div>
            )}
            <div className="text-xs text-muted-foreground min-h-[1rem]">
              {nextPayment ? (
                <>
                  Prossimo:{" "}
                  <span className="text-foreground">
                    {nextPayment.description} · €{nextPayment.amount.toLocaleString("it-IT")} il{" "}
                    {formatDate(nextPayment.due_date)}
                  </span>
                </>
              ) : (
                "Nessun pagamento in scadenza"
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between -mx-2"
              onClick={() => navigate("/app/treasury")}
            >
              Vai a tesoreria
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Vendors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-muted-foreground" />
              Fornitori
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">
                {vendorConfirmed}
              </span>
              <span className="text-sm text-muted-foreground">
                confermati su {vendorTotal}
              </span>
            </div>
            <div className="text-xs text-muted-foreground min-h-[1rem] flex items-center gap-1.5">
              {nextAppointment ? (
                <>
                  <CalendarIcon className="w-3 h-3" />
                  Prossimo appuntamento:{" "}
                  <span className="text-foreground">
                    {nextAppointment.title} · {formatDate(nextAppointment.appointment_date)}
                  </span>
                </>
              ) : (
                "Nessun appuntamento in calendario"
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between -mx-2"
              onClick={() => navigate("/app/vendors")}
            >
              Vai a fornitori
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
              Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">
                {taskCompleted}
              </span>
              <span className="text-sm text-muted-foreground">
                completati su {taskTotal}
              </span>
            </div>
            {taskTotal > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${taskPct}%` }}
                />
              </div>
            )}
            {criticalTasks.length > 0 ? (
              <ul className="text-xs text-muted-foreground space-y-1">
                {criticalTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-foreground">{t.title}</span>
                    {t.due_date && (
                      <span className="text-muted-foreground shrink-0">
                        {formatDate(t.due_date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nessun task urgente.</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between -mx-2"
              onClick={() => navigate("/app/checklist")}
            >
              Vai a checklist
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Insights;
