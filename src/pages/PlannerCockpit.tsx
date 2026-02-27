import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PlannerKPIs } from "@/components/planner/PlannerKPIs";
import { WeddingCard, WeddingCardData } from "@/components/planner/WeddingCard";
import { PlannerCalendar } from "@/components/planner/PlannerCalendar";
import { CrossWeddingFeed, FeedItem } from "@/components/planner/CrossWeddingFeed";
import { Button } from "@/components/ui/button";
import { Plus, KeyRound, LayoutGrid } from "lucide-react";
import { JoinWeddingDialog } from "@/components/workspace/JoinWeddingDialog";

export default function PlannerCockpit() {
  const { authState, switchWedding } = useAuth();
  const navigate = useNavigate();
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showJoin, setShowJoin] = useState(false);

  const weddings = authState.status === "authenticated" ? authState.weddings : [];
  const weddingIds = useMemo(() => weddings.map((w) => w.weddingId), [weddings]);

  // Fetch cross-wedding data in parallel
  const { data: crossData } = useQuery({
    queryKey: ["planner-cockpit", weddingIds],
    enabled: weddingIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const [tasksRes, paymentsRes, guestsRes] = await Promise.all([
        supabase
          .from("checklist_tasks")
          .select("id, wedding_id, title, status, due_date, priority")
          .in("wedding_id", weddingIds),
        supabase
          .from("payments")
          .select("id, amount, due_date, status, description, expense_item_id, expense_items!inner(wedding_id)")
          .eq("status", "Da Pagare")
          .in("expense_items.wedding_id", weddingIds),
        supabase
          .from("guests")
          .select("id, wedding_id, rsvp_status, is_couple_member, is_staff")
          .in("wedding_id", weddingIds),
      ]);

      return {
        tasks: tasksRes.data || [],
        payments: paymentsRes.data || [],
        guests: guestsRes.data || [],
      };
    },
  });

  const tasks = crossData?.tasks || [];
  const payments = crossData?.payments || [];
  const guests = crossData?.guests || [];

  // Build per-wedding card data
  const weddingCards: WeddingCardData[] = useMemo(() => {
    return weddings.map((w) => {
      const wGuests = guests.filter((g) => g.wedding_id === w.weddingId && !g.is_couple_member && !g.is_staff);
      const wTasks = tasks.filter((t) => t.wedding_id === w.weddingId);
      const wPayments = payments.filter((p: any) => p.expense_items?.wedding_id === w.weddingId);

      return {
        wedding: w,
        guestCount: wGuests.length,
        confirmedGuests: wGuests.filter((g) => g.rsvp_status === "confirmed").length,
        totalTasks: wTasks.length,
        completedTasks: wTasks.filter((t) => t.status === "completed").length,
        pendingPayments: wPayments.length,
      };
    });
  }, [weddings, guests, tasks, payments]);

  // KPI counts
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const urgentTasksCount = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === "completed") return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) <= now;
    }).length;
  }, [tasks]);

  const upcomingPaymentsCount = useMemo(() => {
    return payments.filter((p) => {
      const d = new Date(p.due_date);
      return d <= thirtyDaysFromNow;
    }).length;
  }, [payments]);

  // Build feed items
  const feedItems: FeedItem[] = useMemo(() => {
    const weddingIndexMap = new Map(weddings.map((w, i) => [w.weddingId, i]));
    const weddingLabelMap = new Map(
      weddings.map((w) => [w.weddingId, `${w.partner1Name} & ${w.partner2Name}`])
    );

    const taskItems: FeedItem[] = tasks
      .filter((t) => t.status !== "completed" && t.due_date)
      .map((t) => ({
        id: t.id,
        type: "task" as const,
        title: t.title,
        dueDate: t.due_date!,
        weddingLabel: weddingLabelMap.get(t.wedding_id) || "",
        weddingColorIndex: weddingIndexMap.get(t.wedding_id) || 0,
        weddingId: t.wedding_id,
      }));

    const paymentItems: FeedItem[] = payments.map((p: any) => ({
      id: p.id,
      type: "payment" as const,
      title: p.description,
      dueDate: p.due_date,
      weddingLabel: weddingLabelMap.get(p.expense_items?.wedding_id) || "",
      weddingColorIndex: weddingIndexMap.get(p.expense_items?.wedding_id) || 0,
      weddingId: p.expense_items?.wedding_id || "",
      amount: p.amount,
    }));

    return [...taskItems, ...paymentItems].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [tasks, payments, weddings]);

  const handleOpenWedding = (weddingId: string) => {
    switchWedding(weddingId);
    navigate("/app/dashboard");
  };

  const handleFeedNavigate = (weddingId: string, type: "task" | "payment") => {
    switchWedding(weddingId);
    navigate(type === "task" ? "/app/checklist" : "/app/treasury");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <LayoutGrid className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold">Cockpit Planner</h1>
            <p className="text-xs text-muted-foreground">Panoramica su tutti i tuoi matrimoni</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowJoin(true)}>
            <KeyRound className="w-4 h-4 mr-1.5" /> Unisciti
          </Button>
          <Button size="sm" onClick={() => navigate("/onboarding")}>
            <Plus className="w-4 h-4 mr-1.5" /> Nuovo Matrimonio
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <PlannerKPIs
        weddings={weddings}
        urgentTasksCount={urgentTasksCount}
        upcomingPaymentsCount={upcomingPaymentsCount}
      />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Calendar */}
        <div className="lg:col-span-1">
          <PlannerCalendar
            weddings={weddings}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
          />
        </div>

        {/* Right: Wedding cards */}
        <div className="lg:col-span-2">
          <h3 className="font-serif font-semibold text-sm mb-3">I Tuoi Matrimoni</h3>
          {weddingCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun matrimonio trovato. Creane uno o unisciti con un codice.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {weddingCards.map((data, i) => (
                <WeddingCard
                  key={data.wedding.weddingId}
                  data={data}
                  colorIndex={i}
                  onOpen={handleOpenWedding}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <CrossWeddingFeed items={feedItems} onNavigate={handleFeedNavigate} />

      {/* Join dialog */}
      <JoinWeddingDialog open={showJoin} onOpenChange={setShowJoin} />
    </div>
  );
}
