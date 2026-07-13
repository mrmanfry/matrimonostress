import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/guards/ProtectedRoute";
import { PermissionGuard } from "@/guards/PermissionGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import AppLayout from "./pages/AppLayout";
import Dashboard from "./pages/Dashboard";
import Guests from "./pages/Guests";
import Budget from "./pages/Budget";
import Vendors from "./pages/Vendors";
import VendorDetails from "./pages/VendorDetails";
import Checklist from "./pages/Checklist";
import Settings from "./pages/Settings";
import Tables from "./pages/Tables";
import Catering from "./pages/Catering";
import Timeline from "./pages/Timeline";
import TimelinePublic from "./pages/TimelinePublic";
import ProgressPublic from "./pages/ProgressPublic";
import ContactSync from "./pages/ContactSync";
import RSVPPublic from "./pages/RSVPPublic";
import Calendar from "./pages/Calendar";
import Upgrade from "./pages/Upgrade";
import UpgradePlanner from "./pages/UpgradePlanner";
import PlannerCockpit from "./pages/PlannerCockpit";
import TableauGenerator from "./pages/TableauGenerator";
import PlannerCalendarPage from "./pages/PlannerCalendarPage";
import Chat from "./pages/Chat";
import PlannerInbox from "./pages/PlannerInbox";
import Accommodation from "./pages/Accommodation";
import MemoriesReel from "./pages/MemoriesReel";
import CameraPublic from "./pages/CameraPublic";
import Invitations from "./pages/Invitations";
import MassBooklet from "./pages/MassBooklet";
import Gifts from "./pages/Gifts";
import HelpCenter from "./pages/HelpCenter";
import Funzionalita from "./pages/Funzionalita";
import ComeFunziona from "./pages/ComeFunziona";
import Prezzi from "./pages/Prezzi";
import Risorse from "./pages/Risorse";
import RisorseArticle from "./pages/RisorseArticle";
import NotFound from "./pages/NotFound";
import OAuthConsent from "./pages/OAuthConsent";
import Unsubscribe from "./pages/Unsubscribe";

const AppIndexRedirect = () => {
  const { activeMode } = useAuth();
  return <Navigate to={activeMode === 'planner' ? '/app/planner' : '/app/dashboard'} replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/funzionalita" element={<Funzionalita />} />
            <Route path="/come-funziona" element={<ComeFunziona />} />
            <Route path="/prezzi" element={<Prezzi />} />
            <Route path="/risorse" element={<Risorse />} />
            <Route path="/risorse/:slug" element={<RisorseArticle />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route 
              path="/onboarding" 
              element={
                <ProtectedRoute redirectIfHasWedding>
                  <Onboarding />
                </ProtectedRoute>
              } 
            />
            <Route path="/timeline/:token" element={<TimelinePublic />} />
            <Route path="/progress/:token" element={<ProgressPublic />} />
            <Route path="/sync/:token" element={<ContactSync />} />
            <Route path="/rsvp/:token" element={<RSVPPublic />} />
            <Route path="/save-the-date/:token" element={<RSVPPublic forceStdMode />} />
            <Route path="/camera/:token" element={<CameraPublic />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/help/:category/:article" element={<HelpCenter />} />
            {/* Vanity URLs with couple slug */}
            <Route path="/:coupleSlug/rsvp/:token" element={<RSVPPublic />} />
            <Route path="/:coupleSlug/save-the-date/:token" element={<RSVPPublic forceStdMode />} />
            <Route
              path="/app" 
              element={
                <ProtectedRoute requireWedding>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AppIndexRedirect />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="planner" element={<PlannerCockpit />} />
              <Route path="planner-calendar" element={<PlannerCalendarPage />} />
              <Route path="guests" element={<PermissionGuard area="guests"><Guests /></PermissionGuard>} />
              <Route path="budget" element={<PermissionGuard area="budget"><Budget /></PermissionGuard>} />
              <Route path="treasury" element={<Navigate to="/app/budget" replace />} />
              <Route path="vendors" element={<PermissionGuard area="vendors"><Vendors /></PermissionGuard>} />
              <Route path="vendors/:id" element={<PermissionGuard area="vendors"><VendorDetails /></PermissionGuard>} />
              <Route path="checklist" element={<PermissionGuard area="checklist"><Checklist /></PermissionGuard>} />
              <Route path="calendar" element={<PermissionGuard area="calendar"><Calendar /></PermissionGuard>} />
              <Route path="tables" element={<PermissionGuard area="tables"><Tables /></PermissionGuard>} />
              <Route path="tableau" element={<PermissionGuard area="tables"><TableauGenerator /></PermissionGuard>} />
              <Route path="catering" element={<PermissionGuard area="catering"><Catering /></PermissionGuard>} />
              <Route path="accommodation" element={<PermissionGuard area="accommodation"><Accommodation /></PermissionGuard>} />
              <Route path="invitations" element={<PermissionGuard area="communications"><Invitations /></PermissionGuard>} />
              <Route path="memories" element={<PermissionGuard area="memories"><MemoriesReel /></PermissionGuard>} />
              <Route path="mass-booklet" element={<PermissionGuard area="mass_booklet"><MassBooklet /></PermissionGuard>} />
              <Route path="gifts" element={<PermissionGuard area="gifts"><Gifts /></PermissionGuard>} />
              <Route path="timeline" element={<PermissionGuard area="timeline"><Timeline /></PermissionGuard>} />
              <Route path="settings" element={<Settings />} />
              <Route path="chat" element={<PermissionGuard area="chat"><Chat /></PermissionGuard>} />
              <Route path="inbox" element={<PlannerInbox />} />
              <Route path="upgrade" element={<Upgrade />} />
              <Route path="upgrade/planner" element={<UpgradePlanner />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
