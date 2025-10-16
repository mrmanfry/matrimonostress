import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Euro, Calendar, CheckSquare, AlertCircle, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

interface Wedding {
  id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string;
  total_budget: number | null;
}

interface DashboardStats {
  guestsTotal: number;
  guestsConfirmed: number;
  adultsConfirmed: number;
  childrenConfirmed: number;
  guestsPending: number;
  guestsDeclined: number;
  budgetTotal: number;
  budgetSpent: number;
  budgetPaid: number;
  budgetToBePaid: number;
  budgetRemaining: number;
  tasksTotal: number;
  tasksCompleted: number;
  urgentPayments: any[];
  urgentTasks: any[];
}

const Dashboard = () => {
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysUntilWedding, setDaysUntilWedding] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load wedding
      const { data: weddingData, error: weddingError } = await supabase
        .from("weddings")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();

      if (weddingError) throw weddingError;

      if (!weddingData) {
        navigate("/onboarding");
        return;
      }

      setWedding(weddingData);

      // Calculate days until wedding
      const weddingDate = new Date(weddingData.wedding_date);
      const today = new Date();
      const diffTime = weddingDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysUntilWedding(diffDays);

      // Load stats with payments
      const [guestsResponse, expensesResponse, tasksResponse, paymentsResponse] = await Promise.all([
        supabase.from("guests").select("*").eq("wedding_id", weddingData.id),
        supabase.from("expenses").select("*").eq("wedding_id", weddingData.id),
        supabase.from("checklist_tasks").select("*").eq("wedding_id", weddingData.id),
        supabase.from("payments").select("*, expenses!inner(wedding_id)").eq("expenses.wedding_id", weddingData.id),
      ]);

      const guests = guestsResponse.data || [];
      const expenses = expensesResponse.data || [];
      const tasks = tasksResponse.data || [];
      const payments = paymentsResponse.data || [];

      const guestsConfirmed = guests.filter(g => g.rsvp_status === 'confirmed');
      const totalAdultsConfirmed = guestsConfirmed.reduce((sum, g) => sum + (g.adults_count || 0), 0);
      const totalChildrenConfirmed = guestsConfirmed.reduce((sum, g) => sum + (g.children_count || 0), 0);

      const totalSpent = expenses.reduce((sum, e) => sum + Number(e.final_amount || e.estimated_amount || 0), 0);
      const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
      const totalToBePaid = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0);

      setStats({
        guestsTotal: guests.reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        guestsConfirmed: totalAdultsConfirmed + totalChildrenConfirmed,
        adultsConfirmed: totalAdultsConfirmed,
        childrenConfirmed: totalChildrenConfirmed,
        guestsPending: guests.filter(g => g.rsvp_status === 'pending').reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        guestsDeclined: guests.filter(g => g.rsvp_status === 'declined').reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        budgetTotal: weddingData.total_budget || 0,
        budgetSpent: totalSpent,
        budgetPaid: totalPaid,
        budgetToBePaid: totalToBePaid,
        budgetRemaining: (weddingData.total_budget || 0) - totalSpent,
        tasksTotal: tasks.length,
        tasksCompleted: tasks.filter(t => t.status === 'completed').length,
        urgentPayments: payments.filter(p => {
          if (p.status === 'paid') return false;
          const daysUntil = Math.ceil((new Date(p.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil <= 7;
        }).slice(0, 3),
        urgentTasks: tasks.filter(t => {
          if (t.status === 'completed' || !t.due_date) return false;
          const daysUntil = Math.ceil((new Date(t.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysUntil <= 7;
        }).slice(0, 3),
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Heart className="w-12 h-12 text-accent fill-accent animate-pulse" />
      </div>
    );
  }

  if (!wedding || !stats) {
    return null;
  }

  // Pie chart data for RSVP
  const rsvpChartData = [
    { name: "Confermati", value: stats.guestsConfirmed, color: "#10b981" },
    { name: "In attesa", value: stats.guestsPending, color: "#3b82f6" },
    { name: "Rifiutati", value: stats.guestsDeclined, color: "#6b7280" },
  ];

  const budgetPercentage = stats.budgetTotal > 0 ? (stats.budgetSpent / stats.budgetTotal) * 100 : 0;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header con Countdown centrale */}
      <Card className="p-6 lg:p-8 bg-gradient-hero border-2 border-accent/30">
        <div className="text-center space-y-3">
          <h1 className="text-3xl lg:text-4xl font-bold">
            {wedding.partner1_name} & {wedding.partner2_name}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <Calendar className="w-8 h-8 text-accent" />
            <div className="text-5xl lg:text-7xl font-bold text-accent">
              {daysUntilWedding !== null && daysUntilWedding > 0 ? daysUntilWedding : 0}
            </div>
          </div>
          <p className="text-xl font-semibold">
            {daysUntilWedding !== null && daysUntilWedding > 0 
              ? `giorni al vostro matrimonio` 
              : daysUntilWedding === 0
              ? "È oggi! Auguri! 🎉"
              : "Il matrimonio è già stato"}
          </p>
          <p className="text-sm text-muted-foreground">
            {new Date(wedding.wedding_date).toLocaleDateString("it-IT", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </Card>

      {/* Widget Grid 2x2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Widget 1: Riepilogo Invitati con Grafico */}
        <Card 
          className="p-6 hover:shadow-elegant transition-all cursor-pointer"
          onClick={() => navigate("/app/guests")}
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-accent" />
            <h3 className="text-xl font-semibold">Riepilogo Invitati</h3>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="w-full lg:w-1/2 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rsvpChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {rsvpChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-3">
              <div className="text-center lg:text-left">
                <div className="text-4xl font-bold text-accent">
                  {stats.guestsConfirmed}
                </div>
                <div className="text-sm text-muted-foreground">Posti Confermati</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center p-2 rounded bg-muted/30">
                  <div className="font-bold">{stats.adultsConfirmed}</div>
                  <div className="text-muted-foreground">Adulti</div>
                </div>
                <div className="text-center p-2 rounded bg-muted/30">
                  <div className="font-bold">{stats.childrenConfirmed}</div>
                  <div className="text-muted-foreground">Bambini</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Widget 2: Stato Budget con Barra */}
        <Card 
          className="p-6 hover:shadow-elegant transition-all cursor-pointer"
          onClick={() => navigate("/app/budget")}
        >
          <div className="flex items-center gap-2 mb-4">
            <Euro className="w-6 h-6 text-gold" />
            <h3 className="text-xl font-semibold">Stato del Budget</h3>
          </div>

          <div className="space-y-4">
            <div className="relative h-12 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-gradient-to-r from-gold to-gold/80 transition-all duration-500 flex items-center justify-end pr-4"
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              >
                {budgetPercentage > 20 && (
                  <span className="text-sm font-bold text-white">
                    €{Math.round(stats.budgetSpent).toLocaleString("it-IT")}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <span className="text-xs font-medium">€0</span>
                <span className="text-xs font-medium">
                  €{stats.budgetTotal.toLocaleString("it-IT")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Ancora da Pagare</div>
                <div className="text-xl font-bold text-orange-600">
                  €{Math.round(stats.budgetToBePaid).toLocaleString("it-IT")}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Liquidità Rimanente</div>
                <div className="text-xl font-bold text-green-600">
                  €{Math.round(stats.budgetRemaining).toLocaleString("it-IT")}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Widget 3: Azioni Urgenti */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-xl font-semibold">Azioni Urgenti</h3>
          </div>

          <div className="space-y-4">
            {/* Prossimi Pagamenti */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Prossimi Pagamenti
              </h4>
              {stats.urgentPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun pagamento urgente</p>
              ) : (
                <ul className="space-y-2">
                  {stats.urgentPayments.map((payment: any) => {
                    const daysUntil = Math.ceil((new Date(payment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <li 
                        key={payment.id} 
                        className="text-sm flex items-start justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate("/app/budget")}
                      >
                        <span className="flex-1">
                          {payment.description} - €{payment.amount.toLocaleString("it-IT")}
                        </span>
                        <Badge variant={daysUntil < 0 ? "destructive" : "secondary"} className="ml-2">
                          {daysUntil < 0 ? "Scaduto" : `${daysUntil}g`}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Prossime Scadenze Checklist */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Prossime Scadenze
              </h4>
              {stats.urgentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuna scadenza urgente</p>
              ) : (
                <ul className="space-y-2">
                  {stats.urgentTasks.map((task: any) => (
                    <li 
                      key={task.id}
                      className="text-sm flex items-start justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate("/app/checklist")}
                    >
                      <span className="flex-1">{task.title}</span>
                      <span className="text-muted-foreground ml-2">
                        {new Date(task.due_date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        {/* Widget 4: Riepilogo Checklist */}
        <Card 
          className="p-6 hover:shadow-elegant transition-all cursor-pointer"
          onClick={() => navigate("/app/checklist")}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-accent" />
            <h3 className="text-xl font-semibold">Progresso Organizzazione</h3>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-accent">
                {stats.tasksTotal > 0 
                  ? `${Math.round((stats.tasksCompleted / stats.tasksTotal) * 100)}%`
                  : "0%"}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Completamento Generale</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 rounded bg-green-50 dark:bg-green-950/20">
                <span className="text-sm font-medium">Completati</span>
                <span className="text-lg font-bold text-green-600">{stats.tasksCompleted}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded bg-blue-50 dark:bg-blue-950/20">
                <span className="text-sm font-medium">In Sospeso</span>
                <span className="text-lg font-bold text-blue-600">
                  {stats.tasksTotal - stats.tasksCompleted}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
