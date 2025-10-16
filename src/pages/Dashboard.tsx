import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Heart, Users, Euro, Calendar, CheckSquare } from "lucide-react";

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
  guestsPending: number;
  guestsDeclined: number;
  budgetTotal: number;
  budgetSpent: number;
  tasksTotal: number;
  tasksCompleted: number;
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

      // Load stats
      const [guestsResponse, expensesResponse, tasksResponse] = await Promise.all([
        supabase.from("guests").select("*").eq("wedding_id", weddingData.id),
        supabase.from("expenses").select("*").eq("wedding_id", weddingData.id),
        supabase.from("checklist_tasks").select("*").eq("wedding_id", weddingData.id),
      ]);

      const guests = guestsResponse.data || [];
      const expenses = expensesResponse.data || [];
      const tasks = tasksResponse.data || [];

      setStats({
        guestsTotal: guests.reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        guestsConfirmed: guests.filter(g => g.rsvp_status === 'confirmed').reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        guestsPending: guests.filter(g => g.rsvp_status === 'pending').reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        guestsDeclined: guests.filter(g => g.rsvp_status === 'declined').reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        budgetTotal: weddingData.total_budget || 0,
        budgetSpent: expenses.reduce((sum, e) => sum + Number(e.final_amount || e.estimated_amount || 0), 0),
        tasksTotal: tasks.length,
        tasksCompleted: tasks.filter(t => t.status === 'completed').length,
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

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl lg:text-4xl font-bold">
          {wedding.partner1_name} & {wedding.partner2_name}
        </h1>
        <p className="text-muted-foreground">
          Benvenuto nella tua dashboard di pianificazione
        </p>
      </div>

      {/* Countdown */}
      <Card className="p-6 lg:p-8 bg-gradient-hero border-2 border-accent/30">
        <div className="text-center space-y-2">
          <Calendar className="w-12 h-12 text-accent mx-auto" />
          <div className="text-5xl lg:text-6xl font-bold text-foreground">
            {daysUntilWedding !== null && daysUntilWedding > 0 ? daysUntilWedding : 0}
          </div>
          <p className="text-lg text-muted-foreground">
            {daysUntilWedding !== null && daysUntilWedding > 0 
              ? `giorni al tuo matrimonio` 
              : daysUntilWedding === 0
              ? "È oggi! Auguri!"
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

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Guests Card */}
        <Card className="p-6 hover:shadow-elegant transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <Users className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold">{stats.guestsTotal}</span>
          </div>
          <h3 className="font-semibold mb-2">Invitati</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Confermati</span>
              <span className="text-foreground font-medium">{stats.guestsConfirmed}</span>
            </div>
            <div className="flex justify-between">
              <span>In attesa</span>
              <span className="text-foreground font-medium">{stats.guestsPending}</span>
            </div>
            <div className="flex justify-between">
              <span>Rifiutati</span>
              <span className="text-foreground font-medium">{stats.guestsDeclined}</span>
            </div>
          </div>
        </Card>

        {/* Budget Card */}
        <Card className="p-6 hover:shadow-elegant transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <Euro className="w-8 h-8 text-gold" />
            <span className="text-2xl font-bold">
              {stats.budgetTotal > 0 
                ? `${Math.round((stats.budgetSpent / stats.budgetTotal) * 100)}%`
                : "-"}
            </span>
          </div>
          <h3 className="font-semibold mb-2">Budget</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Totale</span>
              <span className="text-foreground font-medium">
                €{stats.budgetTotal.toLocaleString("it-IT")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Speso</span>
              <span className="text-foreground font-medium">
                €{Math.round(stats.budgetSpent).toLocaleString("it-IT")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Rimasto</span>
              <span className="text-foreground font-medium">
                €{Math.round(stats.budgetTotal - stats.budgetSpent).toLocaleString("it-IT")}
              </span>
            </div>
          </div>
        </Card>

        {/* Tasks Card */}
        <Card className="p-6 hover:shadow-elegant transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <CheckSquare className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold">
              {stats.tasksTotal > 0 
                ? `${Math.round((stats.tasksCompleted / stats.tasksTotal) * 100)}%`
                : "-"}
            </span>
          </div>
          <h3 className="font-semibold mb-2">Checklist</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Totali</span>
              <span className="text-foreground font-medium">{stats.tasksTotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Completati</span>
              <span className="text-foreground font-medium">{stats.tasksCompleted}</span>
            </div>
            <div className="flex justify-between">
              <span>Da fare</span>
              <span className="text-foreground font-medium">
                {stats.tasksTotal - stats.tasksCompleted}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
