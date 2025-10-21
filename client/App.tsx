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
import AcademyDashboard from "./pages/AcademyDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import DatabaseManagement from "./pages/DatabaseManagement";
import NotificationsPage from "./pages/NotificationsPage";
import AdminSupportManagement from "./pages/AdminSupportManagement";
import SchoolAdmissions from "./pages/SchoolAdmissions";
import SchoolContact from "./pages/SchoolContact";
import { useEffect } from "react";
import { syncService } from "@/lib/sync";
import { ProtectedRoute } from "./components/ProtectedRoute";

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
              
              {/* Academy Registration - Public route */}
              <Route path="/academy-registration" element={<RegisterAcademy />} />
              
              {/* Academy Dashboard - No auth required for UI development */}
              <Route path="/academy-dashboard" element={<AcademyDashboard />} />
              
              {/* Admin Dashboard - No auth required for UI development */}
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              
              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/admin/database" element={<DatabaseManagement />} />
                <Route path="/admin/notifications" element={<NotificationsPage />} />
                <Route path="/admin/support" element={<AdminSupportManagement />} />
              </Route>
              
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
