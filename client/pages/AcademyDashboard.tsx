import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession } from '@/lib/auth';
import { getCurrentSubscription, getSubscriptionHistory } from '@/lib/api';
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
import { Switch } from "@/components/ui/switch";
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

import PlayerManagement from '@/components/players/PlayerManagement';
import FinancialTransactionsManager from '@/components/FinancialTransactionsManager';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import AcademyComplianceTab from '@/components/academy/AcademyComplianceTab';
import { Player, Transfer, getTransfers, createTransfer, updateTransfer, deleteTransfer, getAcademyDashboardStats, Api } from '@/lib/api';

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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState("main");
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({
    name: "",
    location: "",
    established: "",
    email: "",
    phone: "",
    directorName: "",
    directorEmail: "",
    directorPhone: ""
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Localized compliance mock data
  const complianceData = {
    overallScore: 95,
    lastAudit: "December 2023",
    nextReview: "March 2024",
    status: "Active",
    areas: [
      {
        id: 1,
        name: t('dash.compliance.area.playerReg.name'),
        score: 98,
        status: "compliant",
        lastCheck: "2024-01-15",
        issues: 0,
        description: t('dash.compliance.area.playerReg.desc')
      },
      {
        id: 2,
        name: t('dash.compliance.area.trainingComp.name'),
        score: 95,
        status: "compliant",
        lastCheck: "2024-01-10",
        issues: 0,
        description: t('dash.compliance.area.trainingComp.desc')
      },
      {
        id: 3,
        name: t('dash.compliance.area.docs.name'),
        score: 88,
        status: "review_required",
        lastCheck: "2024-01-08",
        issues: 2,
        description: t('dash.compliance.area.docs.desc')
      },
      {
        id: 4,
        name: t('dash.compliance.area.solidarity.name'),
        score: 92,
        status: "compliant",
        lastCheck: "2024-01-12",
        issues: 0,
        description: t('dash.compliance.area.solidarity.desc')
      },
      {
        id: 5,
        name: t('dash.compliance.area.transfers.name'),
        score: 90,
        status: "compliant",
        lastCheck: "2024-01-14",
        issues: 1,
        description: t('dash.compliance.area.transfers.desc')
      },
      {
        id: 6,
        name: t('dash.compliance.area.youth.name'),
        score: 96,
        status: "compliant",
        lastCheck: "2024-01-16",
        issues: 0,
        description: t('dash.compliance.area.youth.desc')
      }
    ],
    actionItems: [
      {
        id: 1,
        title: t('dash.compliance.action.medical.title'),
        priority: "high",
        dueDate: "2024-02-01",
        assignee: "Medical Team",
        status: "in_progress",
        description: t('dash.compliance.action.medical.desc')
      },
      {
        id: 2,
        title: t('dash.compliance.action.review.title'),
        priority: "medium",
        dueDate: "2024-02-15",
        assignee: "Legal Team",
        status: "pending",
        description: t('dash.compliance.action.review.desc')
      },
      {
        id: 3,
        title: t('dash.compliance.action.audit.title'),
        priority: "low",
        dueDate: "2024-03-01",
        assignee: "Compliance Officer",
        status: "pending",
        description: t('dash.compliance.action.audit.desc')
      }
    ],
    auditHistory: [
      {
        id: 1,
        date: "2023-12-15",
        type: t('dash.compliance.audit.fifaInspection'),
        result: "Passed",
        score: 95,
        inspector: "FIFA Regional Office",
        notes: t('dash.compliance.audit.note1')
      },
      {
        id: 2,
        date: "2023-09-20",
        type: t('dash.compliance.audit.internal'),
        result: "Passed",
        score: 93,
        inspector: "Internal Team",
        notes: t('dash.compliance.audit.note2')
      },
      {
        id: 3,
        date: "2023-06-10",
        type: t('dash.compliance.audit.fifaInspection'),
        result: "Passed",
        score: 91,
        inspector: "FIFA Regional Office",
        notes: t('dash.compliance.audit.note3')
      }
    ],
    documents: [
      {
        id: 1,
        name: "FIFA Compliance Manual 2024",
        type: "Manual",
        lastUpdated: "2024-01-01",
        status: "current",
        size: "2.4 MB"
      },
      {
        id: 2,
        name: "Player Registration Forms",
        type: "Forms",
        lastUpdated: "2024-01-15",
        status: "current",
        size: "1.8 MB"
      },
      {
        id: 3,
        name: "Training Compensation Guidelines",
        type: "Guidelines",
        lastUpdated: "2023-12-20",
        status: "review_needed",
        size: "956 KB"
      },
      {
        id: 4,
        name: "Audit Report December 2023",
        type: "Report",
        lastUpdated: "2023-12-16",
        status: "current",
        size: "3.2 MB"
      }
    ]
  };

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
    currency: "USD",
    transfer_date: "",
    status: "pending" as const,
    transfer_type: "permanent" as const,
    priority: "medium" as const
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
      // Get user email from local storage or wherever it's stored
      // Assuming 'football-auth-storage' matches what's used in auth.ts
      let userEmail = "";
      try {
        const storage = JSON.parse(localStorage.getItem('football-auth-storage') || '{}');
        userEmail = storage?.state?.user?.email;
      } catch (e) {
        console.error("Error parsing auth storage", e);
      }
      
      // Fallback if not found in storage, check if we have it in academyInfo or other state
      if (!userEmail && academyInfo?.email) {
          // Note: academyInfo.email might be the academy email, not necessarily the logged in user's email
          // But for now let's try to find the user email.
          // If the user object is not available, we might need to rely on the user re-entering it?
          // The API requires email to verify the specific user.
      }

      if (!academyInfo?.id || !userEmail) {
        throw new Error("User information missing. Please refresh the page.");
      }

      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiUrl}/football-auth/academy/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('football-auth-token')}`
        },
        body: JSON.stringify({
          academyId: academyInfo.id,
          email: userEmail,
          password: deletePassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
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
    const raw = localStorage.getItem('academy_data');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setAcademyInfo(data);

        // Check for profile completion
        // Auto-redirect removed to allow persistent banner on dashboard
        // if (!data.profileComplete && !data.profileSkipped && (!data.phone || !data.address || !data.directorName)) {
        //  console.log("Profile incomplete, redirecting to completion page");
        //  setTimeout(() => {
        //    navigate('/complete-profile');
        //  }, 100);
        // }
      } catch {
        setAcademyInfo(null);
      }
    }
  }, []);

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
      const [statsResult, playersResult, transfersResult, financialResult] = await Promise.all([
        getAcademyDashboardStats(academyInfo.id),
        Api.getPlayers(academyInfo.id, 1, 1),
        Api.getTransfers(academyInfo.id),
        fetch(`/api/financial/summary?academyId=${academyInfo.id}&period=monthly`).then(res => res.json())
      ]);

      // Calculate active transfers
      const activeTransfers = transfersResult.success
        ? transfersResult.data.filter(t => t.status === 'pending' || t.status === 'approved').length
        : 0;

      // Process financial data
      const financialSummary = financialResult.success 
        ? (financialResult.data.summary || financialResult.data) 
        : { totalRevenue: 0 };
        
      const monthlyFinancialData = financialResult.success 
        ? (financialResult.data.monthlyBreakdown || financialResult.data.monthlyData || []) 
        : [];

      // Get recent transfers from the transfers list (already fetched)
      const recentTransfers = transfersResult.success
        ? transfersResult.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)
        : [];

      if (statsResult.success) {
        setDashboardStats(prev => ({
          ...statsResult.data,
          totalPlayers: playersResult.success ? (playersResult.data.total || 0) : (statsResult.data.totalPlayers || 0),
          activeTransfers: activeTransfers,
          monthlyRevenue: financialSummary.totalRevenue || 0,
          recentTransfers: recentTransfers,
          monthlyFinancialPerformance: monthlyFinancialData.length > 0 ? monthlyFinancialData : prev.monthlyFinancialPerformance
        }));
      } else {
        // Fallback if stats endpoint fails
        setDashboardStats(prev => ({
          ...prev,
          totalPlayers: playersResult.success ? (playersResult.data.total || 0) : 0,
          activeTransfers: activeTransfers,
          monthlyRevenue: financialSummary.totalRevenue || 0,
          recentTransfers: recentTransfers,
          monthlyFinancialPerformance: monthlyFinancialData.length > 0 ? monthlyFinancialData : prev.monthlyFinancialPerformance
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
      if (data) {
        // Map the API response to the UI model
        setSubscriptionData({
          id: data.subscription?.id,
          status: data.subscription?.status?.toLowerCase() || 'active',
          planName: data.subscription?.planName,
          price: data.subscription?.price || 0,
          billingCycle: 'month',
          startDate: data.subscription?.startDate,
          endDate: data.subscription?.endDate,
          autoRenew: data.subscription?.autoRenew,
          daysRemaining: data.subscription?.daysRemaining,
          playerLimit: data.limits?.playerLimit,
          playerCount: data.usage?.playerCount,
          playerUsagePercentage: data.usage?.playerUsagePercentage
        });
      } else {
        // Handle case when no subscription is found
        console.log("No active subscription found - using default free plan");
        // Set default free plan data
        setSubscriptionData({
          id: "free-default",
          status: "active",
          planName: "Free Plan",
          price: 0,
          billingCycle: 'month',
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          autoRenew: true,
          daysRemaining: 365,
          playerLimit: 3,
          playerCount: 0,
          playerUsagePercentage: 0
        });
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
      const response = await fetch('/api/subscriptions/plans');
      const result = await response.json();
      console.log('Plans API response:', result);

      if (result.success) {
        // The API returns { success: true, data: { plans: [...] } }
        // We need to extract the plans array correctly
        const plans = result.data?.plans || result.data || [];
        setAvailablePlans(plans);
        console.log('Available plans set:', plans);
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
      price: billingCycle === 'yearly' 
        ? (selectedPlan.name === 'Basic' || selectedPlan.name === t('landing.pricing.tier1.name') 
            ? parseInt(t('landing.pricing.tier1.priceYearly').replace(/[^0-9]/g, '')) 
            : selectedPlan.name === 'Pro' || selectedPlan.name === t('landing.pricing.tier2.name')
            ? parseInt(t('landing.pricing.tier2.priceYearly').replace(/[^0-9]/g, ''))
            : selectedPlan.name === 'Elite' || selectedPlan.name === t('landing.pricing.tier3.name')
            ? parseInt(t('landing.pricing.tier3.priceYearly').replace(/[^0-9]/g, ''))
            : Math.round(selectedPlan.price * 12 * 0.8))
        : selectedPlan.price,
      isFree: selectedPlan.price === 0,
      billingCycle: billingCycle
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
      const token = session?.access_token || session?.token;

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
  }, [academyInfo?.id]);

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
      established: currentData.established || "",
      email: currentData.email || "",
      phone: currentData.phone || "",
      directorName: currentData.directorName || currentData.director?.name || "",
      directorEmail: currentData.directorEmail || currentData.director?.email || "",
      directorPhone: currentData.directorPhone || currentData.director?.phone || ""
    });
  }, [academyInfo]);

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

  const filteredComplianceAreas = complianceData.areas;
  const filteredActionItems = complianceData.actionItems;

  const handleLogout = () => {
    clearSession();
    navigate("/login");
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
      established: currentData.established || "",
      email: currentData.email || "",
      phone: currentData.phone || "",
      directorName: currentData.directorName || currentData.director?.name || "",
      directorEmail: currentData.directorEmail || currentData.director?.email || "",
      directorPhone: currentData.directorPhone || currentData.director?.phone || ""
    });
  };

  const handleSaveSettings = async () => {
    try {
      // Update local storage with new data
      const updatedAcademyData = {
        ...academyInfo,
        name: settingsFormData.name,
        location: settingsFormData.location,
        address: settingsFormData.location, // Ensure flat structure for banner check
        established: settingsFormData.established,
        email: settingsFormData.email,
        phone: settingsFormData.phone,
        directorName: settingsFormData.directorName, // Ensure flat structure for banner check
        directorEmail: settingsFormData.directorEmail,
        directorPhone: settingsFormData.directorPhone,
        director: {
          name: settingsFormData.directorName,
          email: settingsFormData.directorEmail,
          phone: settingsFormData.directorPhone
        }
      };

      localStorage.setItem('academy_data', JSON.stringify(updatedAcademyData));
      setAcademyInfo(updatedAcademyData);
      setIsEditingSettings(false);

      toast({
        title: "Settings Updated",
        description: "Academy information has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update academy information. Please try again.",
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
      currency: "USD",
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
      currency: "USD",
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
      const academyId = session?.schoolId || session?.academyId;

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
    { id: "transfers", label: t('dash.menu.transfers'), icon: TrendingUp },
    { id: "finances", label: t('dash.menu.finances'), icon: DollarSign },
    { id: "fifa-compliance", label: t('dash.menu.compliance'), icon: Shield },
    { id: "settings", label: t('dash.menu.settings'), icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Academy Name */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
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
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    {displayAcademyName}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Academy Dashboard</p>
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
            <div className="flex items-center gap-4">
              <NotificationsPopover />
              <LanguageToggle />
              <ThemeToggle />
              <div className="flex items-center gap-3">
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
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#005391] to-[#0066b3] border-r-4 border-yellow-400 transition-transform duration-300 ease-in-out min-h-screen`}>
          <div className="flex flex-col h-full pt-16 lg:pt-0">
            <nav className="flex-1 px-4 py-6 space-y-2">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={`w-full justify-start text-white hover:bg-white/20 transition-all duration-300 ${activeTab === item.id
                      ? 'bg-white/20 border-l-4 border-yellow-400 shadow-lg'
                      : 'border-l-4 border-transparent hover:border-yellow-400/50'
                      }`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setActiveView('main'); // Reset to main view when navigating via sidebar
                      setIsSidebarOpen(false);
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
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
        <main className="flex-1 flex flex-col">
          
          {/* Incomplete Profile Banner */}
          {academyInfo && (!academyInfo.address || !academyInfo.phone || !academyInfo.directorName) && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 w-full">
              <div className="flex justify-between items-center">
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

          <div className="flex-1 p-6">
            {activeView === 'compliance-documents' ? (
            <ComplianceDocuments onBack={() => setActiveView('main')} />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="dashboard">{t('dash.menu.dashboard')}</TabsTrigger>
                <TabsTrigger value="players">{t('dash.menu.players')}</TabsTrigger>
                <TabsTrigger value="transfers">{t('dash.menu.transfers')}</TabsTrigger>
                <TabsTrigger value="finances">{t('dash.menu.finances')}</TabsTrigger>
                <TabsTrigger value="fifa-compliance">{t('dash.menu.compliance')}</TabsTrigger>
                <TabsTrigger value="subscription">{t('dash.stats.subscription')}</TabsTrigger>
                <TabsTrigger value="settings">{t('dash.menu.settings')}</TabsTrigger>
              </TabsList>

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
                              `$${dashboardStats.monthlyRevenue.toLocaleString()}`
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
                              subscriptionData?.planName || "Free Plan"
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
                                    title={`${t('dash.financial.revenue')}: $${monthData.revenue.toLocaleString()}`}
                                  ></div>
                                  {/* Expenses bar (red) */}
                                  <div
                                    className="absolute bottom-0 w-full bg-red-500"
                                    style={{ height: `${expensesHeight}px` }}
                                    title={`${t('dash.financial.expenses')}: $${monthData.expenses.toLocaleString()}`}
                                  ></div>
                                  {/* Profit bar (blue) - only show if positive */}
                                  {monthData.profit > 0 && (
                                    <div
                                      className="absolute bottom-0 w-full bg-blue-500"
                                      style={{ height: `${profitHeight}px` }}
                                      title={`${t('dash.financial.profit')}: $${monthData.profit.toLocaleString()}`}
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
                              ${dashboardStats.monthlyFinancialPerformance?.reduce((sum, month) => sum + month.revenue, 0).toLocaleString() || '0'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-slate-600">{t('dash.financial.expenses')}</div>
                            <div className="text-lg font-semibold text-red-600">
                              ${dashboardStats.monthlyFinancialPerformance?.reduce((sum, month) => sum + month.expenses, 0).toLocaleString() || '0'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-slate-600">{t('dash.financial.profit')}</div>
                            <div className="text-lg font-semibold text-blue-600">
                              ${dashboardStats.monthlyFinancialPerformance?.reduce((sum, month) => sum + month.profit, 0).toLocaleString() || '0'}
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
                              <p className="text-sm text-slate-600 dark:text-slate-400">{transfer.from_club} → {transfer.to_club} - {transfer.transfer_amount ? `$${transfer.transfer_amount.toLocaleString()}` : 'N/A'}</p>
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
                <PlayerManagement searchQuery={searchQuery} />
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
                                  <p><span className="font-medium">{t('dash.transfers.amount')}:</span> {transfer.transfer_amount ? `${transfer.currency} ${transfer.transfer_amount.toLocaleString()}` : 'N/A'}</p>
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
                        <Select
                          value={transferFormData.currency}
                          onValueChange={(value) => handleTransferInputChange('currency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="NGN">NGN</SelectItem>
                          </SelectContent>
                        </Select>
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

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('features.fifaComp.title')}</h2>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      {t('dash.compliance.report')}
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      {t('dash.compliance.data')}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveView('compliance-documents');
                      }}
                      className="bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#0066b3] hover:to-[#005391] text-white"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {t('features.docMgmt.title')}
                    </Button>
                  </div>
                </div>

                {/* Compliance Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Overall Score</p>
                          <p className="text-2xl font-bold text-green-600">{complianceData.overallScore}%</p>
                        </div>
                        <Shield className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('dash.compliance.areas')}</p>
                          <p className="text-2xl font-bold text-[#005391]">
                            {complianceData.areas.filter(area => area.status === 'compliant').length}/{complianceData.areas.length}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-[#005391]" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('dash.compliance.issues')}</p>
                          <p className="text-2xl font-bold text-orange-600">
                            {complianceData.areas.reduce((sum, area) => sum + area.issues, 0)}
                          </p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('dash.compliance.review')}</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{complianceData.nextReview}</p>
                        </div>
                        <Calendar className="h-8 w-8 text-slate-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Compliance Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Compliance Areas */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>{t('dash.compliance.breakdown')}</CardTitle>
                      <CardDescription>{t('dash.compliance.breakdownDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filteredComplianceAreas.length > 0 ? (
                          filteredComplianceAreas.map((area) => (
                            <div key={area.id} className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  {area.status === 'compliant' ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                                  )}
                                  <span className="font-medium">{area.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{area.score}%</span>
                                  <Badge variant={area.status === 'compliant' ? 'default' : 'secondary'}>
                                    {area.status === 'compliant' ? 'Compliant' : 'Review Required'}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{area.description}</p>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Last checked: {area.lastCheck}</span>
                                {area.issues > 0 && (
                                  <span className="text-orange-600">{area.issues} issue{area.issues > 1 ? 's' : ''}</span>
                                )}
                              </div>
                              <Progress value={area.score} className="mt-2 h-2" />
                            </div>
                          ))
                        ) : searchQuery && (
                          <div className="text-center py-8 text-slate-500">
                            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No compliance areas found matching "{searchQuery}"</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('dash.compliance.actions')}</CardTitle>
                      <CardDescription>{t('dash.compliance.actionsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {filteredActionItems.length > 0 ? (
                          filteredActionItems.map((item) => (
                            <div key={item.id} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm">{item.title}</h4>
                                <Badge
                                  variant={
                                    item.priority === 'high' ? 'destructive' :
                                      item.priority === 'medium' ? 'secondary' : 'outline'
                                  }
                                  className="text-xs"
                                >
                                  {item.priority}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{item.description}</p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Due: {item.dueDate}</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : searchQuery && (
                          <div className="text-center py-8 text-slate-500">
                            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No action items found matching "{searchQuery}"</p>
                          </div>
                        )}
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        <ClipboardCheck className="h-4 w-4 mr-2" />
                        {t('dash.compliance.viewTasks')}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Audit History */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('dash.compliance.audit')}</CardTitle>
                      <CardDescription>{t('dash.compliance.auditDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {complianceData.auditHistory.map((audit) => (
                          <div key={audit.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">{audit.type}</h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{audit.date}</p>
                              <p className="text-xs text-slate-500">{audit.inspector}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={audit.result === 'Passed' ? 'default' : 'destructive'}>
                                {audit.result}
                              </Badge>
                              <p className="text-sm font-medium mt-1">{audit.score}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        {t('dash.compliance.viewHistory')}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Document Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('dash.compliance.documentsTitle')}</CardTitle>
                      <CardDescription>{t('dash.compliance.documentsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {complianceData.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="h-4 w-4 text-slate-600" />
                              <div>
                                <h4 className="font-medium text-sm">{doc.name}</h4>
                                <p className="text-xs text-slate-500">{doc.type} • {doc.size}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={doc.status === 'current' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {doc.status === 'current' ? 'Current' : 'Review Needed'}
                              </Badge>
                              <Button size="sm" variant="ghost">
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />
                        Document Library
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Compliance Alerts */}
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('dash.compliance.alert.reviewTitle')}</strong> {t('dash.compliance.alert.reviewMsg')} {complianceData.nextReview}.
                    {t('dash.compliance.alert.reviewDesc')}
                  </AlertDescription>
                </Alert>
              </TabsContent>

              {/* Finances Tab */}
              <TabsContent value="finances" className="space-y-6">
                <FinancialTransactionsManager 
                  academyId={academyInfo?.id} 
                  academyDetails={academyInfo}
                />
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
                                  {subscriptionData.playerCount || 0} / {subscriptionData.playerLimit === -1 ? 'Unlimited' : subscriptionData.playerLimit}
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    subscriptionData.playerLimit === -1 
                                      ? 'bg-blue-600'
                                      : ((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 1
                                        ? 'bg-red-600'
                                        : ((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 0.8
                                          ? 'bg-yellow-600'
                                          : 'bg-blue-600'
                                  }`}
                                  style={{
                                    width: `${
                                      subscriptionData.playerLimit === -1 
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
                                      ? 'Upgrade Required - Limit Reached'
                                      : 'Upgrade Plan - Near Limit'
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
                                      Upgrading...
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
                                
                                <div className="flex justify-center items-center gap-4 mb-4">
                                  <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-blue-900' : 'text-slate-500'}`}>
                                    {t('landing.pricing.toggle.monthly')}
                                  </span>
                                  <Switch
                                    checked={billingCycle === 'yearly'}
                                    onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
                                    className="bg-blue-900 data-[state=checked]:bg-yellow-400"
                                  />
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${billingCycle === 'yearly' ? 'text-blue-900' : 'text-slate-500'}`}>
                                      {t('landing.pricing.toggle.yearly')}
                                    </span>
                                    <span className="bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                                      {t('landing.pricing.save')}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  {availablePlans.map((plan: any) => {
                                    let displayPrice = `$${plan.price}`;
                                    if (billingCycle === 'yearly') {
                                        if (plan.name === 'Basic' || plan.name === t('landing.pricing.tier1.name')) {
                                            displayPrice = t('landing.pricing.tier1.priceYearly');
                                        } else if (plan.name === 'Pro' || plan.name === t('landing.pricing.tier2.name')) {
                                            displayPrice = t('landing.pricing.tier2.priceYearly');
                                        } else if (plan.name === 'Elite' || plan.name === t('landing.pricing.tier3.name')) {
                                            displayPrice = t('landing.pricing.tier3.priceYearly');
                                        } else {
                                            displayPrice = `$${Math.round(plan.price * 12 * 0.8)}`;
                                        }
                                    }

                                    return (
                                    <Card
                                      key={plan.id}
                                      className={`cursor-pointer hover:bg-slate-50 ${subscriptionData?.planName === plan.name
                                        ? 'border-2 border-blue-500'
                                        : ''
                                        }`}
                                      onClick={() => handleUpgradePlan(plan.id)}
                                    >
                                      <CardContent className="p-4">
                                        <div className="flex justify-between items-center">
                                          <div>
                                            <h3 className="font-semibold">{plan.name}</h3>
                                            <p className="text-sm text-slate-600">{plan.description}</p>
                                            {subscriptionData?.planName === plan.name && (
                                              <Badge className="mt-1 bg-blue-100 text-blue-800 border-blue-200">
                                                {t('dash.plan.current')}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <div className="font-bold">{displayPrice}{billingCycle === 'monthly' ? t('landing.pricing.month') : t('landing.pricing.year')}</div>
                                            <div className="text-sm text-slate-600">
                                              {plan.playerLimit || plan.player_limit} players
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )})}
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
                  <div className="text-center py-8">
                    <div className="text-slate-500 mb-4">No subscription data available</div>
                    <Button
                      onClick={loadSubscriptionData}
                      variant="outline"
                    >
                      Retry Loading
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dash.menu.settings')}</h2>
                  <div className="flex gap-2">
                    {isEditingSettings ? (
                      <>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4 mr-2" />
                          {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSaveSettings}>
                          <Save className="h-4 w-4 mr-2" />
                          {t('common.save')}
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleEditSettings}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </Button>
                    )}
                  </div>
                </div>

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
            </Tabs>
          )}

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
          </div>
        </main>
      </div>
    </div >
  );
}

