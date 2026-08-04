import React, { lazy, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, useAuth } from '@/lib/auth';
import {
  getAcademyFinancialSettings,
  getCurrentSubscription,
  getSubscriptionHistory,
  updateAcademyFinancialSettings,
} from '@/lib/api';
import {
  Trophy,
  Users,
  Calendar,
  ClipboardCheck,
  User,
  Bell,
  Award,
  TrendingUp,
  Clock,
  FileText,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  BarChart3,
  Home,
  Settings,
  LogOut,
  Menu,
  X,
  DollarSign,
  Shield,
  Globe,
  Star,
  Building,
  UserCheck,
  Target,
  PieChart,
  CreditCard,
  Wallet,
  TrendingDown,
  Calculator,
  Receipt,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  Minus,
  Edit,
  Trash2,
  Loader2,
  Save,
  Phone,
  Upload,
  Crown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import ThemeToggle from '@/components/navigation/ThemeToggle';
import LanguageToggle from '@/components/navigation/LanguageToggle';
import { NotificationsPopover } from '@/components/navigation/NotificationsPopover';
import { useTranslation } from '@/lib/i18n';

import { usePageTitle } from "@/hooks/usePageTitle";
import { Player, Transfer, getTransfers, createTransfer, updateTransfer, deleteTransfer, getAcademyDashboardStats, Api } from '@/lib/api';
import { getDashboardPlayerTotal, hasCurrentSubscription, normalizeAcademyDashboardProfile } from '@/lib/academy-dashboard-data';
import CurrencySelect from '@/components/CurrencySelect';
import {
  DEFAULT_ACADEMY_CURRENCY,
  SUPPORTED_CURRENCIES,
  formatMoney,
  isSupportedCurrency,
} from '@shared/currencies';

const PlayerManagement = lazy(() => import('@/components/players/PlayerManagement'));
const TrainingAttendanceManager = lazy(() => import('@/components/training/TrainingAttendanceManager'));
const FinancialTransactionsManager = lazy(() => import('@/components/FinancialTransactionsManager'));
const PaymentMethodSelector = lazy(() => import('@/components/PaymentMethodSelector'));
const AcademyComplianceTab = lazy(() => import('@/components/academy/AcademyComplianceTab'));
const ComplianceDocuments = lazy(() => import('./ComplianceDocuments'));

// Mock data removed
// Player positions for dropdown
const playerPositions = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
  "Winger",
  "Striker",
  "Center Back",
  "Full Back",
  "Defensive Midfielder",
  "Attacking Midfielder"
];

const playersData: any[] = [];

const statsData = {};

// Add comprehensive financial data for the academy
const financialData: any = {};



export default function AcademyDashboard() {
  const { t, dir, language } = useTranslation();
  const { session } = useAuth();
  const isAgency = session?.role === 'agency_admin';
  const navigationLabels = {
    en: { open: 'Open menu', close: 'Close menu', logout: 'Sign out', training: 'Training' },
    es: { open: 'Abrir menú', close: 'Cerrar menú', logout: 'Cerrar sesión', training: 'Entrenamiento' },
    fr: { open: 'Ouvrir le menu', close: 'Fermer le menu', logout: 'Se déconnecter', training: 'Entraînement' },
    pt: { open: 'Abrir menu', close: 'Fechar menu', logout: 'Terminar sessão', training: 'Treino' },
    de: { open: 'Menü öffnen', close: 'Menü schließen', logout: 'Abmelden', training: 'Training' },
    it: { open: 'Apri menu', close: 'Chiudi menu', logout: 'Esci', training: 'Allenamento' },
    ar: { open: 'فتح القائمة', close: 'إغلاق القائمة', logout: 'تسجيل الخروج', training: 'التدريب' },
    zh: { open: '打开菜单', close: '关闭菜单', logout: '退出登录', training: '训练' },
  }[language];
  usePageTitle("Academy Dashboard");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [academyCurrency, setAcademyCurrency] = useState(DEFAULT_ACADEMY_CURRENCY);
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({
    name: "",
    location: "",
    established: "",
    email: "",
    phone: "",
    directorName: "",
    directorEmail: "",
    directorPhone: "",
    currency: DEFAULT_ACADEMY_CURRENCY,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Transfer management state
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [transferFormData, setTransferFormData] = useState({
    id: "",
    player_name: "",
    from_club: "",
    to_club: "",
    transfer_amount: 0,
    currency: DEFAULT_ACADEMY_CURRENCY,
    transfer_date: "",
    status: "pending" as "pending" | "completed" | "cancelled" | "approved" | "rejected",
    transfer_type: "permanent" as "permanent" | "loan" | "free_transfer",
    priority: "medium" as "high" | "low" | "medium"
  });

  // Player search state for live search functionality
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [playerSearchResults, setPlayerSearchResults] = useState<any[]>([]);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const playerSearchRef = useRef<HTMLDivElement>(null);

  // Authenticated academy data
  const [academyInfo, setAcademyInfo] = useState<any | null>(null);

  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState({
    totalPlayers: 0,
    activeTransfers: 0,
    monthlyRevenue: 0,
    recentTransfers: [],
    monthlyFinancialPerformance: []
  });

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Password is required");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      // Get user email from session or academyInfo
      const userEmail = session?.email || academyInfo?.email;

      if (!academyInfo?.id || !userEmail) {
        throw new Error("User information missing. Please refresh the page.");
      }

      const data = await Api.post<any>('/football-auth/academy/delete-account', {
        academyId: academyInfo.id,
        email: userEmail,
        password: deletePassword
      });

      if (!data.success) {
        throw new Error(data.message || 'Failed to delete account');
      }

      toast({
        title: "Account Deleted",
        description: "Your academy account has been permanently deleted.",
        variant: "destructive"
      });

      // Clear session and redirect
      clearSession();
      navigate('/login');

    } catch (error: any) {
      console.error('Delete account error:', error);
      setDeleteError(error.message || "An error occurred while deleting your account");
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Subscription state
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<any>(null);

  // Scroll to plan management function
  const scrollToPlanManagement = () => {
    // First switch to subscription tab
    setActiveTab("subscription");
    // Then scroll to the plan management section with a slight delay to allow rendering
    setTimeout(() => {
      const element = document.getElementById('plan-management');
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  useEffect(() => {
    const loadAcademyData = async () => {
      let data: any = null;
      const raw = localStorage.getItem('academy_data') || localStorage.getItem('agency_data');

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          console.error("Failed to parse academy_data from localStorage");
        }
      }

      // Render cached identity immediately, then always refresh the complete profile.
      const cachedProfile = normalizeAcademyDashboardProfile(data);
      if (cachedProfile) {
        setAcademyInfo(cachedProfile);
      }

      try {
        const currentSession = session as any;
        const organizationId = data?.id
          || currentSession?.schoolId
          || currentSession?.academyId
          || currentSession?.agencyId;
        const token = currentSession?.tokens?.accessToken
          || currentSession?.access_token
          || currentSession?.token;

        if (organizationId && token) {
          const isAgencySession = currentSession?.role === 'agency_admin' || currentSession?.agencyId;
          const endpoint = isAgencySession
            ? `/api/agencies/${organizationId}`
            : `/api/academies/${organizationId}`;
          const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await response.json();

          if (!response.ok || !result.success || !result.data) {
            throw new Error(result.error || result.message || 'Failed to load academy profile');
          }

          const refreshedProfile = normalizeAcademyDashboardProfile({
            ...data,
            ...result.data,
          });
          if (refreshedProfile) {
            data = refreshedProfile;
            localStorage.setItem(isAgencySession ? 'agency_data' : 'academy_data', JSON.stringify(data));
            setAcademyInfo(data);
          }
        }
      } catch (error) {
        console.error("Failed to refresh academy profile", error);
      }
    };

    loadAcademyData();
  }, [session?.userId, session?.tokens?.accessToken]);

  useEffect(() => {
    if (!academyInfo?.id || isAgency) return;

    let cancelled = false;
    getAcademyFinancialSettings(academyInfo.id)
      .then((settings) => {
        if (cancelled) return;
        const currency = settings.default_currency || DEFAULT_ACADEMY_CURRENCY;
        setAcademyCurrency(currency);
        setSettingsFormData((previous) => ({ ...previous, currency }));
      })
      .catch((error) => {
        console.error('Failed to load academy currency', error);
      });

    return () => {
      cancelled = true;
    };
  }, [academyInfo?.id, isAgency]);

  useEffect(() => {
    if (!editingTransfer) {
      setTransferFormData((previous) => ({ ...previous, currency: academyCurrency }));
    }
  }, [academyCurrency, editingTransfer]);

  // Load transfers from database
  const loadTransfers = async () => {
    if (!academyInfo?.id) return;

    setIsLoadingTransfers(true);
    try {
      const result = await getTransfers(academyInfo.id);
      if (result.success) {
        setTransfers(result.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load transfers",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast({
        title: "Error",
        description: "Failed to load transfers",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  // Load dashboard stats from database
  const loadDashboardStats = async () => {
    if (!academyInfo?.id) return;

    setIsLoadingStats(true);
    try {
      // Parallel fetch for all stats
      const [statsResult, playersResult, transfersResult] = await Promise.all([
        getAcademyDashboardStats(academyInfo.id).catch(error => {
          console.error('Failed to load aggregate dashboard stats:', error);
          return { success: false, data: {} } as any;
        }),
        Api.getPlayers(academyInfo.id, undefined, 1, 1).catch(error => {
          console.error('Failed to load dashboard player count:', error);
          return { success: false, data: { players: [], pagination: { total: 0 } } } as any;
        }),
        Api.getTransfers(academyInfo.id).catch(error => {
          console.error('Failed to load dashboard transfers:', error);
          return { success: false, data: [] } as any;
        })
      ]);

      // Calculate active transfers
      const activeTransfers = transfersResult.success && Array.isArray(transfersResult.data)
        ? transfersResult.data.filter((t: any) => t.status === 'pending' || t.status === 'approved').length
        : 0;

      // Get recent transfers from the transfers list (already fetched)
      const recentTransfers = transfersResult.success && Array.isArray(transfersResult.data)
        ? [...transfersResult.data].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
        : [];

      if (statsResult.success) {
        setDashboardStats(prev => ({
          ...statsResult.data,
          totalPlayers: getDashboardPlayerTotal(playersResult, statsResult),
          activeTransfers: activeTransfers,
          recentTransfers: recentTransfers,
          monthlyFinancialPerformance: statsResult.data.monthlyFinancialPerformance || prev.monthlyFinancialPerformance,
        }));
      } else {
        // Fallback if stats endpoint fails
        setDashboardStats(prev => ({
          ...prev,
          totalPlayers: getDashboardPlayerTotal(playersResult, statsResult),
          activeTransfers: activeTransfers,
          recentTransfers: recentTransfers,
          monthlyRevenue: 0,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Load subscription data from API
  const loadSubscriptionData = async () => {
    if (!academyInfo?.id) return;

    setIsLoadingSubscription(true);
    try {
      // Import the API function at the top of the file
      const data = await getCurrentSubscription(academyInfo.id);
      if (hasCurrentSubscription(data)) {
        // Map the API response to the UI model
        const planKey = data.subscription?.planName?.toLowerCase().includes('starter') ? 'starter' : 
                        data.subscription?.planName?.toLowerCase().includes('pro') ? 'pro' : 
                        data.subscription?.planName?.toLowerCase().includes('elite') ? 'elite' : 
                        data.subscription?.planName?.toLowerCase().includes('agency') ? 'elite' : 'starter';

        setSubscriptionData({
          id: data.subscription?.id,
          status: data.subscription?.status?.toLowerCase() || 'active',
          planName: t(`plans.${planKey}.name` as any) || data.subscription?.planName,
          price: data.subscription?.price || 0,
          billingCycle: 'month',
          startDate: data.subscription?.startDate,
          endDate: data.subscription?.endDate,
          autoRenew: data.subscription?.autoRenew,
          daysRemaining: data.subscription?.daysRemaining,
          playerLimit: data.limits?.playerLimit,
          playerCount: data.usage?.playerCount,
          playerUsagePercentage: data.usage?.playerUsagePercentage,
          features: (data.subscription?.features || []).map((f: string) => {
            const lowerF = f.toLowerCase();
            if (lowerF.includes('player')) {
              const count = f.match(/\d+/)?.[0] || data.limits?.playerLimit;
              return t('plans.feature.playerCount', { count });
            }
            if (lowerF.includes('analytics')) return t('plans.feature.analytics');
            if (lowerF.includes('priority support')) return t('plans.feature.prioritySupport');
            if (lowerF.includes('email support')) return t('plans.feature.emailSupport');
            if (lowerF.includes('registration')) return t('plans.feature.registration');
            if (lowerF.includes('training')) return t('plans.feature.trainingTracking');
            if (lowerF.includes('solidarity')) return t('plans.feature.solidarity');
            if (lowerF.includes('compliance')) return t('plans.feature.fullCompliance');
            if (lowerF.includes('24/7')) return t('plans.feature.247Support');
            return f;
          })
        });
      } else {
        setSubscriptionData(null);
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  // Load subscription history
  const loadSubscriptionHistory = async () => {
    if (!academyInfo?.id) return;

    try {
      const history = await getSubscriptionHistory(academyInfo.id);
      setSubscriptionHistory(history || []);
    } catch (error) {
      console.error('Error loading subscription history:', error);
    }
  };

  // Load available plans
  const loadAvailablePlans = async () => {
    try {
      console.log('Loading available plans...');
      const targetType = isAgency ? 'AGENCY' : 'ACADEMY';
      const response = await fetch(`/api/subscriptions/plans?targetType=${targetType}`);
      const result = await response.json();
      console.log('Plans API response:', result);

      if (result.success) {
        // The API returns { success: true, data: { plans: [...] } }
        // We need to extract the plans array correctly
        const plans = result.data?.plans || result.data || [];
        // Sort plans by price ascending
        const sortedPlans = [...plans].sort((a, b) => (a.price || 0) - (b.price || 0));
        setAvailablePlans(sortedPlans);
        console.log('Available plans set:', sortedPlans);
      } else {
        console.error('Failed to load plans:', result.error);
      }
    } catch (error) {
      console.error('Error loading available plans:', error);
    }
  };

  // Handle plan upgrade
  const handleUpgradePlan = async (planId: string) => {
    if (!academyInfo?.id) return;

    // Find the selected plan
    const selectedPlan = availablePlans.find(plan => plan.id === planId);
    if (!selectedPlan) {
      toast({
        title: "Error",
        description: "Selected plan not found",
        variant: "destructive",
      });
      return;
    }

    // Set the selected plan and show payment modal
    setSelectedPlanForUpgrade({
      id: selectedPlan.id,
      name: selectedPlan.name,
      price: selectedPlan.price,
      isFree: selectedPlan.is_free || selectedPlan.price === 0,
      billingCycle: String(selectedPlan.billing_cycle).toUpperCase() === 'YEARLY'
        ? 'yearly'
        : String(selectedPlan.billing_cycle).toUpperCase() === 'LIFETIME'
          ? 'lifetime'
          : 'monthly'
    });
    setShowPaymentModal(true);
  };

  // Handle successful payment/upgrade
  const handleUpgradeSuccess = () => {
    // Reload subscription data
    loadSubscriptionData();
    loadSubscriptionHistory();
    setSelectedPlanForUpgrade(null);
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!academyInfo?.id) return;

    setIsCancelling(true);
    try {
      const session = JSON.parse(localStorage.getItem("ipims_auth_session") || "{}");
      const token = session.tokens?.accessToken || session?.access_token || session?.token;

      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          academyId: academyInfo.id
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Subscription cancelled successfully",
        });
        // Reload subscription data
        loadSubscriptionData();
        loadSubscriptionHistory();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to cancel subscription",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle payment verification from URL params
  useEffect(() => {
    const verifyPayment = async (sessionId: string) => {
      try {
        const response = await fetch('/api/payments/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const result = await response.json();
        if (result.success) {
          toast({
            title: "Payment Successful",
            description: "Your subscription has been activated!",
          });
          loadSubscriptionData();
          loadSubscriptionHistory();
        } else {
          toast({
            title: "Payment Verification Failed",
            description: result.message || "Please contact support.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        toast({
          title: "Error",
          description: "Failed to verify payment. Please contact support.",
          variant: "destructive",
        });
      }
    };

    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.get('payment_success');
    const sessionId = params.get('session_id');
    const paymentCancelled = params.get('payment_cancelled');

    if (paymentSuccess && sessionId) {
      verifyPayment(sessionId);
      const newUrl = window.location.pathname + '?tab=subscription';
      window.history.replaceState({}, '', newUrl);
    } else if (paymentCancelled) {
      toast({
        title: "Payment Cancelled",
        description: "You have cancelled the payment process.",
      });
      const newUrl = window.location.pathname + '?tab=subscription';
      window.history.replaceState({}, '', newUrl);
    }
  }, []);



  // Load transfers when academy info is available
  useEffect(() => {
    if (academyInfo?.id) {
      loadTransfers();
      loadDashboardStats();
      loadSubscriptionData();
      loadSubscriptionHistory();
      loadAvailablePlans();
    }
  }, [academyInfo?.id, academyCurrency]);

  // Click outside handler for player search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (playerSearchRef.current && !playerSearchRef.current.contains(event.target as Node)) {
        setShowPlayerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize settings form data
  useEffect(() => {
    const currentData = academyInfo || {};
    setSettingsFormData({
      name: currentData.name || "",
      location: currentData.address || currentData.location || "",
      established: currentData.foundedYear || currentData.established || "",
      email: currentData.email || "",
      phone: currentData.phone || "",
      directorName: currentData.directorName || currentData.director?.name || currentData.contactPerson || "",
      directorEmail: currentData.directorEmail || currentData.director?.email || "",
      directorPhone: currentData.directorPhone || currentData.director?.phone || "",
      currency: academyCurrency,
    });
  }, [academyInfo, academyCurrency]);

  const displayAcademyName = academyInfo?.name || "";
  const displayName = academyInfo?.contactPerson || academyInfo?.name || "";
  const getInitials = (name: string) => (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase())
    .join('') || "";

  // Filter functions for different tabs
  const filteredTransactions = (financialData.recentTransactions || []).filter((transaction: any) =>
    searchQuery === "" ||
    transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.amount.toString().includes(searchQuery)
  );

  const handleLogout = () => {
    clearSession();
    navigate("/portal");
  };

  const handleTopNavCurrencyChange = async (currency: string) => {
    if (currency === academyCurrency || !academyInfo?.id || isAgency) return;

    const previousCurrency = academyCurrency;
    setIsSavingCurrency(true);
    setAcademyCurrency(currency);
    setSettingsFormData((previous) => ({ ...previous, currency }));

    try {
      const settings = await updateAcademyFinancialSettings(academyInfo.id, {
        default_currency: currency,
      });
      const savedCurrency = settings.default_currency || currency;
      setAcademyCurrency(savedCurrency);
      setSettingsFormData((previous) => ({ ...previous, currency: savedCurrency }));
      setAcademyInfo((previous: any) => previous ? { ...previous, currency: savedCurrency } : previous);

      const rawAcademyData = localStorage.getItem('academy_data');
      if (rawAcademyData) {
        try {
          localStorage.setItem('academy_data', JSON.stringify({
            ...JSON.parse(rawAcademyData),
            currency: savedCurrency,
          }));
        } catch {
          // A malformed cache must not prevent the saved database setting from taking effect.
        }
      }

      toast({
        title: 'Currency Updated',
        description: `New academy financial records will use ${savedCurrency}.`,
      });
    } catch (error: any) {
      setAcademyCurrency(previousCurrency);
      setSettingsFormData((previous) => ({ ...previous, currency: previousCurrency }));
      toast({
        title: 'Currency Update Failed',
        description: error?.message || 'Could not update the academy currency.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingCurrency(false);
    }
  };

  // Settings form handlers
  const handleInputChange = (field: string, value: string) => {
    setSettingsFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditSettings = () => {
    setIsEditingSettings(true);
  };

  const handleCancelEdit = () => {
    setIsEditingSettings(false);
    // Reset form data to original values
    const currentData = academyInfo || {};
    setSettingsFormData({
      name: currentData.name || "",
      location: currentData.address || currentData.location || "",
      established: currentData.foundedYear || currentData.established || "",
      email: currentData.email || "",
      phone: currentData.phone || "",
      directorName: currentData.directorName || currentData.director?.name || currentData.contactPerson || "",
      directorEmail: currentData.directorEmail || currentData.director?.email || "",
      directorPhone: currentData.directorPhone || currentData.director?.phone || "",
      currency: academyCurrency,
    });
  };

  const handleSaveSettings = async () => {
    try {
      if (!isAgency && settingsFormData.currency !== academyCurrency && !isSupportedCurrency(settingsFormData.currency)) {
        throw new Error('Select a supported academy currency');
      }

      // Get auth token
      const session = JSON.parse(localStorage.getItem("ipims_auth_session") || "{}");
      const token = session.tokens?.accessToken || session?.access_token || session?.token;

      // Fallback ID from session
      const academyId = academyInfo?.id || session?.schoolId || session?.academyId || session?.agencyId;

      if (!academyId) {
        toast({
          title: "Error",
          description: "Academy ID not found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Prepare API payload
      const apiPayload = {
        name: settingsFormData.name,
        address: settingsFormData.location,
        email: settingsFormData.email,
        phone: settingsFormData.phone,
        directorName: settingsFormData.directorName,
        directorEmail: settingsFormData.directorEmail,
        directorPhone: settingsFormData.directorPhone,
        foundedYear: settingsFormData.established ? parseInt(settingsFormData.established) : undefined
      };

      // Call API
      const endpoint = isAgency ? `/api/agencies/${academyId}` : `/api/academies/${academyId}`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiPayload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to update academy information");
      }

      const financialSettings = !isAgency && settingsFormData.currency !== academyCurrency
        ? await updateAcademyFinancialSettings(academyId, {
            default_currency: settingsFormData.currency,
          })
        : null;
      const savedCurrency = financialSettings?.default_currency || academyCurrency;
      setAcademyCurrency(savedCurrency);

      // Update local storage with new data (merging with existing structure)
      const savedData = result.data || {};
      const directorName = savedData.directorName || savedData.director_name || settingsFormData.directorName;
      const directorEmail = savedData.directorEmail || savedData.director_email || settingsFormData.directorEmail;
      const directorPhone = savedData.directorPhone || savedData.director_phone || settingsFormData.directorPhone;
      const updatedAcademyData = {
        ...academyInfo,
        ...savedData,
        name: savedData.name || settingsFormData.name,
        address: savedData.address || settingsFormData.location,
        location: savedData.address || settingsFormData.location,
        phone: savedData.phone || settingsFormData.phone,
        directorName,
        directorEmail,
        directorPhone,
        foundedYear: savedData.foundedYear || savedData.founded_year || settingsFormData.established,
        established: savedData.foundedYear || savedData.founded_year || settingsFormData.established,
        currency: savedCurrency,
        profileComplete: true,
        director: {
          name: directorName,
          email: directorEmail,
          phone: directorPhone
        }
      };

      localStorage.setItem('academy_data', JSON.stringify(updatedAcademyData));
      setAcademyInfo(updatedAcademyData);
      setIsEditingSettings(false);

      toast({
        title: "Settings Updated",
        description: "Academy information has been successfully updated.",
      });
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update academy information. Please try again.",
        variant: "destructive",
      });
    }
  };



  // Transfer CRUD handlers
  const handleAddTransfer = () => {
    setTransferFormData({
      id: "",
      player_name: "",
      from_club: "",
      to_club: "",
      transfer_amount: 0,
      currency: academyCurrency,
      transfer_date: new Date().toISOString().split('T')[0],
      status: "pending",
      transfer_type: "permanent",
      priority: "medium"
    });
    setEditingTransfer(null);
    setSelectedPlayer(null);
    setPlayerSearchQuery("");
    setPlayerSearchResults([]);
    setShowPlayerDropdown(false);
    setIsAddingTransfer(true);
  };

  const handleEditTransfer = (transfer: Transfer) => {
    setTransferFormData({
      id: transfer.id,
      player_name: transfer.player_name,
      from_club: transfer.from_club,
      to_club: transfer.to_club,
      transfer_amount: transfer.transfer_amount || 0,
      currency: transfer.currency,
      transfer_date: transfer.transfer_date,
      status: transfer.status,
      transfer_type: transfer.transfer_type,
      priority: transfer.priority
    });
    setEditingTransfer(transfer);
    setIsAddingTransfer(true);
  };

  const handleDeleteTransfer = async (transferId: string) => {
    try {
      const result = await deleteTransfer(transferId);
      if (result.success) {
        setTransfers(prev => prev.filter(t => t.id !== transferId));
        toast({
          title: "Transfer Deleted",
          description: "Transfer record has been successfully deleted.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete transfer",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting transfer:', error);
      toast({
        title: "Error",
        description: "Failed to delete transfer",
        variant: "destructive",
      });
    }
  };

  const handleSaveTransfer = async () => {
    if (!academyInfo?.id) {
      toast({
        title: "Error",
        description: "Academy information not available",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!transferFormData.player_name || transferFormData.player_name.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Player name is required",
        variant: "destructive",
      });
      return;
    }

    if (!transferFormData.from_club || transferFormData.from_club.trim() === '') {
      toast({
        title: "Validation Error",
        description: "From club is required",
        variant: "destructive",
      });
      return;
    }

    if (!transferFormData.to_club || transferFormData.to_club.trim() === '') {
      toast({
        title: "Validation Error",
        description: "To club is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingTransfer) {
        // Update existing transfer
        const result = await updateTransfer(editingTransfer.id, transferFormData);
        if (result.success) {
          setTransfers(prev => prev.map(t =>
            t.id === editingTransfer.id ? result.data : t
          ));
          toast({
            title: "Transfer Updated",
            description: "Transfer record has been successfully updated.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to update transfer",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Add new transfer
        const transferData = {
          ...transferFormData,
          academyId: academyInfo.id,
          createdBy: academyInfo.id // Use academy ID as creator for now
        };

        console.log('Transfer data being sent:', transferData);
        console.log('Form data:', transferFormData);

        const result = await createTransfer(transferData);
        if (result.success) {
          setTransfers(prev => [result.data, ...prev]);
          toast({
            title: "Transfer Added",
            description: "New transfer record has been successfully created.",
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create transfer",
            variant: "destructive",
          });
          return;
        }
      }

      setIsAddingTransfer(false);
      setEditingTransfer(null);
    } catch (error) {
      console.error('Error saving transfer:', error);
      toast({
        title: "Error",
        description: "Failed to save transfer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelTransfer = () => {
    setIsAddingTransfer(false);
    setEditingTransfer(null);
    setSelectedPlayer(null);
    setPlayerSearchQuery("");
    setPlayerSearchResults([]);
    setShowPlayerDropdown(false);
    setTransferFormData({
      id: "",
      player_name: "",
      from_club: "",
      to_club: "",
      transfer_amount: 0,
      currency: academyCurrency,
      transfer_date: "",
      status: "pending",
      transfer_type: "permanent",
      priority: "medium"
    });
  };

  const handleTransferInputChange = (field: string, value: string | number) => {
    setTransferFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Player search functionality
  const handlePlayerSearch = async (query: string) => {
    setPlayerSearchQuery(query);

    if (query.length < 2) {
      setPlayerSearchResults([]);
      setShowPlayerDropdown(false);
      return;
    }

    try {
      // Get academy ID from session
      const session = JSON.parse(localStorage.getItem("ipims_auth_session") || "{}");
      const academyId = session?.schoolId || session?.academyId || session?.agencyId;

      // Search players using the API
      const response = await Api.searchPlayers(query, academyId, 10);

      if (response.success && response.data) {
        setPlayerSearchResults(response.data);
        setShowPlayerDropdown(true);
      } else {
        setPlayerSearchResults([]);
        setShowPlayerDropdown(false);
      }
    } catch (error) {
      console.error('Error searching players:', error);
      setPlayerSearchResults([]);
      setShowPlayerDropdown(false);
    }
  };

  const handlePlayerSelect = (player: any) => {
    setSelectedPlayer(player);
    setPlayerSearchQuery(player.name);
    setTransferFormData(prev => ({
      ...prev,
      player_name: player.name,
      from_club: player.currentClub
    }));
    setShowPlayerDropdown(false);
  };

  const handlePlayerInputChange = (value: string) => {
    setTransferFormData(prev => ({
      ...prev,
      player_name: value
    }));
    handlePlayerSearch(value);
  };

  const sidebarItems = [
    { id: "dashboard", label: t('dash.menu.dashboard'), icon: Home },
    { id: "players", label: t('dash.menu.players'), icon: Users },
    { id: "training", label: navigationLabels.training, icon: ClipboardCheck },
    { id: "transfers", label: t('dash.menu.transfers'), icon: TrendingUp },
    { id: "finances", label: t('dash.menu.finances'), icon: DollarSign },
    { id: "fifa-compliance", label: t('dash.menu.compliance'), icon: Shield },
    { id: "subscription", label: t('dash.stats.subscription'), icon: CreditCard },
    { id: "settings", label: t('dash.menu.settings'), icon: Settings }
  ];
  const mobileBottomItems = sidebarItems.filter((item) =>
    ["dashboard", "players", "transfers", "finances"].includes(item.id),
  );
  const isMobileMoreActive = !mobileBottomItems.some((item) => item.id === activeTab);
  const selectedCurrency = SUPPORTED_CURRENCIES.find(({ code }) => code === academyCurrency);

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50 dark:bg-slate-900" dir={dir}>
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Academy Name */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 lg:hidden"
                aria-label={isSidebarOpen ? navigationLabels.close : navigationLabels.open}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center shadow-xl">
                    <Trophy className="h-5 w-5 text-[#005391]" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <Star className="h-2 w-2 text-white" />
                  </div>
                </div>
                <div className="hidden min-w-0 sm:block">
                  <h1 className="truncate text-lg font-bold text-slate-900 dark:text-white">
                    {displayAcademyName}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{isAgency ? 'Agency Dashboard' : 'Academy Dashboard'}</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={t('dash.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-3 lg:gap-4">
              {!isAgency && academyInfo?.id && (
                <Select
                  value={academyCurrency}
                  onValueChange={handleTopNavCurrencyChange}
                  disabled={isSavingCurrency}
                >
                  <SelectTrigger
                    className="h-9 w-[78px] gap-1 px-2 sm:w-[96px]"
                    aria-label="Switch academy currency"
                    title="Academy currency"
                  >
                    {isSavingCurrency ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <Banknote className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                    <span className="truncate text-xs font-semibold">
                      {selectedCurrency?.symbol ? `${selectedCurrency.symbol} ` : ''}{academyCurrency}
                    </span>
                  </SelectTrigger>
                  <SelectContent
                    align="end"
                    className="max-h-80 min-w-[280px]"
                    viewportClassName="currency-select-scrollbar overscroll-contain pr-1"
                    showScrollButtons={false}
                  >
                    {!isSupportedCurrency(academyCurrency) && (
                      <SelectItem value={academyCurrency}>{academyCurrency} — current legacy currency</SelectItem>
                    )}
                    {SUPPORTED_CURRENCIES.map(({ code, name, symbol }) => (
                      <SelectItem key={code} value={code}>
                        {symbol} {code} — {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <NotificationsPopover />
              <LanguageToggle />
              <ThemeToggle />
              <div className="hidden items-center gap-3 md:flex">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={academyInfo?.logo} />
                  <AvatarFallback className="bg-blue-600 text-white font-bold">{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {t('dash.role')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
                aria-label={navigationLabels.logout}
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex items-start">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen
          ? 'translate-x-0'
          : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
          } ${dir === 'rtl'
            ? 'right-0 border-l-4 lg:right-auto'
            : 'left-0 border-r-4 lg:left-auto'
          } fixed top-16 z-50 h-[calc(100dvh-4rem)] w-64 overflow-y-auto border-yellow-400 bg-gradient-to-b from-[#005391] to-[#0066b3] transition-transform duration-300 ease-in-out lg:sticky lg:top-16 lg:translate-x-0 lg:self-start shrink-0`}>
          <div className="flex h-full flex-col">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`w-full text-white hover:bg-white/20 transition-all duration-300 ${dir === 'rtl' ? 'justify-end text-right' : 'justify-start text-left'} ${activeTab === item.id
                      ? `${dir === 'rtl' ? 'border-r-4' : 'border-l-4'} bg-white/20 border-yellow-400 shadow-lg`
                      : `${dir === 'rtl' ? 'border-r-4' : 'border-l-4'} border-transparent hover:border-yellow-400/50`
                      }`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setActiveView('main'); // Reset to main view when navigating via sidebar
                      setIsSidebarOpen(false);
                    }}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${dir === 'rtl' ? 'ml-3' : 'mr-3'}`} />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
            <div className="border-t border-white/20 p-4 md:hidden">
              <div className="mb-3 flex items-center gap-3 text-white">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={academyInfo?.logo} />
                  <AvatarFallback className="bg-white/20 font-bold text-white">{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-white/70">{t('dash.role')}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/20 hover:text-white"
                onClick={handleLogout}
              >
                <LogOut className={`h-5 w-5 ${dir === 'rtl' ? 'ml-3' : 'mr-3'}`} />
                {navigationLabels.logout}
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-visible pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            {/* Sticky Navigation Section */}
            <div className="sticky top-16 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
              {/* Incomplete Profile Banner */}
              {academyInfo && (
                (!academyInfo.address || academyInfo.address.trim() === '') ||
                (!academyInfo.phone || academyInfo.phone.trim() === '') ||
                (!academyInfo.directorName || academyInfo.directorName.trim() === '')
              ) && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 w-full">
                    <div className="flex justify-between items-center max-w-7xl mx-auto">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            {t('dash.profile.incomplete')}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-yellow-700 border-yellow-700 hover:bg-yellow-100"
                          onClick={() => setActiveTab('settings')}
                        >
                          {t('dash.menu.settings')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Tabs Navigation */}
              <div className="mx-auto hidden w-full max-w-7xl overflow-x-auto px-4 py-2 sm:px-6 lg:block">
                <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-1 lg:grid lg:w-full lg:grid-cols-8">
                  <TabsTrigger className="shrink-0 px-3 py-2" value="dashboard">{t('dash.menu.dashboard')}</TabsTrigger>
                  <TabsTrigger className="shrink-0 px-3 py-2" value="players">{t('dash.menu.players')}</TabsTrigger>
                  <TabsTrigger className="shrink-0 px-3 py-2" value="training">{navigationLabels.training}</TabsTrigger>
                  <TabsTrigger className="shrink-0 px-3 py-2" value="transfers">{t('dash.menu.transfers')}</TabsTrigger>
                  <TabsTrigger className="shrink-0 px-3 py-2" value="finances">{t('dash.menu.finances')}</TabsTrigger>
                  <TabsTrigger className="shrink-0 px-3 py-2" value="fifa-compliance">{t('dash.menu.compliance')}</TabsTrigger>
                  <TabsTrigger className="shrink-0 px-3 py-2" value="subscription">{t('dash.stats.subscription')}</TabsTrigger>
                  <TabsTrigger className="shrink-0 px-3 py-2" value="settings">{t('dash.menu.settings')}</TabsTrigger>
                </TabsList>
              </div>

              {/* Contextual Toolbar (Sticky) */}
              {activeTab === 'settings' && (
                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
                  <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Settings className="h-5 w-5 text-blue-600" />
                      {t('dash.menu.settings')}
                    </h2>
                    <div className="flex gap-2">
                      {isEditingSettings ? (
                        <>
                          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 mr-2" />
                            {t('common.cancel')}
                          </Button>
                          <Button size="sm" onClick={handleSaveSettings} className="bg-blue-600 hover:bg-blue-700">
                            <Save className="h-4 w-4 mr-2" />
                            {t('common.save')}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={handleEditSettings}>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 p-4 sm:p-6">
              {activeView === 'compliance-documents' ? (
                <ComplianceDocuments onBack={() => setActiveView('main')} />
              ) : (
                <>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {t('dash.welcome')} {displayAcademyName}
                      </h2>
                      <p className="text-slate-600 dark:text-slate-400">
                        {t('dash.stats.overview')}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {academyInfo?.id}
                    </Badge>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{t('dash.stats.players')}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              {isLoadingStats ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                              ) : (
                                dashboardStats.totalPlayers
                              )}
                            </p>
                          </div>
                          <Users className="h-8 w-8 text-[#005391]" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{t('dash.stats.transfers')}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              {isLoadingStats ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                              ) : (
                                dashboardStats.activeTransfers
                              )}
                            </p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{t('dash.stats.revenue')}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              {isLoadingStats ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                              ) : (
                                formatMoney(dashboardStats.monthlyRevenue, academyCurrency)
                              )}
                            </p>
                          </div>
                          <DollarSign className="h-8 w-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>



                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{t('dash.stats.subscription')}</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                              {isLoadingSubscription ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                subscriptionData?.planName || "No active plan"
                              )}
                            </p>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-sm text-blue-600 mt-1"
                              onClick={() => {
                                console.log('Scrolling to plan management');
                                scrollToPlanManagement();
                              }}
                            >
                              {t('dash.plan.manage')}
                            </Button>
                          </div>
                          <div className="flex flex-col items-end">
                            <Star className="h-6 w-6 text-yellow-500 mb-1" />
                            {subscriptionData && (
                              <Badge
                                variant="outline"
                                className={`${subscriptionData.status === 'active'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                                  } text-xs`}
                              >
                                {subscriptionData.status === 'active' ? t('dash.plan.active') : t('dash.plan.inactive')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Monthly Financial Performance Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        {t('dash.financial.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingStats ? (
                        <div className="flex items-center justify-center h-64">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Legend */}
                          <div className="flex items-center justify-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span>{t('dash.financial.revenue')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span>{t('dash.financial.expenses')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span>{t('dash.financial.profit')}</span>
                            </div>
                          </div>

                          {/* Chart */}
                          <div className="flex items-end justify-between gap-4 h-64 px-4">
                            {dashboardStats.monthlyFinancialPerformance?.map((monthData, index) => {
                              // Calculate heights based on the maximum value for proper scaling
                              const maxValue = Math.max(
                                ...dashboardStats.monthlyFinancialPerformance.map(m =>
                                  Math.max(m.revenue, m.expenses, Math.abs(m.profit))
                                )
                              );
                              const chartHeight = 192; // 48 * 4 (h-48 in pixels)

                              const revenueHeight = maxValue > 0 ? Math.max(8, (monthData.revenue / maxValue) * chartHeight) : 8;
                              const expensesHeight = maxValue > 0 ? Math.max(4, (monthData.expenses / maxValue) * chartHeight) : 4;
                              const profitHeight = maxValue > 0 && monthData.profit > 0 ? Math.max(4, (monthData.profit / maxValue) * chartHeight) : 4;

                              return (
                                <div key={index} className="flex flex-col items-center gap-2 flex-1">
                                  <div className="relative w-full max-w-12 h-48 bg-gray-100 rounded-sm overflow-hidden">
                                    {/* Revenue bar (green) */}
                                    <div
                                      className="absolute bottom-0 w-full bg-green-500"
                                      style={{ height: `${revenueHeight}px` }}
                                      title={`${t('dash.financial.revenue')}: ${formatMoney(monthData.revenue, academyCurrency)}`}
                                    ></div>
                                    {/* Expenses bar (red) */}
                                    <div
                                      className="absolute bottom-0 w-full bg-red-500"
                                      style={{ height: `${expensesHeight}px` }}
                                      title={`${t('dash.financial.expenses')}: ${formatMoney(monthData.expenses, academyCurrency)}`}
                                    ></div>
                                    {/* Profit bar (blue) - only show if positive */}
                                    {monthData.profit > 0 && (
                                      <div
                                        className="absolute bottom-0 w-full bg-blue-500"
                                        style={{ height: `${profitHeight}px` }}
                                        title={`${t('dash.financial.profit')}: ${formatMoney(monthData.profit, academyCurrency)}`}
                                      ></div>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-600">{monthData.month}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Summary */}
                          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                            <div className="text-center">
                              <div className="text-sm text-slate-600">{t('dash.financial.revenue')}</div>
                              <div className="text-lg font-semibold text-green-600">
                                {formatMoney(dashboardStats.monthlyFinancialPerformance?.reduce((sum, month) => sum + month.revenue, 0) || 0, academyCurrency)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-slate-600">{t('dash.financial.expenses')}</div>
                              <div className="text-lg font-semibold text-red-600">
                                {formatMoney(dashboardStats.monthlyFinancialPerformance?.reduce((sum, month) => sum + month.expenses, 0) || 0, academyCurrency)}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-slate-600">{t('dash.financial.profit')}</div>
                              <div className="text-lg font-semibold text-blue-600">
                                {formatMoney(dashboardStats.monthlyFinancialPerformance?.reduce((sum, month) => sum + month.profit, 0) || 0, academyCurrency)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Transfers */}
                  <div className="grid grid-cols-1 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Recent Transfers
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {isLoadingStats ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : dashboardStats.recentTransfers.length > 0 ? (
                          dashboardStats.recentTransfers.map((transfer: any) => (
                            <div key={transfer.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{transfer.player_name}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{transfer.from_club} → {transfer.to_club} - {transfer.transfer_amount ? formatMoney(transfer.transfer_amount, transfer.currency || academyCurrency) : 'N/A'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(transfer.transfer_date).toLocaleDateString()}</p>
                              </div>
                              <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                                {transfer.status}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="text-center p-4 text-slate-500 dark:text-slate-400">
                            No recent transfers found
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Players Tab */}
                <TabsContent value="players" className="space-y-6">
                  <PlayerManagement
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                  />
                </TabsContent>

                {/* Training sessions and player attendance */}
                <TabsContent value="training" className="space-y-6">
                  {academyInfo?.id ? (
                    <TrainingAttendanceManager academyId={academyInfo.id} />
                  ) : (
                    <Card>
                      <CardContent className="flex min-h-48 items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Preparing training…
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Other tabs would be implemented similarly */}
                <TabsContent value="transfers" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dash.transfers.title')}</h2>
                    <Button onClick={handleAddTransfer}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('dash.transfers.new')}
                    </Button>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      {t('dash.transfers.alert')}
                    </AlertDescription>
                  </Alert>

                  <Card>
                    <CardHeader>
                      <CardTitle>{t('dash.transfers.history')}</CardTitle>
                      <CardDescription>
                        {t('dash.transfers.historyDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {isLoadingTransfers ? (
                          <div className="text-center py-8">
                            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                            <p>{t('dash.transfers.loading')}</p>
                          </div>
                        ) : transfers.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{t('dash.transfers.empty')}</p>
                          </div>
                        ) : (
                          transfers.map((transfer) => (
                            <div key={transfer.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg">{transfer.player_name}</h3>
                                  <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-slate-600">
                                    <p><span className="font-medium">{t('dash.transfers.from')}:</span> {transfer.from_club}</p>
                                    <p><span className="font-medium">{t('dash.transfers.to')}:</span> {transfer.to_club}</p>
                                    <p><span className="font-medium">{t('dash.transfers.date')}:</span> {new Date(transfer.transfer_date).toLocaleDateString()}</p>
                                    <p><span className="font-medium">{t('dash.transfers.amount')}:</span> {transfer.transfer_amount ? formatMoney(transfer.transfer_amount, transfer.currency || academyCurrency) : 'N/A'}</p>
                                    <p><span className="font-medium">{t('dash.transfers.type')}:</span> {transfer.transfer_type}</p>
                                    <p><span className="font-medium">{t('dash.transfers.priority')}:</span> {transfer.priority}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                                    {transfer.status}
                                  </Badge>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditTransfer(transfer)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteTransfer(transfer.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Transfer Form Dialog */}
                  <Dialog open={isAddingTransfer} onOpenChange={setIsAddingTransfer}>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingTransfer ? 'Edit Transfer' : t('dash.transfers.new')}
                        </DialogTitle>
                        <DialogDescription>
                          {editingTransfer
                            ? 'Update the transfer information below.'
                            : 'Enter the details for the new player transfer.'
                          }
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2 relative" ref={playerSearchRef}>
                          <Label htmlFor="player-name">Player Name</Label>
                          <Input
                            id="player-name"
                            value={transferFormData.player_name}
                            onChange={(e) => handlePlayerInputChange(e.target.value)}
                            placeholder="Search for player name..."
                            autoComplete="off"
                          />
                          {showPlayerDropdown && playerSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                              {playerSearchResults.map((player) => (
                                <div
                                  key={player.id}
                                  className="px-3 py-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-b-0"
                                  onClick={() => handlePlayerSelect(player)}
                                >
                                  <div className="font-medium text-sm">{player.name}</div>
                                  <div className="text-xs text-slate-500">
                                    {player.position} • {player.currentClub}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="transfer-amount">Transfer Amount</Label>
                          <Input
                            id="transfer-amount"
                            type="number"
                            value={transferFormData.transfer_amount || ''}
                            onChange={(e) => handleTransferInputChange('transfer_amount', parseFloat(e.target.value) || 0)}
                            placeholder="15000"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <CurrencySelect
                            id="currency"
                            value={transferFormData.currency}
                            onValueChange={(value) => handleTransferInputChange('currency', value)}
                            aria-label="Transfer currency"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="from-club">From Club</Label>
                          <Input
                            id="from-club"
                            value={transferFormData.from_club}
                            onChange={(e) => handleTransferInputChange('from_club', e.target.value)}
                            placeholder="Enter source club"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="to-club">To Club</Label>
                          <Input
                            id="to-club"
                            value={transferFormData.to_club}
                            onChange={(e) => handleTransferInputChange('to_club', e.target.value)}
                            placeholder="Enter destination club"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="transfer-date">Transfer Date</Label>
                          <Input
                            id="transfer-date"
                            type="date"
                            value={transferFormData.transfer_date}
                            onChange={(e) => handleTransferInputChange('transfer_date', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="transfer-type">Transfer Type</Label>
                          <Select
                            value={transferFormData.transfer_type}
                            onValueChange={(value) => handleTransferInputChange('transfer_type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="permanent">Permanent</SelectItem>
                              <SelectItem value="loan">Loan</SelectItem>
                              <SelectItem value="free">Free Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={transferFormData.priority}
                            onValueChange={(value) => handleTransferInputChange('priority', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="transfer-status">Status</Label>
                          <Select
                            value={transferFormData.status}
                            onValueChange={(value) => handleTransferInputChange('status', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={handleCancelTransfer}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveTransfer}>
                          {editingTransfer ? 'Update Transfer' : 'Add Transfer'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                {/* FIFA Compliance Tab */}
                <TabsContent value="fifa-compliance" className="space-y-6">
                  <AcademyComplianceTab academyId={academyInfo?.id} />
                </TabsContent>

                {/* Finances Tab */}
                <TabsContent value="finances" className="space-y-6">
                  {academyInfo?.id && academyInfo?.address && academyInfo?.phone && academyInfo?.directorName ? (
                    <FinancialTransactionsManager
                      academyId={academyInfo?.id}
                      academyDetails={academyInfo}
                      currency={academyCurrency}
                      onCurrencyChange={setAcademyCurrency}
                    />
                  ) : (
                    <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10">
                      <CardHeader>
                        <CardTitle className="flex items-center text-yellow-700 dark:text-yellow-500">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          {t('dash.profile.completeRequired') || "Profile Completion Required"}
                        </CardTitle>
                        <CardDescription className="text-yellow-700/80 dark:text-yellow-500/80">
                          {t('dash.profile.completeRequiredDesc') || "You must complete your academy profile information before accessing financial features."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-6 text-slate-700 dark:text-slate-300">
                          {t('dash.profile.completeRequiredMsg') || "To ensure accurate financial reporting and invoicing, we require your academy address, phone number, and director information."}
                        </p>
                        <Button onClick={() => {
                          setActiveTab("settings");
                          setIsEditingSettings(true);
                          // Optional: Scroll to settings
                          setTimeout(() => {
                            const element = document.querySelector('[value="settings"]');
                            if (element) element.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}>
                          {t('dash.settings.complete') || "Complete Profile"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Subscription Tab */}
                <TabsContent value="subscription" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dash.stats.subscription')}</h2>
                    {subscriptionData && (
                      <Badge variant="outline" className={`${subscriptionData.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {subscriptionData.status === 'active' ? t('dash.plan.active') : t('dash.plan.inactive')}
                      </Badge>
                    )}
                  </div>

                  {isLoadingSubscription ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <span className="ml-2">{t('dash.transfers.loading')}</span>
                    </div>
                  ) : subscriptionData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Current Plan */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" />
                            {t('dash.plan.current')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold">{subscriptionData.planName}</span>
                            <Badge className="bg-blue-600 text-white">
                              ${subscriptionData.price}/{subscriptionData.billingCycle || 'month'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {subscriptionData.endDate && (
                              <div className="flex justify-between text-sm">
                                <span>{t('dash.plan.nextBilling')}:</span>
                                <span className="font-medium">
                                  {new Date(subscriptionData.endDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {subscriptionData.startDate && (
                              <div className="flex justify-between text-sm">
                                <span>{t('dash.plan.started')}</span>
                                <span className="font-medium">
                                  {new Date(subscriptionData.startDate).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span>{t('dash.plan.status')}</span>
                              <Badge variant="outline" className={`${subscriptionData.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                {subscriptionData.status}
                              </Badge>
                            </div>
                            {subscriptionData.daysRemaining !== undefined && (
                              <div className="flex justify-between text-sm">
                                <span>{t('dash.plan.daysRemaining')}</span>
                                <span className="font-medium">{subscriptionData.daysRemaining} days</span>
                              </div>
                            )}
                          </div>
                          {subscriptionData.features && (
                            <div className="pt-4 border-t">
                              <h4 className="font-medium mb-2">{t('dash.plan.features')}</h4>
                              <ul className="text-sm space-y-1 text-slate-600">
                                {subscriptionData.features.map((feature: string, index: number) => (
                                  <li key={index}>• {feature}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Usage Statistics */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-600" />
                            {t('dash.plan.usage')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            {subscriptionData.playerLimit && (
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>{t('dash.stats.players')}</span>
                                  <span>
                                    {subscriptionData.playerCount || 0} / {subscriptionData.playerLimit === -1 ? t('common.unlimited') : subscriptionData.playerLimit}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${subscriptionData.playerLimit === -1
                                      ? 'bg-blue-600'
                                      : ((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 1
                                        ? 'bg-red-600'
                                        : ((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 0.8
                                          ? 'bg-yellow-600'
                                          : 'bg-blue-600'
                                      }`}
                                    style={{
                                      width: `${subscriptionData.playerLimit === -1
                                        ? 100
                                        : Math.min(((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) * 100, 100)
                                        }%`
                                    }}
                                  ></div>
                                </div>
                                {subscriptionData.playerLimit !== -1 && ((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 0.8 && (
                                  <div className="mt-2">
                                    <Button
                                      size="sm"
                                      onClick={scrollToPlanManagement}
                                      className={`w-full ${((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 1
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        }`}
                                    >
                                      <Crown className="h-4 w-4 mr-2" />
                                      {((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 1
                                        ? t('dash.plan.upgradeRequired')
                                        : t('dash.plan.upgradeNearLimit')
                                      }
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Billing History */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-slate-600" />
                            {t('dash.plan.billingHistory')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {subscriptionHistory.length > 0 ? (
                              subscriptionHistory.slice(0, 5).map((record: any, index: number) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                  <div>
                                    <div className="font-medium">
                                      {new Date(record.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-slate-600">{record.action}</div>
                                    {record.notes && (
                                      <div className="text-xs text-slate-500">{record.notes}</div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    {record.newPlanName && (
                                      <div className="font-medium">{record.newPlanName}</div>
                                    )}
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                      {record.action}
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center text-slate-500 py-4">
                                {t('dash.finance.manager.noTrans')}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Plan Management */}
                      <Card id="plan-management">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-slate-600" />
                            {t('dash.plan.management')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            {availablePlans.length > 0 && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    className="w-full bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#004080] hover:to-[#0052a3] text-white"
                                    disabled={isUpgrading}
                                  >
                                    {isUpgrading ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        {t('common.loading')}
                                      </>
                                    ) : (
                                      t('dash.plan.select')
                                    )}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{t('dash.plan.select')}</DialogTitle>
                                    <DialogDescription>
                                      {t('landing.pricing.title.choose')}
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                                    {availablePlans.map((plan: any) => {
                                      const isMostExpensive = availablePlans.length > 0 && 
                                        plan.price === Math.max(...availablePlans.map(p => p.price || 0)) &&
                                        plan.price > 0;
                                      
                                      const displayPrice: string | number = plan.price;
                                      const formattedPrice = `${t(`common.currency.${(plan.currency || 'USD').toUpperCase()}` as any) || plan.currency || 'USD'} ${displayPrice}`;

                                      return (
                                          <Card
                                            key={plan.id}
                                            className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg border-2 ${
                                              subscriptionData?.id === plan.id || subscriptionData?.planName === plan.name
                                                ? 'border-blue-500 bg-blue-50/30'
                                                : isMostExpensive 
                                                  ? 'border-yellow-400 bg-yellow-50/10' 
                                                  : 'border-slate-200 hover:border-blue-300'
                                            }`}
                                            onClick={() => handleUpgradePlan(plan.id)}
                                          >
                                            {isMostExpensive && (
                                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                                <Badge className="bg-yellow-400 text-black font-black px-4 py-1 shadow-md border-none">
                                                  {t('landing.pricing.tier.recommended')}
                                                </Badge>
                                              </div>
                                            )}
                                            
                                            <CardContent className="p-6">
                                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-lg text-slate-900">
                                                      {plan.name.toLowerCase().includes('starter') ? t('plans.starter.name') : 
                                                       plan.name.toLowerCase().includes('pro') ? t('plans.pro.name') : 
                                                       plan.name.toLowerCase().includes('elite') ? t('plans.elite.name') : plan.name}
                                                    </h3>
                                                    {(subscriptionData?.id === plan.id || subscriptionData?.planName === plan.name) && (
                                                      <Badge className="bg-blue-600 text-white text-[10px]">
                                                        {t('dash.plan.current')}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <p className="text-sm text-slate-600 mt-1">
                                                    {plan.name.toLowerCase().includes('starter') ? t('plans.starter.desc') : 
                                                     plan.name.toLowerCase().includes('pro') ? t('plans.pro.desc') : 
                                                     plan.name.toLowerCase().includes('elite') ? t('plans.elite.desc') : plan.description}
                                                  </p>
                                                  
                                                  <div className="mt-3 flex flex-wrap gap-2">
                                                    {plan.features && (Array.isArray(plan.features) ? plan.features : []).slice(0, 3).map((f: string, i: number) => {
                                                      const lowerF = f.toLowerCase();
                                                      let translatedF = f;
                                                      if (lowerF.includes('player')) {
                                                        const count = f.match(/\d+/)?.[0] || plan.playerLimit || plan.player_limit;
                                                        translatedF = t('plans.feature.playerCount', { count });
                                                      } else if (lowerF.includes('analytics')) translatedF = t('plans.feature.analytics');
                                                      else if (lowerF.includes('priority support')) translatedF = t('plans.feature.prioritySupport');
                                                      else if (lowerF.includes('email support')) translatedF = t('plans.feature.emailSupport');
                                                      else if (lowerF.includes('registration')) translatedF = t('plans.feature.registration');
                                                      else if (lowerF.includes('dedicated manager')) translatedF = t('plans.feature.dedicatedManager');
                                                      else if (lowerF.includes('white-label')) translatedF = t('plans.feature.whiteLabel');
                                                      else if (lowerF.includes('api access')) translatedF = t('plans.feature.advancedApi');
                                                      else if (lowerF.includes('financial tools')) translatedF = t('plans.feature.financialTools');
                                                      else if (lowerF.includes('standard support')) translatedF = t('plans.feature.standardSupport');
                                                      else if (lowerF.includes('profile placement')) translatedF = t('plans.feature.profilePlacement');
                                                      else if (lowerF.includes('legal')) translatedF = t('plans.feature.legalGuidance');
                                                      else if (lowerF.includes('trial notifications')) translatedF = t('plans.feature.trialNotifications');
                                                      else if (lowerF.includes('video highlight')) translatedF = t('plans.feature.videoReels');
                                                      else if (lowerF.includes('scout messaging')) translatedF = t('plans.feature.scoutMessaging');
                                                      else if (lowerF.includes('digital resume')) translatedF = t('plans.feature.digitalResume');
                                                      else if (lowerF.includes('public profile')) translatedF = t('plans.feature.publicProfile');
                                                      else if (lowerF.includes('stats tracking')) translatedF = t('plans.feature.statsTracking');
                                                      else if (lowerF.includes('api integration')) translatedF = t('plans.feature.apiIntegrations');
                                                      else if (lowerF.includes('account team')) translatedF = t('plans.feature.accountTeam');
                                                      else if (lowerF.includes('scouting filter')) translatedF = t('plans.feature.scoutingFilters');
                                                      else if (lowerF.includes('commission tracking')) translatedF = t('plans.feature.commissionTracking');
                                                      else if (lowerF.includes('sub-agent management')) translatedF = t('plans.feature.subAgentMgmt');
                                                      else if (lowerF.includes('premium support')) translatedF = t('plans.feature.premiumSupport');
                                                      else if (lowerF.includes('transfer tracking')) translatedF = t('plans.feature.transferTracking');
                                                      else if (lowerF.includes('document cloud')) translatedF = t('plans.feature.documentCloud');
                                                      else if (lowerF.includes('scouting tools')) translatedF = t('plans.feature.scoutingTools');
                                                      
                                                      return (
                                                        <div key={i} className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                          <CheckCircle className="h-3 w-3 text-green-500" />
                                                          {translatedF}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                                
                                                <div className="text-right flex flex-col items-end">
                                                  <div className="text-2xl font-black text-[#005391]">
                                                    {formattedPrice}
                                                    <span className="text-xs font-normal text-slate-500 ml-1">
                                                      /{String(plan.billing_cycle).toUpperCase() === 'YEARLY'
                                                        ? t('landing.pricing.year')
                                                        : String(plan.billing_cycle).toUpperCase() === 'LIFETIME'
                                                          ? 'one-time'
                                                          : t('landing.pricing.month')}
                                                    </span>
                                                  </div>
                                                  <div className="text-xs font-medium text-slate-500 mt-1 bg-slate-100 px-2 py-1 rounded">
                                                    {plan.playerLimit === -1 ? t('common.unlimited') : (plan.playerLimit || plan.player_limit || 0)} {t('dash.stats.players')}
                                                  </div>
                                                  <Button 
                                                    variant={(subscriptionData?.id === plan.id || subscriptionData?.planName === plan.name) ? "outline" : "default"}
                                                    size="sm"
                                                    className="mt-3 w-full md:w-auto font-bold"
                                                  >
                                                    {(subscriptionData?.id === plan.id || subscriptionData?.planName === plan.name) ? t('dash.plan.stayOnPlan') : t('dash.plan.choosePlan')}
                                                  </Button>
                                                </div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                      )
                                    })}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}

                            <Button variant="outline" className="w-full">
                              {t('dash.plan.changePayment')}
                            </Button>
                            <Button variant="outline" className="w-full">
                              {t('dash.plan.downloadInvoice')}
                            </Button>

                            {subscriptionData.status === 'active' && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                                    disabled={isCancelling}
                                  >
                                    {isCancelling ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Cancelling...
                                      </>
                                    ) : (
                                      t('dash.plan.cancel')
                                    )}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{t('dash.plan.cancel')}</DialogTitle>
                                    <DialogDescription>
                                      Are you sure you want to cancel your subscription? This action cannot be undone.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <DialogFooter>
                                    <Button variant="outline">{t('common.cancel')}</Button>
                                    <Button
                                      variant="destructive"
                                      onClick={handleCancelSubscription}
                                      disabled={isCancelling}
                                    >
                                      {isCancelling ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Cancelling...
                                        </>
                                      ) : (
                                        'Yes, Cancel'
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-10 border rounded-lg bg-slate-50 dark:bg-slate-900">
                      <CreditCard className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                      <div className="font-semibold text-slate-900 dark:text-white mb-1">No active subscription</div>
                      <div className="text-sm text-slate-500 mb-4">Choose a plan to activate subscription features for this academy.</div>
                      <Button
                        onClick={() => navigate('/shop')}
                      >
                        Choose a plan
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                  {/* Header moved to sticky section */}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Building className="h-5 w-5 mr-2" />
                          {t('dash.settings.academy')}
                        </CardTitle>
                        <CardDescription>
                          {t('dash.settings.academyDesc')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="academy-name" className="text-sm font-medium">{t('dash.settings.labels.name')}</Label>
                          <Input
                            id="academy-name"
                            type="text"
                            value={settingsFormData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="mt-1"
                            disabled={!isEditingSettings}
                            placeholder="Enter academy name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="location" className="text-sm font-medium">{t('dash.settings.labels.location')}</Label>
                          <Input
                            id="location"
                            type="text"
                            value={settingsFormData.location}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            className="mt-1"
                            disabled={!isEditingSettings}
                            placeholder="Enter academy location"
                          />
                        </div>
                        <div>
                          <Label htmlFor="established" className="text-sm font-medium">{t('dash.settings.labels.established')}</Label>
                          <Input
                            id="established"
                            type="text"
                            value={settingsFormData.established}
                            onChange={(e) => handleInputChange('established', e.target.value)}
                            className="mt-1"
                            disabled={!isEditingSettings}
                            placeholder="Enter year established"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Phone className="h-5 w-5 mr-2" />
                          {t('dash.settings.contact')}
                        </CardTitle>
                        <CardDescription>
                          {t('dash.settings.contactDesc')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="email" className="text-sm font-medium">{t('dash.settings.labels.email')}</Label>
                          <Input
                            id="email"
                            type="email"
                            value={settingsFormData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="mt-1"
                            disabled={!isEditingSettings}
                            placeholder="Enter academy email"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone" className="text-sm font-medium">{t('dash.settings.labels.phone')}</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={settingsFormData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="mt-1"
                            disabled={!isEditingSettings}
                            placeholder="Enter academy phone number"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <User className="h-5 w-5 mr-2" />
                          Director Information
                        </CardTitle>
                        <CardDescription>
                          Contact details for the academy director
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="director-name" className="text-sm font-medium">Director Name</Label>
                            <Input
                              id="director-name"
                              type="text"
                              value={settingsFormData.directorName}
                              onChange={(e) => handleInputChange('directorName', e.target.value)}
                              className="mt-1"
                              disabled={!isEditingSettings}
                              placeholder="Enter director name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="director-email" className="text-sm font-medium">Director Email</Label>
                            <Input
                              id="director-email"
                              type="email"
                              value={settingsFormData.directorEmail}
                              onChange={(e) => handleInputChange('directorEmail', e.target.value)}
                              className="mt-1"
                              disabled={!isEditingSettings}
                              placeholder="Enter director email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="director-phone" className="text-sm font-medium">Director Phone</Label>
                            <Input
                              id="director-phone"
                              type="tel"
                              value={settingsFormData.directorPhone}
                              onChange={(e) => handleInputChange('directorPhone', e.target.value)}
                              className="mt-1"
                              disabled={!isEditingSettings}
                              placeholder="Enter director phone"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {!isAgency && (
                      <Card className="lg:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Banknote className="mr-2 h-5 w-5" />
                            Academy Currency
                          </CardTitle>
                          <CardDescription>
                            Used by default for new player fees, financial entries, transfers, and invoices. Existing records keep their original currency.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="max-w-xl">
                            <Label htmlFor="academy-currency" className="text-sm font-medium">Default currency</Label>
                            <CurrencySelect
                              id="academy-currency"
                              value={settingsFormData.currency}
                              onValueChange={(value) => handleInputChange('currency', value)}
                              disabled={!isEditingSettings}
                              className="mt-1"
                              aria-label="Academy default currency"
                            />
                            <p className="mt-2 text-xs text-slate-500">
                              Currency changes do not convert or relabel payments that were already recorded.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Additional Settings Card */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Settings className="h-5 w-5 mr-2" />
                          System Settings
                        </CardTitle>
                        <CardDescription>
                          Additional configuration options
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm">Notifications</h4>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Email notifications</span>
                                <Button variant="outline" size="sm">Configure</Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">SMS notifications</span>
                                <Button variant="outline" size="sm">Configure</Button>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm">Data Management</h4>
                            <div className="space-y-2">
                              <Button variant="outline" size="sm" className="w-full">
                                <Download className="h-4 w-4 mr-2" />
                                Export Academy Data
                              </Button>
                              <Button variant="outline" size="sm" className="w-full">
                                <Upload className="h-4 w-4 mr-2" />
                                Import Player Data
                              </Button>

                              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-900 dark:hover:bg-red-900/20 dark:text-red-400">
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Account
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle className="text-red-600">Delete Account Permanently</DialogTitle>
                                      <DialogDescription>
                                        This action cannot be undone. This will permanently delete your academy account, all player data, compliance documents, and remove your data from our servers.
                                      </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-4">
                                      <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                          Warning: You are about to delete <strong>{academyInfo?.name || 'your academy'}</strong>. All data will be lost forever.
                                        </AlertDescription>
                                      </Alert>

                                      <div className="space-y-2">
                                        <Label htmlFor="delete-password">Confirm your password to continue</Label>
                                        <Input
                                          id="delete-password"
                                          type="password"
                                          placeholder="Enter your password"
                                          value={deletePassword}
                                          onChange={(e) => setDeletePassword(e.target.value)}
                                        />
                                        {deleteError && <p className="text-sm text-red-500">{deleteError}</p>}
                                      </div>
                                    </div>

                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>Cancel</Button>
                                      <Button
                                        variant="destructive"
                                        onClick={handleDeleteAccount}
                                        disabled={isDeleting || !deletePassword}
                                      >
                                        {isDeleting ? (
                                          <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Deleting...
                                          </>
                                        ) : (
                                          'Permanently Delete Account'
                                        )}
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </>
            )}
            </div>
          </Tabs>

            {/* Payment Method Selection Modal */}
            {showPaymentModal && selectedPlanForUpgrade && (
              <PaymentMethodSelector
                isOpen={showPaymentModal}
                onClose={() => {
                  setShowPaymentModal(false);
                  setSelectedPlanForUpgrade(null);
                }}
                selectedPlan={selectedPlanForUpgrade}
                academyId={academyInfo?.id || ''}
                onSuccess={handleUpgradeSuccess}
              />
            )}
            {/* Footer */}
            <footer className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6 pb-2">
              <div className="flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                <div className="mb-2 md:mb-0">
                  &copy; {new Date().getFullYear()} <span className="font-semibold text-[#005391] dark:text-blue-400">Soccer Circular</span>. All rights reserved.
                </div>
                <div className="flex gap-4">
                  <Link to="/privacy-policy" className="hover:text-[#005391] dark:hover:text-blue-400 transition-colors">Privacy Policy</Link>
                  <Link to="/terms-of-service" className="hover:text-[#005391] dark:hover:text-blue-400 transition-colors">Terms of Service</Link>
                  <Link to="/support" className="hover:text-[#005391] dark:hover:text-blue-400 transition-colors">Support</Link>
                </div>
              </div>
            </footer>
          </main>
      </div>
      {!isSidebarOpen && (
        <nav
          aria-label="Academy dashboard mobile navigation"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 lg:hidden"
        >
          <div className="grid h-16 grid-cols-5 px-1">
            {mobileBottomItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                  onClick={() => {
                    setActiveTab(item.id);
                    setActiveView("main");
                  }}
                  className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                    isActive
                      ? "text-[#005391] dark:text-blue-400"
                      : "text-slate-500 hover:text-[#005391] dark:text-slate-400 dark:hover:text-blue-400"
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 h-1 w-8 rounded-b-full bg-yellow-400" />
                  )}
                  <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                  <span className="max-w-full truncate">{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              aria-label="More academy navigation"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(true)}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                isMobileMoreActive
                  ? "text-[#005391] dark:text-blue-400"
                  : "text-slate-500 hover:text-[#005391] dark:text-slate-400 dark:hover:text-blue-400"
              }`}
            >
              {isMobileMoreActive && (
                <span className="absolute top-0 h-1 w-8 rounded-b-full bg-yellow-400" />
              )}
              <Menu className={`h-5 w-5 ${isMobileMoreActive ? "stroke-[2.5]" : ""}`} />
              <span>More</span>
            </button>
          </div>
          <div className="h-[env(safe-area-inset-bottom)] bg-white/95 dark:bg-slate-900/95" />
        </nav>
      )}
    </div >
  );
}

