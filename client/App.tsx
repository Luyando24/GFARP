import "./global.css";
import "./styles/card-animations.css";
import { installAuthenticatedFetch } from "./lib/authenticated-fetch";

installAuthenticatedFetch();

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { syncService } from "@/lib/sync";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LanguageProvider } from "@/lib/i18n";
import { getSession, isAdmin } from "@/lib/auth";

const AuthLogin = lazy(() => import("./pages/AuthLogin"));
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const LoginPortal = lazy(() => import("./pages/LoginPortal"));
const AgencyLogin = lazy(() => import("./pages/AgencyLogin"));
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Shop = lazy(() => import("./pages/Shop"));
const RegisterAcademy = lazy(() => import("./pages/RegisterAcademy"));
const RegisterAgency = lazy(() => import("./pages/RegisterAgency"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const AcademyDashboard = lazy(() => import("./pages/AcademyDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const DatabaseManagement = lazy(() => import("./pages/DatabaseManagement"));
const BillingSettings = lazy(() => import("./pages/BillingSettings"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const AdminSupportManagement = lazy(() => import("./pages/AdminSupportManagement"));
const SuperAdmins = lazy(() => import("./pages/SuperAdmins"));
const PlayerDetails = lazy(() => import("./pages/PlayerDetails"));
const AcademyDetails = lazy(() => import("./pages/AcademyDetails"));
const Contact = lazy(() => import("./pages/Contact"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const SubscriptionCancel = lazy(() => import("./pages/SubscriptionCancel"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const VerificationPending = lazy(() => import("./pages/VerificationPending"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Support = lazy(() => import("./pages/Support"));
const About = lazy(() => import("./pages/About"));
const Services = lazy(() => import("./pages/Services"));
const Compliance = lazy(() => import("./pages/Compliance"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogDetails = lazy(() => import("./pages/BlogDetails"));
const BlogEditor = lazy(() => import("./pages/BlogEditor"));
const PublicPlayerProfile = lazy(() => import("./pages/individual/PublicPlayerProfile"));
const PlayerRegister = lazy(() => import("./pages/individual/PlayerRegister"));
const PlayerLogin = lazy(() => import("./pages/individual/PlayerLogin"));
const PlayerDashboard = lazy(() => import("./pages/individual/PlayerDashboard"));
const IndividualPlayerDetails = lazy(() => import("./pages/admin/IndividualPlayerDetails"));
const Maintenance = lazy(() => import("./pages/Maintenance"));

const queryClient = new QueryClient();

const RESERVED_HOST_LABELS = new Set([
  'www', 'api', 'app', 'admin', 'portal', 'mail', 'static', 'assets', 'cdn', 'docs',
]);

const PLAYER_PROFILE_DOMAIN = (import.meta.env.VITE_PLAYER_PROFILE_DOMAIN || 'soccercircular.com')
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, '')
  .replace(/^www\./, '')
  .replace(/\/.*$/, '');

function getPlayerProfileSubdomain(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  if (host.endsWith('.localhost')) {
    const label = host.split('.')[0];
    return label && !RESERVED_HOST_LABELS.has(label) ? label : null;
  }

  // Only the configured player-profile domain serves slug subdomains. Every
  // other host (Netlify previews, custom domains) must render the normal app.
  if (host === PLAYER_PROFILE_DOMAIN || !host.endsWith(`.${PLAYER_PROFILE_DOMAIN}`)) return null;

  const subdomain = host.slice(0, -(PLAYER_PROFILE_DOMAIN.length + 1));
  if (!subdomain || subdomain.includes('.') || RESERVED_HOST_LABELS.has(subdomain)) return null;
  return subdomain;
}

const MAINTENANCE_EXEMPT_PREFIXES = [
  '/admin', '/portal', '/login', '/agency/login', '/staff/login', '/forgot-password', '/reset-password',
];

function isMaintenanceExempt(pathname: string): boolean {
  return MAINTENANCE_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const App = () => {
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  useEffect(() => {
    syncService.start();
    
    // Fetch system settings
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/system-settings/public');
        if (res.ok) {
          const data = await res.json();
          setSystemSettings(data);
        }
      } catch (err) {
        console.error('Failed to fetch system settings:', err);
      } finally {
        setIsSettingsLoading(false);
      }
    };

    fetchSettings();

    return () => syncService.stop();
  }, []);

  if (isSettingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading Soccer Circular...</p>
        </div>
      </div>
    );
  }

  // Check for maintenance mode
  const isMaintenanceMode = systemSettings?.general?.maintenanceMode;
  const maintenanceMessage = systemSettings?.general?.maintenanceMessage;
  const maintenanceEndTime = systemSettings?.general?.maintenanceEndTime;
  
  // Quick bypass check so admins keep access; ProtectedRoute still enforces roles.
  const canBypassMaintenance = isAdmin(getSession());

  const showMaintenance = isMaintenanceMode
    && !canBypassMaintenance
    && !isMaintenanceExempt(window.location.pathname);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
          <ThemeProvider attribute="class" defaultTheme="light">
            <Suspense fallback={(
              <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            )}>
            {(() => {
              const subdomain = getPlayerProfileSubdomain(window.location.hostname);
              if (showMaintenance) {
                return (
                  <BrowserRouter>
                    <Maintenance message={maintenanceMessage} endTime={maintenanceEndTime} />
                  </BrowserRouter>
                );
              }

              if (subdomain) {
                return (
                  <BrowserRouter>
                    <PublicPlayerProfile slug={subdomain} />
                  </BrowserRouter>
                );
              }
              return (
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/login" element={<AuthLogin />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/portal" element={<LoginPortal />} />
              <Route path="/agency/login" element={<AgencyLogin />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Temporary Setup Route */}

              {/* Academy Registration - Public route */}
              <Route path="/academy-registration" element={<RegisterAcademy />} />
              {/* Agency Registration - Public route */}
              <Route path="/agency-registration" element={<RegisterAgency />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/verification-pending" element={<VerificationPending />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/support" element={<Support />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/api-docs" element={<ApiDocs />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogDetails />} />

              {/* Individual Player Routes */}
              <Route path="/player/public/:id" element={<PublicPlayerProfile />} />
              <Route path="/:slug" element={<PublicPlayerProfile />} />
              <Route path="/player/register" element={<PlayerRegister />} />
              <Route path="/player/login" element={<PlayerLogin />} />
              <Route element={<ProtectedRoute allowedRoles={["individual_player"]} />}>
                <Route path="/player/dashboard" element={<PlayerDashboard />} />
              </Route>

              {/* Academy & Agency Dashboard - Protected route requiring authentication */}
              <Route element={<ProtectedRoute allowedRoles={["academy", "agency_admin", "staff"]} />}>
                <Route path="/academy-dashboard" element={<AcademyDashboard />} />
                <Route path="/academy-dashboard/player-details/:id" element={<PlayerDetails />} />
              </Route>

              {/* Protected Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "superadmin"]} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/database" element={<DatabaseManagement />} />
                <Route path="/admin/billing" element={<BillingSettings />} />
                <Route path="/admin/notifications" element={<NotificationsPage />} />
                <Route path="/admin/support" element={<AdminSupportManagement />} />
                <Route path="/admin/super-admins" element={<SuperAdmins />} />
                <Route path="/admin/academy/:id" element={<AcademyDetails />} />
                <Route path="/admin/player-details/:id" element={<PlayerDetails />} />
                <Route path="/admin/individual-player-details/:id" element={<IndividualPlayerDetails />} />
                <Route path="/admin/blog/new" element={<BlogEditor />} />
                <Route path="/admin/blog/edit/:id" element={<BlogEditor />} />
              </Route>

              {/* Stripe payment/subscription outcome routes */}
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/subscription/success" element={<SubscriptionSuccess />} />
              <Route path="/subscription/cancel" element={<SubscriptionCancel />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
              );
            })()}
            </Suspense>
        </ThemeProvider>
      </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
    </HelmetProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
