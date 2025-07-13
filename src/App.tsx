import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import CallDetails from "./pages/CallDetails";
import SpecificCallDetails from "./pages/SpecificCallDetails";
import AssistantSettings from "./pages/AssistantSettings";
import Integrations from "./pages/Integrations";
import PlanManagement from "./pages/PlanManagement";
import Auth from "./pages/Auth";
import Security from "./pages/Security";
import APIsManagement from "./pages/APIsManagement";
import CustomerContacts from "./pages/CustomerContacts";

import NotFound from "./pages/NotFound";
import PremiumFeatures from "./pages/PremiumFeatures";
import SuperUserDashboard from "./pages/SuperUserDashboard";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Main App Layout
const AppLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Don't show sidebar on auth page
  if (location.pathname === '/auth') {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
      </Routes>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b bg-background px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-x-hidden">
            <Routes>
              <Route path="/" element={<CallDetails />} />
              <Route path="/call-details" element={<CallDetails />} />
              <Route path="/call/:callId" element={<SpecificCallDetails />} />
              <Route path="/customer-contacts" element={<CustomerContacts />} />
              <Route path="/settings" element={<AssistantSettings />} />
              <Route path="/security" element={<Security />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/plans" element={<PlanManagement />} />
              <Route path="/premium-features" element={<PremiumFeatures />} />
              
              <Route path="/admin" element={<SuperUserDashboard />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
