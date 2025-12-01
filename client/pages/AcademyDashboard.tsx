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

import PlayerManagement from '@/components/players/PlayerManagement';
import FinancialTransactionsManager from '@/components/FinancialTransactionsManager';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import { Player, Transfer, getTransfers, createTransfer, updateTransfer, deleteTransfer, getAcademyDashboardStats, Api } from '@/lib/api';

// Mock data for academy dashboard
const academyData = {
  id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID format
  name: "Elite Football Academy",
  location: "Lusaka, Zambia",
  established: "2018",
  email: "admin@elitefootball.zm",
  phone: "+260 97 123 4567",
  logo: "/images/academy-logo.jpg",
  director: {
    name: "Michael Banda",
    email: "m.banda@elitefootball.zm",
    phone: "+260 97 987 6543"
  }
};

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

const playersData = [
  { id: 1, name: "John Mwanza", age: 16, position: "Forward", status: "active", rating: 85, currentClub: "Elite Football Academy" },
  { id: 2, name: "Sarah Phiri", age: 15, position: "Midfielder", status: "active", rating: 82, currentClub: "Elite Football Academy" },
  { id: 3, name: "David Tembo", age: 17, position: "Defender", status: "active", rating: 78, currentClub: "Elite Football Academy" },
  { id: 4, name: "Grace Lungu", age: 16, position: "Goalkeeper", status: "injured", rating: 88, currentClub: "Elite Football Academy" },
  { id: 5, name: "Peter Zulu", age: 15, position: "Winger", status: "active", rating: 80, currentClub: "Elite Football Academy" },
  { id: 6, name: "Michael Banda", age: 17, position: "Forward", status: "active", rating: 87, currentClub: "Youth Stars FC" },
  { id: 7, name: "Alice Mulenga", age: 16, position: "Midfielder", status: "active", rating: 84, currentClub: "Rising Eagles" },
  { id: 8, name: "Joseph Chisanga", age: 15, position: "Defender", status: "active", rating: 79, currentClub: "Future Champions" },
  { id: 9, name: "Ruth Kasonde", age: 17, position: "Winger", status: "active", rating: 83, currentClub: "Dream Team Academy" },
  { id: 10, name: "Emmanuel Mwale", age: 16, position: "Goalkeeper", status: "active", rating: 86, currentClub: "Victory Sports Club" }
];



const statsData = {
  totalPlayers: 45,
  activeTransfers: 3,
  monthlyRevenue: 25000,
  complianceScore: 95
};

// Add comprehensive financial data for the academy
const financialData = {
  overview: {
    totalRevenue: 125000,
    totalExpenses: 89000,
    netProfit: 36000,
    profitMargin: 28.8,
    monthlyGrowth: 12.5
  },
  revenue: {
    playerTransfers: 65000,
    academyFees: 35000,
    sponsorships: 15000,
    merchandise: 8000,
    other: 2000
  },
  expenses: {
    salaries: 45000,
    facilities: 18000,
    equipment: 12000,
    travel: 8000,
    marketing: 4000,
    other: 2000
  },
  monthlyData: [
    { month: 'Jan', revenue: 18000, expenses: 12000, profit: 6000 },
    { month: 'Feb', revenue: 22000, expenses: 14000, profit: 8000 },
    { month: 'Mar', revenue: 19000, expenses: 13000, profit: 6000 },
    { month: 'Apr', revenue: 25000, expenses: 15000, profit: 10000 },
    { month: 'May', revenue: 21000, expenses: 14500, profit: 6500 },
    { month: 'Jun', revenue: 20000, expenses: 20500, profit: -500 }
  ],
  recentTransactions: [
    {
      id: 1,
      type: 'income',
      description: 'Player Transfer - James Sakala',
      amount: 15000,
      date: '2024-01-15',
      category: 'Transfer'
    },
    {
      id: 2,
      type: 'expense',
      description: 'Equipment Purchase - Training Gear',
      amount: 3500,
      date: '2024-01-14',
      category: 'Equipment'
    },
    {
      id: 3,
      type: 'income',
      description: 'Monthly Academy Fees',
      amount: 8500,
      date: '2024-01-10',
      category: 'Fees'
    },
    {
      id: 4,
      type: 'expense',
      description: 'Staff Salaries - January',
      amount: 12000,
      date: '2024-01-05',
      category: 'Salaries'
    },
    {
      id: 5,
      type: 'income',
      description: 'Sponsorship - Local Bank',
      amount: 5000,
      date: '2024-01-03',
      category: 'Sponsorship'
    }
  ],
  budgetCategories: [
    {
      id: 1,
      name: 'Staff Salaries',
      budgeted: 50000,
      spent: 45000,
      remaining: 5000,
      percentage: 90
    },
    {
      id: 2,
      name: 'Facilities & Maintenance',
      budgeted: 20000,
      spent: 18000,
      remaining: 2000,
      percentage: 90
    },
    {
      id: 3,
      name: 'Equipment & Supplies',
      budgeted: 15000,
      spent: 12000,
      remaining: 3000,
      percentage: 80
    },
    {
      id: 4,
      name: 'Travel & Transportation',
      budgeted: 10000,
      spent: 8000,
      remaining: 2000,
      percentage: 80
    },
    {
      id: 5,
      name: 'Marketing & Promotion',
      budgeted: 6000,
      spent: 4000,
      remaining: 2000,
      percentage: 67
    }
  ]
};



export default function AcademyDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState("main");
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
    const element = document.getElementById('plan-management');
    if (element) {
      // First switch to subscription tab
      setActiveTab("subscription");
      // Then scroll to the plan management section with a slight delay
      setTimeout(() => {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
    }
  };

  useEffect(() => {
    const raw = localStorage.getItem('academy_data');
    if (raw) {
      try {
        setAcademyInfo(JSON.parse(raw));
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
      const financialSummary = financialResult.success ? financialResult.data : { totalRevenue: 0, monthlyData: [] };
      const monthlyFinancialData = financialResult.success && financialResult.data.monthlyData ? financialResult.data.monthlyData : [];
      
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
          storageLimit: data.limits?.storageLimit,
          playerCount: data.usage?.playerCount,
          playerUsagePercentage: data.usage?.playerUsagePercentage,
          storageUsed: data.usage?.storageUsed,
          storageUsagePercentage: data.usage?.storageUsagePercentage
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
          playerLimit: 2,
          storageLimit: 1,
          playerCount: 0,
          playerUsagePercentage: 0,
          storageUsed: 0,
          storageUsagePercentage: 0
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
        setAvailablePlans(result.data || []);
        console.log('Available plans set:', result.data);
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
      isFree: selectedPlan.price === 0
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
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    const currentData = academyInfo || academyData;
    setSettingsFormData({
      name: currentData.name || "",
      location: currentData.location || "",
      established: currentData.established || "",
      email: currentData.email || "",
      phone: currentData.phone || "",
      directorName: currentData.director?.name || "",
      directorEmail: currentData.director?.email || "",
      directorPhone: currentData.director?.phone || ""
    });
  }, [academyInfo]);

  const displayAcademyName = academyInfo?.name || academyData.name;
  const displayName = academyInfo?.contactPerson || academyInfo?.name || academyData.director.name;
  const getInitials = (name: string) => (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase())
    .join('') || academyData.name.substring(0, 2).toUpperCase();

  // Filter functions for different tabs
  const filteredTransactions = financialData.recentTransactions.filter(transaction =>
    searchQuery === "" ||
    transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.amount.toString().includes(searchQuery)
  );

  const complianceData = { overallScore: 95, nextReview: "March 15, 2025", areas: [{ id: 1, name: "Player Registration", status: "compliant", score: 100, lastCheck: "Jan 15", issues: 0, description: "All registrations compliant" }], auditHistory: [{ id: 1, type: "Annual Audit", date: "Dec 2024", inspector: "FIFA Officer", result: "Passed", score: 95, notes: "Excellent compliance" }], documents: [{ id: 1, name: "License Certificate", type: "PDF", size: "2MB", status: "current", lastUpdated: "Jan 2025" }] };
  const filteredComplianceAreas = complianceData.areas;
  const filteredActionItems = [{ id: 1, title: "Update Documents", priority: "high", dueDate: "Feb 1", status: "in_progress" }];

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
    const currentData = academyInfo || academyData;
    setSettingsFormData({
      name: currentData.name || "",
      location: currentData.location || "",
      established: currentData.established || "",
      email: currentData.email || "",
      phone: currentData.phone || "",
      directorName: currentData.director?.name || "",
      directorEmail: currentData.director?.email || "",
      directorPhone: currentData.director?.phone || ""
    });
  };

  const handleSaveSettings = async () => {
    try {
      // Update local storage with new data
      const updatedAcademyData = {
        ...academyInfo,
        name: settingsFormData.name,
        location: settingsFormData.location,
        established: settingsFormData.established,
        email: settingsFormData.email,
        phone: settingsFormData.phone,
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
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "players", label: "Players", icon: Users },
    { id: "transfers", label: "Transfers", icon: TrendingUp },
    { id: "finances", label: "Finances", icon: DollarSign },
    { id: "settings", label: "Settings", icon: Settings }
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
                  placeholder="Search players, transactions, documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
              <ThemeToggle />
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={academyInfo?.logo || academyData.logo} />
                  <AvatarFallback className="bg-blue-600 text-white font-bold">{getInitials(displayName)}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Academy Director
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
        <main className="flex-1 p-6">
          {activeView === 'compliance-documents' ? (
            <ComplianceDocuments onBack={() => setActiveView('main')} />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="players">Players</TabsTrigger>
                <TabsTrigger value="finances">Finances</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Welcome to {displayAcademyName}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      Academy management dashboard overview
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {academyInfo?.id || academyData.id}
                  </Badge>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">Total Players</p>
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
                          <p className="text-sm text-slate-600 dark:text-slate-400">Active Transfers</p>
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
                          <p className="text-sm text-slate-600 dark:text-slate-400">Monthly Revenue</p>
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
                          <p className="text-sm text-slate-600 dark:text-slate-400">Subscription</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">
                            {isLoadingSubscription ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              subscriptionData?.planName || "Free Plan"
                            )}
                          </p>
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
                              {subscriptionData.status === 'active' ? 'Active' : 'Inactive'}
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
                      Monthly Financial Performance
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
                            <span>Revenue</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>Expenses</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span>Profit</span>
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
                                    title={`Revenue: $${monthData.revenue.toLocaleString()}`}
                                  ></div>
                                  {/* Expenses bar (red) */}
                                  <div
                                    className="absolute bottom-0 w-full bg-red-500"
                                    style={{ height: `${expensesHeight}px` }}
                                    title={`Expenses: $${monthData.expenses.toLocaleString()}`}
                                  ></div>
                                  {/* Profit bar (blue) - only show if positive */}
                                  {monthData.profit > 0 && (
                                    <div
                                      className="absolute bottom-0 w-full bg-blue-500"
                                      style={{ height: `${profitHeight}px` }}
                                      title={`Profit: $${monthData.profit.toLocaleString()}`}
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
                            <div className="text-sm text-slate-600">Total Revenue</div>
                            <div className="text-lg font-semibold text-green-600">
                              ${dashboardStats.monthlyFinancialPerformance?.reduce((sum, month) => sum + month.revenue, 0).toLocaleString() || '0'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-slate-600">Total Expenses</div>
                            <div className="text-lg font-semibold text-red-600">
                              ${dashboardStats.monthlyFinancialPerformance?.reduce((sum, month) => sum + month.expenses, 0).toLocaleString() || '0'}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-slate-600">Net Profit</div>
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
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Transfer Management</h2>
                  <Button onClick={handleAddTransfer}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Transfer
                  </Button>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    All transfers must comply with FIFA regulations. Ensure proper documentation is submitted.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Transfer History</CardTitle>
                    <CardDescription>
                      Manage all player transfers and track their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {isLoadingTransfers ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                          <p>Loading transfers...</p>
                        </div>
                      ) : transfers.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No transfers found. Click "New Transfer" to add one.</p>
                        </div>
                      ) : (
                        transfers.map((transfer) => (
                          <div key={transfer.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{transfer.player_name}</h3>
                                <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-slate-600">
                                  <p><span className="font-medium">From:</span> {transfer.from_club}</p>
                                  <p><span className="font-medium">To:</span> {transfer.to_club}</p>
                                  <p><span className="font-medium">Date:</span> {new Date(transfer.transfer_date).toLocaleDateString()}</p>
                                  <p><span className="font-medium">Amount:</span> {transfer.transfer_amount ? `${transfer.currency} ${transfer.transfer_amount.toLocaleString()}` : 'N/A'}</p>
                                  <p><span className="font-medium">Type:</span> {transfer.transfer_type}</p>
                                  <p><span className="font-medium">Priority:</span> {transfer.priority}</p>
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
                        {editingTransfer ? 'Edit Transfer' : 'Add New Transfer'}
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

              {/* Compliance Tab */}
              <TabsContent value="compliance" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">FIFA Compliance Center</h2>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
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
                      Manage Documents
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
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Compliant Areas</p>
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
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Open Issues</p>
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
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Next Review</p>
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
                      <CardTitle>Compliance Areas</CardTitle>
                      <CardDescription>Detailed breakdown of FIFA compliance requirements</CardDescription>
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
                      <CardTitle>Action Items</CardTitle>
                      <CardDescription>Pending compliance tasks</CardDescription>
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
                        View All Tasks
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Audit History */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Audit History</CardTitle>
                      <CardDescription>Recent compliance audits and inspections</CardDescription>
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
                        View Full History
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Document Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Compliance Documents</CardTitle>
                      <CardDescription>Important FIFA compliance documentation</CardDescription>
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
                    <strong>Upcoming FIFA Review:</strong> Your academy is scheduled for a FIFA compliance review on {complianceData.nextReview}.
                    Ensure all documentation is up to date and action items are completed before the review date.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              {/* Finances Tab */}
              <TabsContent value="finances" className="space-y-6">
                <FinancialTransactionsManager academyId={academyInfo?.id || academyData.id} />
              </TabsContent>

              {/* Subscription Tab */}
              <TabsContent value="subscription" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Management</h2>
                  {subscriptionData && (
                    <Badge variant="outline" className={`${subscriptionData.status === 'active'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                      {subscriptionData.status === 'active' ? 'Active Plan' : 'Inactive'}
                    </Badge>
                  )}
                </div>

                {isLoadingSubscription ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2">Loading subscription data...</span>
                  </div>
                ) : subscriptionData ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Current Plan */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500" />
                          Current Plan
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
                              <span>Next billing date:</span>
                              <span className="font-medium">
                                {new Date(subscriptionData.endDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {subscriptionData.startDate && (
                            <div className="flex justify-between text-sm">
                              <span>Plan started:</span>
                              <span className="font-medium">
                                {new Date(subscriptionData.startDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span>Status:</span>
                            <Badge variant="outline" className={`${subscriptionData.status === 'active'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                              {subscriptionData.status}
                            </Badge>
                          </div>
                          {subscriptionData.daysRemaining !== undefined && (
                            <div className="flex justify-between text-sm">
                              <span>Days remaining:</span>
                              <span className="font-medium">{subscriptionData.daysRemaining} days</span>
                            </div>
                          )}
                        </div>
                        {subscriptionData.features && (
                          <div className="pt-4 border-t">
                            <h4 className="font-medium mb-2">Plan Features:</h4>
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
                          Usage Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          {subscriptionData.playerLimit && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Players</span>
                                <span>{subscriptionData.playerCount || 0} / {subscriptionData.playerLimit}</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 1
                                    ? 'bg-red-600'
                                    : ((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 0.8
                                      ? 'bg-yellow-600'
                                      : 'bg-blue-600'
                                    }`}
                                  style={{
                                    width: `${Math.min(((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) * 100, 100)}%`
                                  }}
                                ></div>
                              </div>
                              {((subscriptionData.playerCount || 0) / subscriptionData.playerLimit) >= 0.8 && (
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
                          {subscriptionData.storageLimit && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>Storage</span>
                                <span>{subscriptionData.storageUsed || 0}GB / {subscriptionData.storageLimit}GB</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${((subscriptionData.storageUsed || 0) / subscriptionData.storageLimit) >= 1
                                    ? 'bg-red-600'
                                    : ((subscriptionData.storageUsed || 0) / subscriptionData.storageLimit) >= 0.8
                                      ? 'bg-yellow-600'
                                      : 'bg-green-600'
                                    }`}
                                  style={{
                                    width: `${Math.min(((subscriptionData.storageUsed || 0) / subscriptionData.storageLimit) * 100, 100)}%`
                                  }}
                                ></div>
                              </div>
                              {((subscriptionData.storageUsed || 0) / subscriptionData.storageLimit) >= 0.8 && (
                                <div className="mt-2">
                                  <Button
                                    size="sm"
                                    onClick={scrollToPlanManagement}
                                    className={`w-full ${((subscriptionData.storageUsed || 0) / subscriptionData.storageLimit) >= 1
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                      }`}
                                  >
                                    <Crown className="h-4 w-4 mr-2" />
                                    {((subscriptionData.storageUsed || 0) / subscriptionData.storageLimit) >= 1
                                      ? 'Upgrade Required - Storage Full'
                                      : 'Upgrade Plan - Storage Near Limit'
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
                          Billing History
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
                              No billing history available
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
                          Plan Management
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
                                    'Select Plan'
                                  )}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Select a Plan</DialogTitle>
                                  <DialogDescription>
                                    Choose a subscription plan for your academy.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {availablePlans.map((plan: any) => (
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
                                                Current Plan
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <div className="font-bold">${plan.price}/month</div>
                                            <div className="text-sm text-slate-600">
                                              {plan.playerLimit} players
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}

                          <Button variant="outline" className="w-full">
                            Change Payment Method
                          </Button>
                          <Button variant="outline" className="w-full">
                            Download Invoice
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
                                    'Cancel Subscription'
                                  )}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Cancel Subscription</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to cancel your subscription? This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline">Keep Subscription</Button>
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
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Academy Settings</h2>
                  <div className="flex gap-2">
                    {isEditingSettings ? (
                      <>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSaveSettings}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <Button onClick={handleEditSettings}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Information
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Building className="h-5 w-5 mr-2" />
                        Academy Information
                      </CardTitle>
                      <CardDescription>
                        Basic information about your football academy
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="academy-name" className="text-sm font-medium">Academy Name</Label>
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
                        <Label htmlFor="location" className="text-sm font-medium">Location</Label>
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
                        <Label htmlFor="established" className="text-sm font-medium">Year Established</Label>
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
                        Contact Information
                      </CardTitle>
                      <CardDescription>
                        Primary contact details for the academy
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium">Academy Email</Label>
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
                        <Label htmlFor="phone" className="text-sm font-medium">Academy Phone</Label>
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
        </main>
      </div>
    </div>
  );
}

// Add new mock data for enhanced FIFA compliance
const complianceData = {
  overallScore: 95,
  lastAudit: "December 2023",
  nextReview: "March 2024",
  status: "Active",
  areas: [
    {
      id: 1,
      name: "Player Registration",
      score: 98,
      status: "compliant",
      lastCheck: "2024-01-15",
      issues: 0,
      description: "All player registrations are up to date and compliant with FIFA regulations"
    },
    {
      id: 2,
      name: "Training Compensation",
      score: 95,
      status: "compliant",
      lastCheck: "2024-01-10",
      issues: 0,
      description: "Training compensation calculations and payments are properly managed"
    },
    {
      id: 3,
      name: "Documentation",
      score: 88,
      status: "review_required",
      lastCheck: "2024-01-08",
      issues: 2,
      description: "Some documentation requires updates to meet latest FIFA standards"
    },
    {
      id: 4,
      name: "Solidarity Mechanism",
      score: 92,
      status: "compliant",
      lastCheck: "2024-01-12",
      issues: 0,
      description: "Solidarity payments are calculated and distributed according to FIFA rules"
    },
    {
      id: 5,
      name: "Transfer Regulations",
      score: 90,
      status: "compliant",
      lastCheck: "2024-01-14",
      issues: 1,
      description: "Transfer processes follow FIFA regulations with minor improvements needed"
    },
    {
      id: 6,
      name: "Youth Protection",
      score: 96,
      status: "compliant",
      lastCheck: "2024-01-16",
      issues: 0,
      description: "Youth player protection measures exceed FIFA minimum requirements"
    }
  ],
  actionItems: [
    {
      id: 1,
      title: "Update Player Medical Records",
      priority: "high",
      dueDate: "2024-02-01",
      assignee: "Medical Team",
      status: "in_progress",
      description: "Ensure all player medical records are current and properly documented"
    },
    {
      id: 2,
      title: "Review Training Compensation Agreements",
      priority: "medium",
      dueDate: "2024-02-15",
      assignee: "Legal Team",
      status: "pending",
      description: "Review and update training compensation agreements with partner clubs"
    },
    {
      id: 3,
      title: "Conduct Internal Audit",
      priority: "low",
      dueDate: "2024-03-01",
      assignee: "Compliance Officer",
      status: "pending",
      description: "Perform quarterly internal compliance audit before FIFA review"
    }
  ],
  auditHistory: [
    {
      id: 1,
      date: "2023-12-15",
      type: "FIFA Inspection",
      result: "Passed",
      score: 95,
      inspector: "FIFA Regional Office",
      notes: "Excellent compliance standards maintained"
    },
    {
      id: 2,
      date: "2023-09-20",
      type: "Internal Audit",
      result: "Passed",
      score: 93,
      inspector: "Internal Team",
      notes: "Minor improvements in documentation needed"
    },
    {
      id: 3,
      date: "2023-06-10",
      type: "FIFA Inspection",
      result: "Passed",
      score: 91,
      inspector: "FIFA Regional Office",
      notes: "Good progress on previous recommendations"
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