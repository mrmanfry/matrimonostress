import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  LayoutDashboard, 
  Users, 
  Euro, 
  CheckSquare, 
  LogOut, 
  Settings, 
  Package, 
  UtensilsCrossed, 
  Calendar 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";

const AppLayout = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingWedding, setLoadingWedding] = useState(true);
  const [weddingInfo, setWeddingInfo] = useState<{ partner1: string; partner2: string; daysUntil: number } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const navigation = [
    { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
    { name: "Invitati", href: "/app/guests", icon: Users },
    { name: "Budget", href: "/app/budget", icon: Euro },
    { name: "Fornitori", href: "/app/vendors", icon: Package },
    { name: "Checklist", href: "/app/checklist", icon: CheckSquare },
    { name: "Tavoli", href: "/app/tables", icon: UtensilsCrossed },
    { name: "Timeline", href: "/app/timeline", icon: Calendar },
    { name: "Impostazioni", href: "/app/settings", icon: Settings },
  ];

  useEffect(() => {
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted) return;
      
      if (!user) {
        setLoading(false);
        setLoadingWedding(false);
        navigate("/auth");
        return;
      }
      
      setUser(user);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Effetto separato per caricare i dati del wedding
  useEffect(() => {
    if (!user?.id) {
      setLoadingWedding(false);
      return;
    }

    const loadWeddingInfo = async () => {
      console.log("[AppLayout] Loading wedding info for user:", user.id);
      setLoadingWedding(true);
      
      try {
        // STEP 1: Controlla se l'utente ha un ruolo (è collaboratore)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("wedding_id")
          .eq("user_id", user.id)
          .maybeSingle();

        console.log("[AppLayout] Role check:", roleData);

        // STEP 2: Carica wedding (come collaboratore O come creator)
        let weddingQuery = supabase
          .from("weddings")
          .select("partner1_name, partner2_name, wedding_date");

        if (roleData?.wedding_id) {
          // È collaboratore - carica per ID
          console.log("[AppLayout] Loading as collaborator for wedding:", roleData.wedding_id);
          weddingQuery = weddingQuery.eq("id", roleData.wedding_id);
        } else {
          // Non è collaboratore - carica come creator
          console.log("[AppLayout] Loading as creator");
          weddingQuery = weddingQuery.eq("created_by", user.id);
        }

        const { data: weddingData, error } = await weddingQuery.maybeSingle();

        console.log("[AppLayout] Wedding data:", { weddingData, error });

        if (error) {
          console.error("[AppLayout] Error loading wedding:", error);
          return;
        }

        if (weddingData) {
          const weddingDate = new Date(weddingData.wedding_date);
          const today = new Date();
          const diffTime = weddingDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          setWeddingInfo({
            partner1: weddingData.partner1_name,
            partner2: weddingData.partner2_name,
            daysUntil: diffDays > 0 ? diffDays : 0,
          });
          
          console.log("[AppLayout] Wedding info loaded successfully");
        } else {
          console.log("[AppLayout] No wedding found - will redirect to onboarding");
        }
      } catch (err) {
        console.error("[AppLayout] Unexpected error:", err);
      } finally {
        setLoadingWedding(false);
      }
    };

    loadWeddingInfo();
  }, [user?.id]);

  // Effetto separato per gestire il reindirizzamento a onboarding
  useEffect(() => {
    // IMPORTANTE: Non redirigere se siamo già su onboarding per evitare loop
    if (location.pathname === "/onboarding") {
      return;
    }
    
    // Aspetta che TUTTO sia finito di caricare
    if (loading || loadingWedding) {
      return;
    }

    // Se c'è un utente ma non ci sono dati wedding, vai su onboarding
    if (user && !weddingInfo) {
      console.log("[AppLayout] Redirecting to onboarding - no wedding found");
      navigate("/onboarding");
    }
  }, [loading, loadingWedding, user, weddingInfo, location.pathname, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Disconnesso",
      description: "A presto!",
    });
    navigate("/");
  };

  if (loading || loadingWedding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-12 h-12 text-accent fill-accent animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar */}
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-accent fill-accent shrink-0" />
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-sm truncate">Nozze Senza Stress</p>
                {weddingInfo && (
                  <p className="text-xs text-muted-foreground truncate">
                    {weddingInfo.partner1} & {weddingInfo.partner2}
                  </p>
                )}
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={active}>
                          <NavLink
                            to={item.href}
                            className={active ? "bg-accent/20 text-foreground font-medium" : ""}
                          >
                            <Icon className="w-5 h-5" />
                            <span>{item.name}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            {weddingInfo && (
              <div className="mb-3 p-3 bg-gradient-hero rounded-lg text-center">
                <div className="text-3xl font-bold text-accent">{weddingInfo.daysUntil}</div>
                <div className="text-xs text-muted-foreground">giorni al matrimonio</div>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Esci
            </Button>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header with Trigger */}
          <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4">
            <SidebarTrigger />
            {weddingInfo && (
              <div className="flex-1 text-center">
                <h2 className="text-sm font-semibold">
                  {weddingInfo.partner1} & {weddingInfo.partner2}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {weddingInfo.daysUntil} giorni al matrimonio
                </p>
              </div>
            )}
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
