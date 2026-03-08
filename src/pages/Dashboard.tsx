import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Users, Euro, Calendar, CheckSquare, AlertCircle, TrendingUp, ExternalLink, Utensils, Sparkles, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useGuestMetrics } from "@/hooks/useGuestMetrics";
import { GuestSummaryWidget } from "@/components/dashboard/GuestSummaryWidget";
import { LockedCard } from "@/components/ui/locked-card";
import { JoinWeddingDialog } from "@/components/workspace/JoinWeddingDialog";
import WebsiteGeneratorCard from "@/components/website/WebsiteGeneratorCard";
import { calculateExpenseAmount, resolveGuestCounts, inferExpenseType, formatCurrency } from "@/lib/expenseCalculations";
import type { ExpenseItem, ExpenseLineItem, GuestCounts } from "@/lib/expenseCalculations";
import { calculateExpectedCounts, calculateTotalVendorStaff } from "@/lib/expectedCalculator";

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
  const [showWelcome, setShowWelcome] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authState, refreshAuth, isPlanner, isCollaborator } = useAuth();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinInitialCode, setJoinInitialCode] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle ?join=CODE from invitation email link
  useEffect(() => {
    const joinCode = searchParams.get("join");
    if (joinCode && authState.status === "authenticated") {
      setJoinInitialCode(joinCode.toUpperCase());
      setJoinDialogOpen(true);
      // Clear the param from URL
      searchParams.delete("join");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, authState.status]);

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

      // Check if this is the first access (welcome state)
      const welcomeShown = sessionStorage.getItem(`welcome_shown_${weddingData.id}`);
      if (!welcomeShown) {
        setShowWelcome(true);
        sessionStorage.setItem(`welcome_shown_${weddingData.id}`, "true");
        toast({
          title: "Benvenuti! 🎉",
          description: "Il vostro account Premium è attivo gratis per i prossimi 30 giorni. Godetevi l'organizzazione!",
          duration: 8000,
        });
      }
      // Calculate days until wedding
      const weddingDate = new Date(weddingData.wedding_date);
      const today = new Date();
      const diffTime = weddingDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysUntilWedding(diffDays);

      // Load stats with payments + expense items for centralized calculation
      const [guestsResponse, expenseItemsFullResponse, expenseLineItemsResponse, tasksResponse, paymentsResponse, vendorsResponse] = await Promise.all([
        supabase.from("guests").select("*").eq("wedding_id", weddingData.id),
        supabase.from("expense_items").select("id, description, expense_type, fixed_amount, estimated_amount, planned_adults, planned_children, planned_staff, tax_rate, amount_is_tax_inclusive, total_amount, calculation_mode, vendor_id, category_id").eq("wedding_id", weddingData.id),
        supabase.from("expense_line_items").select("*, expense_items!inner(wedding_id)").eq("expense_items.wedding_id", weddingData.id),
        supabase.from("checklist_tasks").select("*").eq("wedding_id", weddingData.id),
        supabase.from("payments").select("*, expense_items!inner(wedding_id)").eq("expense_items.wedding_id", weddingData.id),
        supabase.from("vendors").select("id, staff_meals_count").eq("wedding_id", weddingData.id),
      ]);

      const guests = guestsResponse.data || [];
      const expenseItems = expenseItemsFullResponse.data || [];
      const allLineItems = expenseLineItemsResponse.data || [];
      const tasks = tasksResponse.data || [];
      const payments = paymentsResponse.data || [];
      const vendors = vendorsResponse.data || [];

      // Guest counts (same logic as Treasury)
      const globalMode = (weddingData.calculation_mode as 'planned' | 'expected' | 'confirmed') || 'planned';
      const targets = {
        adults: weddingData.target_adults || 100,
        children: weddingData.target_children || 0,
        staff: weddingData.target_staff || 0,
      };

      const guestsConfirmed = guests.filter(g => g.rsvp_status === 'confirmed');
      const totalAdultsConfirmed = guestsConfirmed.reduce((sum, g) => sum + (g.adults_count || 0), 0);
      const totalChildrenConfirmed = guestsConfirmed.reduce((sum, g) => sum + (g.children_count || 0), 0);
      const totalAdults = guests.reduce((sum, g) => sum + (g.adults_count || 0), 0);
      const totalChildren = guests.reduce((sum, g) => sum + (g.children_count || 0), 0);

      // Calculate expected counts
      const vendorStaffTotal = calculateTotalVendorStaff(vendors);
      const expectedResult = calculateExpectedCounts(guests as any, guests as any, vendorStaffTotal);

      const guestCounts: GuestCounts = {
        planned: targets,
        expected: {
          adults: expectedResult.adults,
          children: expectedResult.children,
          staff: expectedResult.staff,
        },
        confirmed: {
          adults: totalAdultsConfirmed,
          children: totalChildrenConfirmed,
          staff: vendorStaffTotal,
        },
      };

      // Calculate total commitment using centralized logic (same as Treasury)
      const totalCommitment = expenseItems.reduce((sum, item) => {
        const itemLines = allLineItems
          .filter((li: any) => li.expense_item_id === item.id)
          .map((li: any) => ({
            unit_price: li.unit_price || 0,
            quantity_type: li.quantity_type || 'fixed',
            quantity_fixed: li.quantity_fixed,
            quantity_limit: li.quantity_limit,
            quantity_range: li.quantity_range || 'all',
            discount_percentage: li.discount_percentage || 0,
            tax_rate: li.tax_rate || 0,
            price_is_tax_inclusive: li.price_is_tax_inclusive || false,
          })) as ExpenseLineItem[];

        const resolved = resolveGuestCounts(
          { planned_adults: item.planned_adults, planned_children: item.planned_children, planned_staff: item.planned_staff },
          targets
        );

        const expenseCalcItem: ExpenseItem = {
          id: item.id,
          expense_type: (item.expense_type as 'fixed' | 'variable' | 'mixed') || inferExpenseType(item as any, itemLines.length > 0),
          fixed_amount: item.fixed_amount,
          estimated_amount: item.estimated_amount,
          planned_adults: resolved.adults,
          planned_children: resolved.children,
          planned_staff: resolved.staff,
          tax_rate: item.tax_rate,
          amount_is_tax_inclusive: item.amount_is_tax_inclusive ?? true,
          total_amount: item.total_amount,
        };

        return sum + calculateExpenseAmount(expenseCalcItem, itemLines, globalMode, guestCounts);
      }, 0);

      const totalPaid = payments.filter(p => p.status === 'Pagato').reduce((sum, p) => {
        const base = Number(p.amount || 0);
        if (!p.tax_inclusive && p.tax_rate) return sum + base * (1 + p.tax_rate / 100);
        return sum + base;
      }, 0);
      const totalToBePaid = totalCommitment - totalPaid;

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
        budgetToBePaid: Math.max(totalToBePaid, 0),
        budgetRemaining: (weddingData.total_budget || 0) - totalCommitment,
        tasksTotal: tasks.length,
        tasksCompleted: tasks.filter(t => t.status === 'completed').length,
        urgentPayments: payments.filter(p => {
          if (p.status === 'Pagato') return false;
          const dueDate = new Date(p.due_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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

      // Look up invitation to get proper role
      let assignedRole: string = "manager";
      const userEmail = user.email;
      
      if (userEmail) {
        const { data: invitation } = await supabase
          .from('wedding_invitations')
          .select('id, role, status')
          .eq('wedding_id', weddingData.id)
          .eq('email', userEmail)
          .eq('status', 'pending')
          .maybeSingle();

        if (invitation) {
          assignedRole = invitation.role;
          await supabase
            .from('wedding_invitations')
            .update({ status: 'accepted' })
            .eq('id', invitation.id);
        }
      }

      // Create the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          wedding_id: weddingData.id,
          role: assignedRole as any,
        });

      if (roleError) throw roleError;

      // Reload auth context
      await refreshAuth();
      await new Promise(resolve => setTimeout(resolve, 200));

      toast({
        title: "Accesso effettuato! 🎉",
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

  const paidPercentage = stats.budgetSpent > 0 ? (stats.budgetPaid / stats.budgetSpent) * 100 : 0;
  const toBePaidPercentage = stats.budgetSpent > 0 ? (stats.budgetToBePaid / stats.budgetSpent) * 100 : 0;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4 lg:space-y-6">
      {/* Header con Countdown centrale */}
      <Card className="p-4 lg:p-8 bg-gradient-hero border-2 border-accent/30">
        <div className="text-center space-y-2 lg:space-y-3">
          <h1 className="text-2xl lg:text-4xl font-bold">
            {wedding.partner1_name} &amp; {wedding.partner2_name}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <Calendar className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
            <div className="text-4xl lg:text-7xl font-bold text-primary">
              {daysUntilWedding !== null && daysUntilWedding > 0 ? daysUntilWedding : 0}
            </div>
          </div>
          <p className="text-base lg:text-xl font-semibold">
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

      {/* Welcome Card - First Access */}
      {showWelcome && (
        <Card className="p-5 border-2 border-primary/20 bg-gradient-hero">
          <div className="flex items-start gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold">I tuoi prossimi passi</h3>
              <p className="text-sm text-muted-foreground">Inizia da qui per organizzare al meglio</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => { setShowWelcome(false); navigate("/app/guests"); }}
            >
              <Users className="w-5 h-5 mr-2 text-primary shrink-0" />
              <span className="text-left">
                <span className="block font-medium text-sm">Aggiungi invitati</span>
                <span className="block text-xs text-muted-foreground">Inizia la tua lista</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => { setShowWelcome(false); navigate("/app/vendors"); }}
            >
              <Euro className="w-5 h-5 mr-2 text-primary shrink-0" />
              <span className="text-left">
                <span className="block font-medium text-sm">Aggiungi fornitori</span>
                <span className="block text-xs text-muted-foreground">E imposta il budget</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3 px-4"
              onClick={() => { setShowWelcome(false); navigate("/app/settings"); }}
            >
              <Heart className="w-5 h-5 mr-2 text-primary shrink-0" />
              <span className="text-left">
                <span className="block font-medium text-sm">Invita il partner</span>
                <span className="block text-xs text-muted-foreground">Collaborate insieme</span>
              </span>
            </Button>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
        {/* Widget 1: Riepilogo Invitati */}
        <GuestSummaryWidget 
          stats={stats} 
          onClick={() => navigate("/app/guests")} 
        />

        {/* Widget 2: Finanze - Impegno/Pagato/Da Pagare */}
        {(() => {
          const activePermissions = authState.status === 'authenticated' ? authState.activePermissions : null;
          const budgetLocked = isCollaborator && !activePermissions?.budget?.view;
          
          if (budgetLocked) {
            return (
              <Card className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[200px]">
                <LockedCard variant="inline" label="Budget riservato" />
                <p className="text-sm text-muted-foreground mt-2">Sezione gestita dagli sposi</p>
              </Card>
            );
          }

          return (
            <Card 
              className="p-4 md:p-6 hover:shadow-elegant transition-all cursor-pointer"
              onClick={() => navigate("/app/treasury")}
            >
              <div className="flex items-center gap-2 mb-3">
                <Euro className="w-6 h-6 text-primary" />
                <h3 className="text-lg md:text-xl font-semibold">Finanze</h3>
              </div>

              <div className="space-y-4">
                {/* Hero: Impegno Totale */}
                <div className="text-center py-1">
                  <div className="text-3xl font-bold">
                    {formatCurrency(stats.budgetSpent)}
                  </div>
                  <div className="text-sm text-muted-foreground">Impegno Totale</div>
                </div>

                {/* Barra segmentata Pagato + Da Pagare */}
                <div className="h-3 rounded-full overflow-hidden flex bg-muted">
                  {stats.budgetSpent > 0 ? (
                    <>
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${paidPercentage}%` }}
                      />
                      <div
                        className="h-full bg-amber-500 transition-all duration-500"
                        style={{ width: `${toBePaidPercentage}%` }}
                      />
                    </>
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>

                {/* KPI: Pagato e Da Pagare */}
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className="space-y-1 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors group"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/app/treasury");
                    }}
                  >
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Pagato
                    </div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(stats.budgetPaid)}
                    </div>
                  </div>
                  <div 
                    className="space-y-1 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors group"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/app/treasury");
                    }}
                  >
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Da Pagare
                    </div>
                    <div className="text-xl font-bold text-amber-700 dark:text-amber-400">
                      {formatCurrency(stats.budgetToBePaid)}
                    </div>
                  </div>
                </div>

                {/* Riga secondaria: Budget target e Liquidità */}
                {stats.budgetTotal > 0 && (
                  <div className="border-t pt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Budget target: {formatCurrency(stats.budgetTotal)}</span>
                    <span className={stats.budgetRemaining < 0 ? 'text-destructive font-medium' : ''}>
                      Liquidità: {formatCurrency(stats.budgetRemaining)}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })()}

        {/* Widget 3: Azioni Urgenti */}
        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg md:text-xl font-semibold">Azioni Urgenti</h3>
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
                          <div className="font-medium text-sm group-hover:text-primary transition-colors">
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
                          <div className="font-medium text-sm group-hover:text-primary transition-colors">
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

      <JoinWeddingDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        initialCode={joinInitialCode}
      />
    </div>
  );
};

export default Dashboard;
