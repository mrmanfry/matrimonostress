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
    console.log("🔄 [APPLAYOUT] Wedding load useEffect triggered");
    console.log("   user?.id:", user?.id);
    console.log("   location.pathname:", location.pathname);
    
    if (!user?.id) {
      console.log("⏭️  [APPLAYOUT] No user, skipping wedding load");
      setLoadingWedding(false);
      return;
    }

    let navigationDone = false;

    const loadWeddingInfo = async () => {
      console.log("📥 [APPLAYOUT] START loading wedding for user:", user.id);
      setLoadingWedding(true);
      
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("wedding_id")
          .eq("user_id", user.id)
          .maybeSingle();

        console.log("👥 Role data:", roleData);

        let weddingQuery = supabase
          .from("weddings")
          .select("partner1_name, partner2_name, wedding_date");

        if (roleData?.wedding_id) {
          console.log("✅ User is collaborator for wedding:", roleData.wedding_id);
          weddingQuery = weddingQuery.eq("id", roleData.wedding_id);
        } else {
          console.log("✅ User is creator, loading their wedding");
          weddingQuery = weddingQuery.eq("created_by", user.id);
        }

        const { data: weddingData, error } = await weddingQuery.maybeSingle();

        console.log("💒 Wedding query result:", { found: !!weddingData, error });

        if (error) {
          console.error("❌ Error loading wedding:", error);
          return;
        }

        if (weddingData) {
          console.log("✅ Wedding found:", weddingData.partner1_name, "&", weddingData.partner2_name);
          console.log("   Current location:", location.pathname);
          
          const weddingDate = new Date(weddingData.wedding_date);
          const today = new Date();
          const diffTime = weddingDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          setWeddingInfo({
            partner1: weddingData.partner1_name,
            partner2: weddingData.partner2_name,
            daysUntil: diffDays > 0 ? diffDays : 0,
          });
          
          // SE siamo su onboarding ma abbiamo trovato un wedding, vai alla dashboard
          if (location.pathname === "/onboarding" && !navigationDone) {
            console.log("🚀 [APPLAYOUT] Navigating: /onboarding → /app/dashboard WITH REPLACE");
            navigationDone = true;
            navigate("/app/dashboard", { replace: true });
          } else {
            console.log("✅ [APPLAYOUT] Already on correct route:", location.pathname);
          }
        } else {
          console.log("❌ No wedding found");
          console.log("   Current location:", location.pathname);
          
          // Wedding NON trovato - redirect SOLO se non siamo già su onboarding
          if (location.pathname !== "/onboarding" && !navigationDone) {
            console.log("🚀 [APPLAYOUT] Navigating: " + location.pathname + " → /onboarding WITH REPLACE");
            navigationDone = true;
            navigate("/onboarding", { replace: true });
          } else {
            console.log("✅ [APPLAYOUT] Already on /onboarding");
          }
        }
      } catch (err) {
        console.error("❌ Unexpected error loading wedding:", err);
      } finally {
        console.log("✅ [APPLAYOUT] Wedding load complete, setLoadingWedding(false)");
        setLoadingWedding(false);
      }
    };

    loadWeddingInfo();
  }, [user?.id, location.pathname, navigate]);

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
