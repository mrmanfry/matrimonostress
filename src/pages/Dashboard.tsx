import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Users, Euro, Calendar, CheckSquare, AlertCircle, TrendingUp, ExternalLink, Utensils } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useGuestMetrics } from "@/hooks/useGuestMetrics";
import { GuestSummaryWidget } from "@/components/dashboard/GuestSummaryWidget";

interface Wedding {
  id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string;
  total_budget: number | null;
}

interface DashboardStats {
  guestsTotal: number;
  adultsTotal: number;
  childrenTotal: number;
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
  const [accessCode, setAccessCode] = useState("");
  const [joiningWedding, setJoiningWedding] = useState(false);
  const navigate = useNavigate();
  const { authState, refreshAuth } = useAuth();

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
      // Try to get wedding from created_by or user_roles
      let weddingData = null;
      
      // First check if user created a wedding
      const { data: createdWedding } = await supabase
        .from("weddings")
        .select("*")
        .eq("created_by", user.id)
        .maybeSingle();

      if (createdWedding) {
        weddingData = createdWedding;
      } else {
        // Check if user has a role in any wedding
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("wedding_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleData?.wedding_id) {
          const { data: roleWedding } = await supabase
            .from("weddings")
            .select("*")
            .eq("id", roleData.wedding_id)
            .single();
          
          if (roleWedding) {
            weddingData = roleWedding;
          }
        }
      }

      if (!weddingData) {
        // User has no wedding - stay on dashboard to show join form
        setLoading(false);
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
      const [guestsResponse, expenseItemsResponse, tasksResponse, paymentsResponse] = await Promise.all([
        supabase.from("guests").select("*").eq("wedding_id", weddingData.id),
        supabase.from("expense_items").select("id").eq("wedding_id", weddingData.id),
        supabase.from("checklist_tasks").select("*").eq("wedding_id", weddingData.id),
        supabase.from("payments").select("*, expense_items!inner(wedding_id)").eq("expense_items.wedding_id", weddingData.id),
      ]);

      const guests = guestsResponse.data || [];
      const expenseItems = expenseItemsResponse.data || [];
      const tasks = tasksResponse.data || [];
      const payments = paymentsResponse.data || [];

      const guestsConfirmed = guests.filter(g => g.rsvp_status === 'confirmed');
      const totalAdultsConfirmed = guestsConfirmed.reduce((sum, g) => sum + (g.adults_count || 0), 0);
      const totalChildrenConfirmed = guestsConfirmed.reduce((sum, g) => sum + (g.children_count || 0), 0);
      const totalAdults = guests.reduce((sum, g) => sum + (g.adults_count || 0), 0);
      const totalChildren = guests.reduce((sum, g) => sum + (g.children_count || 0), 0);

      const totalCommitment = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalPaid = payments.filter(p => p.status === 'Pagato').reduce((sum, p) => sum + Number(p.amount), 0);
      const totalToBePaid = payments.filter(p => p.status === 'Da Pagare').reduce((sum, p) => sum + Number(p.amount), 0);

      setStats({
        guestsTotal: guests.reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        adultsTotal: totalAdults,
        childrenTotal: totalChildren,
        guestsConfirmed: totalAdultsConfirmed + totalChildrenConfirmed,
        adultsConfirmed: totalAdultsConfirmed,
        childrenConfirmed: totalChildrenConfirmed,
        guestsPending: guests.filter(g => g.rsvp_status === 'pending').reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        guestsDeclined: guests.filter(g => g.rsvp_status === 'declined').reduce((sum, g) => sum + (g.adults_count || 0) + (g.children_count || 0), 0),
        budgetTotal: weddingData.total_budget || 0,
        budgetSpent: totalCommitment,
        budgetPaid: totalPaid,
        budgetToBePaid: totalToBePaid,
        budgetRemaining: (weddingData.total_budget || 0) - totalCommitment,
        tasksTotal: tasks.length,
        tasksCompleted: tasks.filter(t => t.status === 'completed').length,
        urgentPayments: payments.filter(p => {
          // FR-DB-2.0: Escludere pagamenti già completati
          if (p.status === 'Pagato') return false;
          const dueDate = new Date(p.due_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          // Solo pagamenti futuri entro 7 giorni
          return daysUntil >= 0 && daysUntil <= 7;
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

  const handleJoinWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoiningWedding(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find wedding with this code
      const { data: weddingData, error: weddingError } = await supabase
        .from('weddings')
        .select('id')
        .eq('access_code', accessCode.toUpperCase().trim())
        .single();

      if (weddingError || !weddingData) {
        throw new Error("Codice non valido");
      }

      // Check if user already has a role for this wedding
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('wedding_id', weddingData.id)
        .maybeSingle();

      if (existingRole) {
        throw new Error("Sei già un collaboratore di questo matrimonio");
      }

      // Create the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          wedding_id: weddingData.id,
          role: 'manager'
        });

      if (roleError) throw roleError;

      // Reload auth context
      await refreshAuth();

      // Wait for auth state to update before reloading data
      await new Promise(resolve => setTimeout(resolve, 200));

      toast({
        title: "Accesso effettuato!",
        description: "Ora puoi collaborare a questo matrimonio",
      });

      // Reload dashboard data
      await loadDashboardData();
    } catch (error: any) {
      console.error("Error joining wedding:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile accedere al matrimonio",
        variant: "destructive",
      });
    } finally {
      setJoiningWedding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Heart className="w-12 h-12 text-accent fill-accent animate-pulse" />
      </div>
    );
  }

  // Show join form if user has no wedding
  if (!wedding && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Heart className="w-16 h-16 text-accent fill-accent mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">👋 Benvenuto!</h2>
            <p className="text-muted-foreground">
              Non hai ancora un matrimonio. Cosa vuoi fare?
            </p>
          </div>
          
          <Button 
            className="w-full mb-6" 
            onClick={() => navigate('/onboarding')}
            size="lg"
          >
            Crea un Nuovo Matrimonio
          </Button>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">oppure</span>
            </div>
          </div>
          
          <form onSubmit={handleJoinWithCode} className="space-y-4">
            <div>
              <Label htmlFor="accessCode" className="text-base">
                Ho un Codice di Accesso
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Inserisci il codice che ti è stato inviato via email
              </p>
              <Input
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="WED-XXXX"
                className="font-mono uppercase text-center text-lg"
                maxLength={8}
                required
                disabled={joiningWedding}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={joiningWedding || accessCode.length < 8}
            >
              {joiningWedding ? "Accesso in corso..." : "Accedi al Matrimonio"}
            </Button>
          </form>
        </Card>
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
        {/* Widget 1: Riepilogo Invitati con Grafico - usando useGuestMetrics */}
        <GuestSummaryWidget 
          stats={stats} 
          onClick={() => navigate("/app/guests")} 
        />

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
              {/* FR-DB-3.3 - Ancora da Pagare -> Treasury */}
              <div 
                className="space-y-1 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors group"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/app/treasury");
                }}
              >
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  Ancora da Pagare
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xl font-bold text-orange-600">
                  €{Math.round(stats.budgetToBePaid).toLocaleString("it-IT")}
                </div>
              </div>
              
              {/* FR-DB-3.2 - Liquidità Rimanente -> Budget */}
              <div 
                className="space-y-1 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors group"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/app/budget");
                }}
              >
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  Liquidità Rimanente
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
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
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                        onClick={() => navigate(`/app/treasury?payment_id=${payment.id}&action=pay`)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm group-hover:text-accent transition-colors">
                            {payment.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Scade tra {daysUntil} {daysUntil === 1 ? 'giorno' : 'giorni'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-sm">
                            €{Math.round(payment.amount).toLocaleString("it-IT")}
                          </div>
                          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
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
                  {stats.urgentTasks.map((task: any) => {
                    const daysUntil = Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <li 
                        key={task.id}
                        className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                        onClick={() => navigate(`/app/checklist?task_id=${task.id}`)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm group-hover:text-accent transition-colors">
                            {task.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Scade tra {daysUntil} {daysUntil === 1 ? 'giorno' : 'giorni'}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default Dashboard;
