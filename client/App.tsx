import "./global.css";
import "./styles/card-animations.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthLogin from "./pages/AuthLogin";
import AdminLogin from "./pages/AdminLogin";
import Register from "./pages/Register";
import Shop from "./pages/Shop";
import RegisterAcademy from "./pages/RegisterAcademy";
import CompleteProfile from "./pages/CompleteProfile";
import AcademyDashboard from "./pages/AcademyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DatabaseManagement from "./pages/DatabaseManagement";
import BillingSettings from "./pages/BillingSettings";
import NotificationsPage from "./pages/NotificationsPage";
import AdminSupportManagement from "./pages/AdminSupportManagement";
import SuperAdmins from "./pages/SuperAdmins";
import PlayerDetails from "./pages/PlayerDetails";
import AcademyDetails from "./pages/AcademyDetails";
import { useEffect } from "react";
import { syncService } from "@/lib/sync";
import { ProtectedRoute } from "./components/ProtectedRoute";
import PaymentSuccess from "./pages/PaymentSuccess";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCancel from "./pages/SubscriptionCancel";
import SetupSuperAdmin from "./pages/SetupSuperAdmin";
import VerifyEmail from "./pages/VerifyEmail";
import VerificationPending from "./pages/VerificationPending";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Support from "./pages/Support";
import About from "./pages/About";
import Services from "./pages/Services";
import Compliance from "./pages/Compliance";
import ApiDocs from "./pages/ApiDocs";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    syncService.start();
    return () => syncService.stop();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeProvider attribute="class" defaultTheme="light">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/login" element={<AuthLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/register" element={<Register />} />

              {/* Temporary Setup Route */}
              <Route path="/setup-super-admin" element={<SetupSuperAdmin />} />

              {/* Academy Registration - Public route */}
              <Route path="/academy-registration" element={<RegisterAcademy />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/verification-pending" element={<VerificationPending />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/support" element={<Support />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/api-docs" element={<ApiDocs />} />

              {/* Academy Dashboard - Protected route requiring authentication */}
              <Route element={<ProtectedRoute allowedRoles={["academy"]} />}>
                <Route path="/academy-dashboard" element={<AcademyDashboard />} />
                <Route path="/academy-dashboard/player-details/:id" element={<PlayerDetails />} />
              </Route>

              {/* Admin Dashboard - Protected route requiring superadmin authentication */}
              <Route path="/admin" element={<AdminDashboard />} />

              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "superadmin"]} />}>
                <Route path="/admin/database" element={<DatabaseManagement />} />
                <Route path="/admin/billing" element={<BillingSettings />} />
                <Route path="/admin/notifications" element={<NotificationsPage />} />
                <Route path="/admin/support" element={<AdminSupportManagement />} />
                <Route path="/admin/super-admins" element={<SuperAdmins />} />
                <Route path="/admin/academy/:id" element={<AcademyDetails />} />
                <Route path="/admin/player-details/:id" element={<PlayerDetails />} />
              </Route>

              {/* Stripe payment/subscription outcome routes */}
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/subscription/success" element={<SubscriptionSuccess />} />
              <Route path="/subscription/cancel" element={<SubscriptionCancel />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
