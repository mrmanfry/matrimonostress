import { useEffect, useState, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  LayoutDashboard, 
  LayoutGrid,
  Users, 
  Euro, 
  CheckSquare, 
  LogOut, 
  Settings, 
  Package, 
  UtensilsCrossed, 
  Calendar,
  CalendarDays,
  TrendingUp,
  MessageCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrialBadge } from "@/components/subscription/TrialBadge";
import { Badge } from "@/components/ui/badge";
import { SoftPaywallDialog } from "@/components/subscription/SoftPaywallDialog";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { ModeSwitcher } from "@/components/workspace/ModeSwitcher";

const AppLayout = () => {
  const { authState, signOut, activeMode } = useAuth();
  const [loadingWedding, setLoadingWedding] = useState(true);
  const [weddingInfo, setWeddingInfo] = useState<{ partner1: string; partner2: string; daysUntil: number } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation is now built inside AppLayoutInner (needs location)

  useEffect(() => {
    if (authState.status !== "authenticated") {
      setLoadingWedding(false);
      return;
    }

    if (!authState.activeWeddingId) {
      setLoadingWedding(false);
      return;
    }

    const loadWeddingInfo = async () => {
      setLoadingWedding(true);
      
      try {
        const { data: weddingData } = await supabase
          .from("weddings")
          .select("partner1_name, partner2_name, wedding_date")
          .eq("id", authState.activeWeddingId)
          .maybeSingle();

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
        }
        
        setLoadingWedding(false);
      } catch (err) {
        console.error("Error loading wedding:", err);
        setLoadingWedding(false);
      }
    };

    loadWeddingInfo();
  }, [authState]);


  if (loadingWedding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-12 h-12 text-accent fill-accent animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento dati matrimonio...</p>
        </div>
      </div>
    );
  }


  return (
    <SubscriptionProvider>
      <SidebarProvider>
        <AppLayoutInner
          weddingInfo={weddingInfo}
          signOut={signOut}
          location={location}
        />
      </SidebarProvider>
    </SubscriptionProvider>
  );
};

const AppLayoutInner = ({
  weddingInfo,
  signOut,
  location,
}: {
  weddingInfo: { partner1: string; partner2: string; daysUntil: number } | null;
  signOut: () => void;
  location: ReturnType<typeof useLocation>;
}) => {
  const { setOpenMobile } = useSidebar();
  const { authState, activeMode } = useAuth();
  const isMobile = useIsMobile();
  const [unreadCount, setUnreadCount] = useState(0);

  const userId = authState.status === 'authenticated' ? authState.user.id : null;
  const activeWeddingId = authState.status === 'authenticated' ? authState.activeWeddingId : null;
  const allWeddingIds = authState.status === 'authenticated' ? (authState.weddings?.map((w: any) => w.weddingId) || []) : [];

  const isOnCockpit = location.pathname === '/app/planner';
  const isPlannerMode = activeMode === 'planner';

  const activePermissions = authState.status === 'authenticated' ? authState.activePermissions : null;
  const isCollaborator = authState.status === 'authenticated' && (authState.activeRole === 'planner' || authState.activeRole === 'manager');

  // Unread messages count
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    
    // For planner mode, count across all weddings; otherwise just active
    const weddingIds = isPlannerMode && allWeddingIds.length > 0 ? allWeddingIds : (activeWeddingId ? [activeWeddingId] : []);
    if (weddingIds.length === 0) return;

    let totalUnread = 0;
    for (const wId of weddingIds) {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("wedding_id", wId)
        .neq("sender_id", userId);
      const { count: readCount } = await supabase
        .from("message_reads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      totalUnread += Math.max(0, (count || 0) - (readCount || 0));
    }
    setUnreadCount(totalUnread);
  }, [userId, activeWeddingId, isPlannerMode, allWeddingIds]);

  useEffect(() => {
    fetchUnreadCount();
    if (!activeWeddingId) return;
    const channel = supabase
      .channel('unread-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `wedding_id=eq.${activeWeddingId}` }, () => {
        fetchUnreadCount();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reads' }, () => {
        fetchUnreadCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeWeddingId, fetchUnreadCount]);

  // Build navigation conditionally
  let navigation: { name: string; href: string; icon: any; badge?: number }[] = [];
  if (isPlannerMode && isOnCockpit) {
    navigation = [{ name: "Messaggi", href: "/app/inbox", icon: MessageCircle, badge: unreadCount }];
  } else {
    const allNav = [
      ...(isPlannerMode ? [{ name: "Cockpit", href: "/app/planner", icon: LayoutGrid }] : []),
      { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
      { name: "Invitati", href: "/app/guests", icon: Users },
      { name: "Budget", href: "/app/budget", icon: Euro, hidden: isCollaborator && !activePermissions?.budget?.view },
      { name: "Tesoreria", href: "/app/treasury", icon: TrendingUp, hidden: isCollaborator && !activePermissions?.budget?.view },
      { name: "Fornitori", href: "/app/vendors", icon: Package },
      { name: "Checklist", href: "/app/checklist", icon: CheckSquare },
      { name: "Messaggi", href: isPlannerMode ? "/app/inbox" : "/app/chat", icon: MessageCircle, badge: unreadCount },
      { name: "Calendario", href: "/app/calendar", icon: CalendarDays },
      { name: "Tavoli", href: "/app/tables", icon: UtensilsCrossed },
      { name: "Timeline", href: "/app/timeline", icon: Calendar },
      { name: "Impostazioni", href: "/app/settings", icon: Settings },
    ];
    navigation = allNav.filter(n => !('hidden' in n && n.hidden));
  }

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;
  const showWorkspaceSwitcher = !(isPlannerMode && isOnCockpit);

  return (
    <div className="min-h-screen flex w-full">
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-border p-4 space-y-2">
          {showWorkspaceSwitcher && <WorkspaceSwitcher />}
          <ModeSwitcher />
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
                          onClick={handleNavClick}
                          className={active ? "bg-accent/20 text-foreground font-medium" : ""}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="flex-1">{item.name}</span>
                          {'badge' in item && item.badge && item.badge > 0 ? (
                            <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-[10px] rounded-full">
                              {item.badge > 99 ? '99+' : item.badge}
                            </Badge>
                          ) : null}
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
          {weddingInfo && !(isPlannerMode && isOnCockpit) && (
            <div className="mb-3 p-3 bg-gradient-hero rounded-lg text-center">
              <div className="text-3xl font-bold text-accent">{weddingInfo.daysUntil}</div>
              <div className="text-xs text-muted-foreground">giorni al matrimonio</div>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Esci
          </Button>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4">
          <SidebarTrigger />
          {isOnCockpit ? (
            <div className="flex-1 text-center">
              <h2 className="text-sm font-semibold">Cockpit Planner</h2>
              <p className="text-xs text-muted-foreground">Panoramica matrimoni</p>
            </div>
          ) : weddingInfo ? (
            <div className="flex-1 text-center">
              <h2 className="text-sm font-semibold">
                {weddingInfo.partner1} & {weddingInfo.partner2}
              </h2>
              <p className="text-xs text-muted-foreground">
                {weddingInfo.daysUntil} giorni al matrimonio
              </p>
            </div>
          ) : null}
          <TrialBadge />
        </header>
        <SoftPaywallDialog />

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
