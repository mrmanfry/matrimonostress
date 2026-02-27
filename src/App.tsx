import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/guards/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import AppLayout from "./pages/AppLayout";
import Dashboard from "./pages/Dashboard";
import Guests from "./pages/Guests";
import BudgetLegacy from "./pages/BudgetLegacy";
import Treasury from "./pages/Treasury";
import Vendors from "./pages/Vendors";
import VendorDetails from "./pages/VendorDetails";
import Checklist from "./pages/Checklist";
import Settings from "./pages/Settings";
import Tables from "./pages/Tables";
import Timeline from "./pages/Timeline";
import TimelinePublic from "./pages/TimelinePublic";
import ProgressPublic from "./pages/ProgressPublic";
import ContactSync from "./pages/ContactSync";
import RSVPPublic from "./pages/RSVPPublic";
import Calendar from "./pages/Calendar";
import Upgrade from "./pages/Upgrade";
import NotFound from "./pages/NotFound";

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
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="guests" element={<Guests />} />
              <Route path="budget" element={<BudgetLegacy />} />
              <Route path="treasury" element={<Treasury />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="vendors/:id" element={<VendorDetails />} />
              <Route path="checklist" element={<Checklist />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="tables" element={<Tables />} />
              <Route path="timeline" element={<Timeline />} />
              <Route path="settings" element={<Settings />} />
              <Route path="upgrade" element={<Upgrade />} />
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
