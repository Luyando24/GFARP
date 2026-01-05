import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, clearSession, isAdmin } from '@/lib/auth';
import { useToast } from '@/components/ui/use-toast';
import AcademyManagement from '../components/academy/AcademyManagement';
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
  Database,
  Activity,
  Server,
  UserPlus,
  Edit,
  Trash2,
  MoreHorizontal,
  Save,
  Filter,
  SortAsc,
  RefreshCw,
  UserX,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  MapPin,
  Calendar as CalendarIcon,
  Check,
  XCircle,
  AlertTriangle,
  Flag,
  FileCheck,
  AlertOctagon,
  Clock3,
  Gavel,
  Percent,
  CreditCard as CreditCardIcon,
  Coins,
  HandCoins,
  CircleDollarSign,
  Lock,
  Key,
  Mail,
  Phone,
  Smartphone,
  Wifi,
  HardDrive,
  Cloud,
  Download as DownloadIcon,
  Upload,
  HardDrive as BackupIcon,
  RotateCcw as RestoreIcon,
  RotateCcw,
  Cog,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Volume2,
  VolumeX,
  Monitor,
  Palette,
  Languages,
  Timer,
  Zap,
  ShieldCheck,
  UserCog,
  Database as DatabaseIcon,
  Network,
  Cpu,
  MemoryStick,
  HardDriveIcon,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import { NotificationsPopover } from '@/components/navigation/NotificationsPopover';
import BlogManagement from '@/components/admin/BlogManagement';
import SalesAgentsManager from '@/components/admin/SalesAgentsManager';

// Real admin data will be fetched from API

// Real activity data will be fetched from API

// Real transfer data will be fetched from API

// Real compliance data will be fetched from API

// Real financial data will be fetched from API

// Real transaction data will be fetched from API

// Real payment method data will be fetched from API

// Real system logs will be fetched from API

// Real system health data will be fetched from API

// Real analytics data will be fetched from API

const chartConfig = {
  users: {
    label: "Users",
    color: "#2563eb",
  },
  academies: {
    label: "Academies",
    color: "#dc2626",
  },
  revenue: {
    label: "Revenue",
    color: "#059669",
  },
  subscriptions: {
    label: "Subscriptions",
    color: "#7c3aed",
  },
  cpu: {
    label: "CPU Usage",
    color: "#0891b2",
  },
  memory: {
    label: "Memory Usage",
    color: "#be123c",
  },
  requests: {
    label: "Requests",
    color: "#059669",
  }
};

interface ComplianceDocument {
  id: string;
  compliance_id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  upload_date: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  expiry_date?: string;
  url?: string;
}

interface ComplianceRecord {
  id: string;
  academy_id: string;
  academy_name?: string;
  compliance_type: string;
  title: string;
  description: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'flagged' | 'requires_action';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submission_date: string;
  due_date?: string;
  document_count: number;
  action_count: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Users state for admin list
  const [users, setUsers] = useState<any[]>([]);
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>([]);
  const [viewingCompliance, setViewingCompliance] = useState<ComplianceRecord | null>(null);
  
  // Duplicate declarations removed from here
  
  // System stats state - will be fetched from API
  const [systemStats, setSystemStats] = useState({
    totalAcademies: 0,
    totalPlayers: 0,
    monthlyRevenue: 0
  });

  // Compliance stats state - will be fetched from API
  const [complianceStats, setComplianceStats] = useState({
    totalCompliances: 0,
    pendingReviews: 0,
    approvedThisMonth: 0,
    flaggedIssues: 0,
    averageReviewTime: "0 days"
  });

  const [complianceDocuments, setComplianceDocuments] = useState<any[]>([]);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [rejectingDocumentId, setRejectingDocumentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchComplianceDocuments = async () => {
    try {
      setIsComplianceLoading(true);
      
      // Fetch documents
      const docsResponse = await fetch('/api/compliance-documents/admin-list');
      const docsResult = await docsResponse.json();
      
      if (docsResult.success) {
        setComplianceDocuments(docsResult.data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load compliance documents",
          variant: "destructive",
        });
      }

      // Fetch stats
      const statsResponse = await fetch('/api/compliance-documents/stats');
      const statsResult = await statsResponse.json();

      if (statsResult.success) {
        setComplianceStats(statsResult.data);
      }
      
    } catch (error) {
      console.error('Error fetching compliance data:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance data",
        variant: "destructive",
      });
    } finally {
      setIsComplianceLoading(false);
    }
  };

  const handleUpdateDocumentStatus = async (documentId: string, newStatus: string) => {
    if (newStatus === 'rejected') {
      setRejectingDocumentId(documentId);
      setRejectionReason("");
      return;
    }

    await submitDocumentStatusUpdate(documentId, newStatus);
  };

  const submitDocumentStatusUpdate = async (documentId: string, newStatus: string, reason?: string) => {
    try {
      const response = await fetch('/api/compliance-documents/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentId, 
          status: newStatus,
          rejectionReason: reason 
        }),
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Document ${newStatus === 'verified' ? 'approved' : 'rejected'} successfully`,
        });
        fetchComplianceDocuments();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update document status",
        variant: "destructive",
      });
    }
  };

  const confirmRejection = async () => {
    if (rejectingDocumentId) {
      await submitDocumentStatusUpdate(rejectingDocumentId, 'rejected', rejectionReason);
      setRejectingDocumentId(null);
      setRejectionReason("");
    }
  };

  useEffect(() => {
    if (activeTab === 'compliance') {
      fetchComplianceDocuments();
    }
  }, [activeTab]);

  // Financial stats state - will be fetched from API
  const [financialStats, setFinancialStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalTransactions: 0,
    pendingPayments: 0,
    subscriptionRevenue: 0,
    averageTransactionValue: 0,
    revenueGrowth: 0,
    revenueBreakdown: {
      subscriptions: 0,
      transactions: 0
    }
  });

  // New accounts state - academies registered in past 30 days
  const [newAccounts, setNewAccounts] = useState([]);
  const [newAccountsStats, setNewAccountsStats] = useState({
    totalNewAccounts: 0,
    thisWeek: 0,
    thisMonth: 0,
    growthRate: 0
  });

  // Country distribution state - academies distribution by countries
  const [countryDistribution, setCountryDistribution] = useState([]);
  const [countryDistributionStats, setCountryDistributionStats] = useState({
    totalCountries: 0,
    topCountry: '',
    topCountryPercentage: 0,
    totalAcademies: 0
  });

  // Financial growth state - subscription revenue and growth data
  const [financialGrowthData, setFinancialGrowthData] = useState([]);
  const [financialGrowthStats, setFinancialGrowthStats] = useState({
    totalRevenue: 0,
    monthlyGrowth: 0,
    totalSubscriptions: 0,
    avgRevenuePerSubscription: 0
  });

  // Transaction history state
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<any | null>(null);

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    general: {
      siteName: "",
      siteDescription: "",
      timezone: "America/New_York",
      language: "English",
      dateFormat: "MM/DD/YYYY",
      currency: "USD",
      maintenanceMode: false,
      registrationEnabled: true
    },
    security: {
      twoFactorAuth: false,
      passwordExpiry: 90,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      ipWhitelist: [],
      sslEnabled: true,
      encryptionLevel: ""
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      adminAlerts: true,
      systemAlerts: true,
      maintenanceAlerts: true,
      emailProvider: "",
      smsProvider: ""
    },
    backup: {
      autoBackup: true,
      backupFrequency: "daily",
      backupRetention: 30,
      lastBackup: "",
      backupLocation: "",
      backupSize: ""
    },
    performance: {
      cacheEnabled: true,
      compressionEnabled: true,
      cdnEnabled: true,
      maxFileSize: "",
      sessionStorage: "",
      databaseOptimization: true
    },
    integrations: {
      fifaApi: false,
      paymentGateway: "",
      smsGateway: "",
      emailService: "",
      cloudStorage: "",
      analyticsService: ""
    }
  });

  // Fetch users from server
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fix: Use the correct API endpoint path with the /api prefix for Vite proxy
        const res = await fetch('/api/admin/list-users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        } else {
          console.error('Failed to fetch users');
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

  // State for loading and error handling
  const [isLoading, setIsLoading] = useState({
    stats: false,
    settings: false
  });
  const [errors, setErrors] = useState({
    stats: null,
    settings: null
  });

  // Fetch system stats from server
  useEffect(() => {
    const fetchSystemStats = async () => {
      setIsLoading(prev => ({ ...prev, stats: true }));
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();

          // Update system stats with real data
          setSystemStats({
            totalAcademies: data.totalAcademies || 0,
            totalPlayers: data.totalPlayers || 0,
            monthlyRevenue: data.monthlyRevenue || 0
          });

          // Set compliance stats from real data only
          setComplianceStats({
            totalCompliances: data.totalCompliances || 0,
            pendingReviews: data.pendingReviews || 0,
            approvedThisMonth: data.approvedCompliances || 0,
            flaggedIssues: data.flaggedIssues || 0,
            averageReviewTime: data.averageReviewTime || "N/A"
          });

          // Set financial stats from real data only
          setFinancialStats({
            totalRevenue: data.totalRevenue || 0,
            monthlyRevenue: data.monthlyRevenue || 0,
            totalTransactions: data.totalTransactions || 0,
            pendingPayments: data.pendingPayments || 0,
            subscriptionRevenue: data.subscriptionRevenue || 0,
            averageTransactionValue: data.averageTransactionValue || 0,
            revenueGrowth: data.revenueGrowth || 0,
            revenueBreakdown: data.revenueBreakdown || { subscriptions: 0, transactions: 0 }
          });

          setErrors(prev => ({ ...prev, stats: null }));
        } else {
          console.error('Failed to fetch dashboard stats');
          setErrors(prev => ({ ...prev, stats: 'Failed to fetch dashboard statistics' }));
          toast({
            title: "Error",
            description: "Failed to fetch dashboard statistics",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setErrors(prev => ({ ...prev, stats: 'Failed to connect to the server' }));
        toast({
          title: "Error",
          description: "Failed to connect to the server",
          variant: "destructive"
        });
      } finally {
        setIsLoading(prev => ({ ...prev, stats: false }));
      }
    };
    fetchSystemStats();
  }, [toast]);

  // Fetch system settings from server
  useEffect(() => {
    const fetchSystemSettings = async () => {
      setIsLoading(prev => ({ ...prev, settings: true }));
      try {
        const res = await fetch('/api/system-settings');
        if (res.ok) {
          const data = await res.json();
          setSystemSettings(data);
          setErrors(prev => ({ ...prev, settings: null }));
        } else {
          console.error('Failed to fetch system settings');
          setErrors(prev => ({ ...prev, settings: 'Failed to fetch system settings' }));
          toast({
            title: "Error",
            description: "Failed to fetch system settings",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('Error fetching system settings:', err);
        setErrors(prev => ({ ...prev, settings: 'Failed to connect to the server' }));
        toast({
          title: "Error",
          description: "Failed to connect to the server",
          variant: "destructive"
        });
      } finally {
        setIsLoading(prev => ({ ...prev, settings: false }));
      }
    };
    fetchSystemSettings();
  }, [toast]);

  // Fetch new accounts data from server
  useEffect(() => {
    const fetchNewAccounts = async () => {
      try {
        const res = await fetch('/api/dashboard/new-accounts');
        if (res.ok) {
          const data = await res.json();
          setNewAccounts(data.accounts || []);
          setNewAccountsStats(data.stats || {
            totalNewAccounts: 0,
            thisWeek: 0,
            thisMonth: 0,
            growthRate: 0
          });
        } else {
          console.error('Failed to fetch new accounts data');
          // Set mock data for development
          const mockAccounts = [
            {
              id: 1,
              name: "Barcelona Youth Academy",
              location: "Barcelona, Spain",
              registeredDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: "active",
              playersCount: 45
            },
            {
              id: 2,
              name: "Manchester United Academy",
              location: "Manchester, UK",
              registeredDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              status: "pending",
              playersCount: 32
            },
            {
              id: 3,
              name: "Real Madrid Cantera",
              location: "Madrid, Spain",
              registeredDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: "active",
              playersCount: 58
            },
            {
              id: 4,
              name: "Bayern Munich Youth",
              location: "Munich, Germany",
              registeredDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              status: "active",
              playersCount: 41
            },
            {
              id: 5,
              name: "Ajax Academy",
              location: "Amsterdam, Netherlands",
              registeredDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
              status: "active",
              playersCount: 37
            }
          ];
          setNewAccounts(mockAccounts);
          setNewAccountsStats({
            totalNewAccounts: mockAccounts.length,
            thisWeek: 2,
            thisMonth: mockAccounts.length,
            growthRate: 15.2
          });
        }
      } catch (err) {
        console.error('Error fetching new accounts:', err);
        // Set mock data on error
        const mockAccounts = [
          {
            id: 1,
            name: "Barcelona Youth Academy",
            location: "Barcelona, Spain",
            registeredDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: "active",
            playersCount: 45
          },
          {
            id: 2,
            name: "Manchester United Academy",
            location: "Manchester, UK",
            registeredDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            status: "pending",
            playersCount: 32
          }
        ];
        setNewAccounts(mockAccounts);
        setNewAccountsStats({
          totalNewAccounts: mockAccounts.length,
          thisWeek: 1,
          thisMonth: mockAccounts.length,
          growthRate: 8.5
        });
      }
    };
    fetchNewAccounts();
  }, []);

  // Fetch country distribution data from server
  useEffect(() => {
    const fetchCountryDistribution = async () => {
      try {
        const res = await fetch('/api/dashboard/country-distribution');
        if (res.ok) {
          const data = await res.json();
          setCountryDistribution(data.countries || []);
          setCountryDistributionStats(data.stats || {
            totalCountries: 0,
            topCountry: '',
            topCountryPercentage: 0,
            totalAcademies: 0
          });
        } else {
          console.error('Failed to fetch country distribution data');
          // Set mock data for development
          const mockCountries = [
            { country: "Zambia", academyCount: 15, percentage: 35.7, flag: "🇿🇲" },
            { country: "South Africa", academyCount: 8, percentage: 19.0, flag: "🇿🇦" },
            { country: "Kenya", academyCount: 6, percentage: 14.3, flag: "🇰🇪" },
            { country: "Nigeria", academyCount: 5, percentage: 11.9, flag: "🇳🇬" },
            { country: "Ghana", academyCount: 4, percentage: 9.5, flag: "🇬🇭" },
            { country: "Tanzania", academyCount: 4, percentage: 9.5, flag: "🇹🇿" }
          ];
          setCountryDistribution(mockCountries);
          setCountryDistributionStats({
            totalCountries: mockCountries.length,
            topCountry: mockCountries[0].country,
            topCountryPercentage: mockCountries[0].percentage,
            totalAcademies: mockCountries.reduce((sum, c) => sum + c.academyCount, 0)
          });
        }
      } catch (err) {
        console.error('Error fetching country distribution:', err);
        // Set mock data on error
        const mockCountries = [
          { country: "Zambia", academyCount: 15, percentage: 35.7, flag: "🇿🇲" },
          { country: "South Africa", academyCount: 8, percentage: 19.0, flag: "🇿🇦" },
          { country: "Kenya", academyCount: 6, percentage: 14.3, flag: "🇰🇪" },
          { country: "Nigeria", academyCount: 5, percentage: 11.9, flag: "🇳🇬" }
        ];
        setCountryDistribution(mockCountries);
        setCountryDistributionStats({
          totalCountries: mockCountries.length,
          topCountry: mockCountries[0].country,
          topCountryPercentage: mockCountries[0].percentage,
          totalAcademies: mockCountries.reduce((sum, c) => sum + c.academyCount, 0)
        });
      }
    };
    fetchCountryDistribution();
  }, []);

  // Fetch financial growth data
  useEffect(() => {
    const fetchFinancialGrowth = async () => {
      try {
        const response = await fetch('/api/dashboard/financial-growth');
        if (response.ok) {
          const data = await response.json();
          setFinancialGrowthData(data.data || []);
          setFinancialGrowthStats(data.stats || {});
        } else {
          // Use mock data for development or if API fails
          const mockFinancialData = [
            { month: 'Jan', revenue: 12500, subscriptions: 25, growth: 8.5 },
            { month: 'Feb', revenue: 15200, subscriptions: 32, growth: 21.6 },
            { month: 'Mar', revenue: 18900, subscriptions: 41, growth: 24.3 },
            { month: 'Apr', revenue: 22100, subscriptions: 48, growth: 16.9 },
            { month: 'May', revenue: 26800, subscriptions: 58, growth: 21.3 },
            { month: 'Jun', revenue: 31200, subscriptions: 67, growth: 16.4 },
            { month: 'Jul', revenue: 35600, subscriptions: 76, growth: 14.1 },
            { month: 'Aug', revenue: 39800, subscriptions: 84, growth: 11.8 },
            { month: 'Sep', revenue: 44200, subscriptions: 93, growth: 11.1 },
            { month: 'Oct', revenue: 48900, subscriptions: 102, growth: 10.6 },
            { month: 'Nov', revenue: 53800, subscriptions: 112, growth: 10.0 },
            { month: 'Dec', revenue: 58500, subscriptions: 121, growth: 8.7 }
          ];
          setFinancialGrowthData(mockFinancialData);
          setFinancialGrowthStats({
            totalRevenue: 467500,
            monthlyGrowth: 13.2,
            totalSubscriptions: 879,
            avgRevenuePerSubscription: 532
          });
        }
      } catch (error) {
        console.error('Error fetching financial growth data:', error);
        // Use mock data as fallback
        const mockFinancialData = [
          { month: 'Jan', revenue: 12500, subscriptions: 25, growth: 8.5 },
          { month: 'Feb', revenue: 15200, subscriptions: 32, growth: 21.6 },
          { month: 'Mar', revenue: 18900, subscriptions: 41, growth: 24.3 },
          { month: 'Apr', revenue: 22100, subscriptions: 48, growth: 16.9 },
          { month: 'May', revenue: 26800, subscriptions: 58, growth: 21.3 },
          { month: 'Jun', revenue: 31200, subscriptions: 67, growth: 16.4 },
          { month: 'Jul', revenue: 35600, subscriptions: 76, growth: 14.1 },
          { month: 'Aug', revenue: 39800, subscriptions: 84, growth: 11.8 },
          { month: 'Sep', revenue: 44200, subscriptions: 93, growth: 11.1 },
          { month: 'Oct', revenue: 48900, subscriptions: 102, growth: 10.6 },
          { month: 'Nov', revenue: 53800, subscriptions: 112, growth: 10.0 },
          { month: 'Dec', revenue: 58500, subscriptions: 121, growth: 8.7 }
        ];
        setFinancialGrowthData(mockFinancialData);
        setFinancialGrowthStats({
          totalRevenue: 467500,
          monthlyGrowth: 13.2,
          totalSubscriptions: 879,
          avgRevenuePerSubscription: 532
        });
      }
    };
    fetchFinancialGrowth();
    fetchFinancialGrowth();
  }, []);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      setTransactionsLoading(true);
      try {
        const res = await fetch('/api/dashboard/transactions?limit=10');
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setTransactionsLoading(false);
      }
    };

    if (activeTab === 'finances') {
      fetchTransactions();
    }
  }, [activeTab]);

  const [selectedCompliance, setSelectedCompliance] = useState(null);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);

  // Academy management state
  const [academies, setAcademies] = useState(() => {
    const savedAcademies = localStorage.getItem('academies');
    return savedAcademies ? JSON.parse(savedAcademies) : [];
  });
  const [isCreateAcademyOpen, setIsCreateAcademyOpen] = useState(false);
  const [selectedAcademy, setSelectedAcademy] = useState(null);
  const [isViewAcademyOpen, setIsViewAcademyOpen] = useState(false);
  const [isEditAcademyOpen, setIsEditAcademyOpen] = useState(false);
  const [isDeleteAcademyOpen, setIsDeleteAcademyOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [createAcademyForm, setCreateAcademyForm] = useState({
    name: "",
    director: "",
    location: "",
    email: "",
    phone: "",
    address: "",
    establishedDate: "",
    subscription: "Basic",
    description: "",
    website: "",
    capacity: ""
  });
  const [formErrors, setFormErrors] = useState({});

  // Authentication check: allow both admin and superadmin
  useEffect(() => {
    if (!isAdmin(session)) {
      navigate("/admin/login");
    }
  }, [session, navigate]);

  // System settings handlers
  const handleSystemSettingsChange = (section, field, value) => {
    setSystemSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const saveSystemSettings = async () => {
    try {
      const res = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(systemSettings),
      });

      if (res.ok) {
        console.log('System settings saved successfully');
        // You could add a toast notification here
      } else {
        console.error('Failed to save system settings');
      }
    } catch (err) {
      console.error('Error saving system settings:', err);
    }
  };

  const resetSystemSettings = async () => {
    try {
      const res = await fetch('/api/system-settings/reset', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setSystemSettings(data);
        console.log('System settings reset to defaults');
      } else {
        console.error('Failed to reset system settings');
      }
    } catch (err) {
      console.error('Error resetting system settings:', err);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/admin/login");
  };

  const handleViewCompliance = (compliance) => {
    setSelectedCompliance(compliance);
    setIsComplianceModalOpen(true);
  };

  const handleApproveCompliance = (complianceId) => {
    // Handle compliance approval logic
    console.log('Approving compliance:', complianceId);
  };

  const handleRejectCompliance = (complianceId) => {
    // Handle compliance rejection logic
    console.log('Rejecting compliance:', complianceId);
  };

  const handleFlagCompliance = (complianceId) => {
    // Handle compliance flagging logic
    console.log('Flagging compliance:', complianceId);
  };

  // Financial handler functions
  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setIsFinancialModalOpen(true);
  };

  const handleProcessPayment = (transactionId) => {
    // Handle payment processing logic
    console.log('Processing payment:', transactionId);
  };

  const handleRefundTransaction = (transactionId) => {
    // Handle transaction refund logic
    console.log('Refunding transaction:', transactionId);
  };

  const handleExportFinancials = () => {
    // Handle financial data export
    console.log('Exporting financial data');
  };

  // Academy management handlers
  const validateAcademyForm = (formData) => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Academy name is required";
    if (!formData.director.trim()) errors.director = "Director name is required";
    if (!formData.location.trim()) errors.location = "Location is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Email is invalid";
    if (!formData.phone.trim()) errors.phone = "Phone number is required";
    if (!formData.address.trim()) errors.address = "Address is required";
    if (!formData.establishedDate) errors.establishedDate = "Established date is required";
    if (!formData.capacity || formData.capacity < 1) errors.capacity = "Valid capacity is required";
    return errors;
  };

  const handleCreateAcademy = () => {
    const errors = validateAcademyForm(createAcademyForm);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      const newAcademy = {
        id: `ACD${String(academies.length + 1).padStart(3, '0')}`,
        name: createAcademyForm.name,
        director: createAcademyForm.director,
        location: createAcademyForm.location,
        status: "pending",
        players: 0,
        joinDate: new Date().toISOString().split('T')[0],
        subscription: createAcademyForm.subscription,
        revenue: 0,
        email: createAcademyForm.email,
        phone: createAcademyForm.phone,
        address: createAcademyForm.address,
        establishedDate: createAcademyForm.establishedDate,
        description: createAcademyForm.description,
        website: createAcademyForm.website,
        capacity: parseInt(createAcademyForm.capacity)
      };

      const updatedAcademies = [...academies, newAcademy];
      setAcademies(updatedAcademies);
      localStorage.setItem('academies', JSON.stringify(updatedAcademies));
      localStorage.setItem('academies', JSON.stringify(updatedAcademies));
      setIsCreateAcademyOpen(false);
      setCreateAcademyForm({
        name: "",
        director: "",
        location: "",
        email: "",
        phone: "",
        address: "",
        establishedDate: "",
        subscription: "Basic",
        description: "",
        website: "",
        capacity: ""
      });
      setFormErrors({});

      // Show success notification
      toast({
        title: "Academy Created Successfully",
        description: `${newAcademy.name} has been added to the system.`,
        variant: "default",
      });
    }
  };

  const handleViewAcademy = (academy) => {
    setSelectedAcademy(academy);
    setIsViewAcademyOpen(true);
  };

  const handleEditAcademy = (academy) => {
    setSelectedAcademy(academy);
    setCreateAcademyForm({
      name: academy.name,
      director: academy.director,
      location: academy.location,
      email: academy.email || "",
      phone: academy.phone || "",
      address: academy.address || "",
      establishedDate: academy.establishedDate || "",
      subscription: academy.subscription,
      description: academy.description || "",
      website: academy.website || "",
      capacity: academy.capacity?.toString() || ""
    });
    setIsEditAcademyOpen(true);
  };

  const handleUpdateAcademy = () => {
    const errors = validateAcademyForm(createAcademyForm);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      const updatedAcademies = academies.map(academy =>
        academy.id === selectedAcademy.id
          ? {
            ...academy,
            name: createAcademyForm.name,
            director: createAcademyForm.director,
            location: createAcademyForm.location,
            subscription: createAcademyForm.subscription,
            email: createAcademyForm.email,
            phone: createAcademyForm.phone,
            address: createAcademyForm.address,
            establishedDate: createAcademyForm.establishedDate,
            description: createAcademyForm.description,
            website: createAcademyForm.website,
            capacity: parseInt(createAcademyForm.capacity)
          }
          : academy
      );

      setAcademies(updatedAcademies);
      localStorage.setItem('academies', JSON.stringify(updatedAcademies));
      setIsEditAcademyOpen(false);
      setSelectedAcademy(null);
      setCreateAcademyForm({
        name: "",
        director: "",
        location: "",
        email: "",
        phone: "",
        address: "",
        establishedDate: "",
        subscription: "Basic",
        description: "",
        website: "",
        capacity: ""
      });
      setFormErrors({});
    }
  };

  const handleDeleteAcademy = (academy) => {
    setSelectedAcademy(academy);
    setIsDeleteAcademyOpen(true);
  };

  const confirmDeleteAcademy = () => {
    const updatedAcademies = academies.filter(academy => academy.id !== selectedAcademy.id);
    setAcademies(updatedAcademies);
    localStorage.setItem('academies', JSON.stringify(updatedAcademies));
    setIsDeleteAcademyOpen(false);
    setSelectedAcademy(null);
  };

  // Filter and search functionality
  const filteredAcademies = academies.filter(academy => {
    const matchesSearch = academy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      academy.director.toLowerCase().includes(searchTerm.toLowerCase()) ||
      academy.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || academy.status === statusFilter;
    const matchesSubscription = subscriptionFilter === 'all' || academy.subscription === subscriptionFilter;

    return matchesSearch && matchesStatus && matchesSubscription;
  });

  const handleRefreshAcademies = () => {
    // In a real app, this would refetch data from the server
    setSearchTerm('');
    setStatusFilter('all');
    setSubscriptionFilter('all');
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "academies", label: "Academy Management", icon: Building },
    { id: "super-admins", label: "Super Admins", icon: Users },
    { id: "compliance", label: "FIFA Compliance", icon: Shield },
    { id: "finances", label: "Financial Overview", icon: DollarSign },
    { id: "blog", label: "Blog Management", icon: BookOpen },
    { id: "system", label: "System Settings", icon: Settings },
    { id: "analytics", label: "Analytics", icon: BarChart3 }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Admin Panel Name */}
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
                    <Shield className="h-5 w-5 text-[#005391]" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <Star className="h-2 w-2 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    Soccer Circular Admin
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">System Administration</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search academies, users, transactions..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Admin Menu */}
            <div className="flex items-center gap-4">
              <NotificationsPopover />
              <ThemeToggle />
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/default-admin-avatar.png" />
                  <AvatarFallback className="bg-blue-600 text-white font-bold">AD</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    System Admin
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Super Administrator
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
                      if (item.id === 'super-admins') {
                        navigate('/admin/super-admins');
                      } else {
                        setActiveTab(item.id);
                      }
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>

            <TabsContent value="sales" className="space-y-6">
              <SalesAgentsManager />
            </TabsContent>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    System Overview
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Soccer Circular administration dashboard
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm bg-red-100 text-red-800 border-red-200">
                  ADMIN-001
                </Badge>
              </div>

              {/* System Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Academies</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{systemStats.totalAcademies}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          +{newAccountsStats.thisMonth} this month
                        </p>
                      </div>
                      <Building className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Players</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{systemStats.totalPlayers.toLocaleString()}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Across all academies
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Monthly Revenue</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          ${financialGrowthData && financialGrowthData.length > 0 ? financialGrowthData[financialGrowthData.length - 1].revenue.toLocaleString() : '0'}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          +{financialGrowthStats?.monthlyGrowth || 0}% growth
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">New Accounts</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{newAccountsStats.thisWeek}</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          This week
                        </p>
                      </div>
                      <UserPlus className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Financial Growth
                    </CardTitle>
                    <CardDescription>
                      Subscription revenue and growth trends over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Financial Stats Summary */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</p>
                          <p className="text-lg font-bold text-green-600">${financialGrowthStats?.totalRevenue?.toLocaleString() || '0'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-600 dark:text-slate-400">Monthly Growth</p>
                          <p className="text-lg font-bold text-blue-600">+{financialGrowthStats?.monthlyGrowth || 0}%</p>
                        </div>
                      </div>

                      {/* Revenue Chart */}
                      <div className="h-48">
                        <ChartContainer config={chartConfig}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={financialGrowthData || []}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <ChartTooltip
                                content={<ChartTooltipContent />}
                                formatter={(value, name) => [
                                  name === 'revenue' ? `$${value.toLocaleString()}` : value,
                                  name === 'revenue' ? 'Revenue' : 'Subscriptions'
                                ]}
                              />
                              <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke={chartConfig.revenue.color}
                                strokeWidth={2}
                                dot={{ fill: chartConfig.revenue.color, strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </div>

                      {/* Additional Stats */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Total Subscriptions</p>
                          <p className="text-sm font-medium">{financialGrowthStats?.totalSubscriptions || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Avg Revenue/Sub</p>
                          <p className="text-sm font-medium">${financialGrowthStats?.avgRevenuePerSubscription || 0}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Global Distribution
                    </CardTitle>
                    <CardDescription>
                      Academy distribution by countries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {countryDistribution.map((country, index) => (
                        <div key={country.country} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{country.flag}</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{country.country}</span>
                          </div>
                          <span className="text-sm font-medium">{country.percentage}%</span>
                        </div>
                      ))}
                      {countryDistribution.map((country, index) => (
                        <Progress key={`progress-${country.country}`} value={country.percentage} className="h-2" />
                      ))}

                      {countryDistributionStats && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Total Academies: {countryDistributionStats.totalAcademies}</span>
                            <span>Top Country: {countryDistributionStats.topCountry}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 gap-6">
                <Card className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      New Accounts
                    </CardTitle>
                    <CardDescription>
                      Academies registered in the past 30 days
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {newAccounts.length > 0 ? (
                      <div className="space-y-3">
                        {newAccounts.map((academy) => (
                          <div key={academy.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={academy.logo} alt={academy.name} />
                                <AvatarFallback className="bg-red-100 text-red-600 font-semibold">
                                  {academy.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{academy.name}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{academy.location}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={academy.status === 'active' ? 'default' : 'secondary'} className="mb-1">
                                {academy.status}
                              </Badge>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {new Date(academy.registeredAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}

                        {/* Summary Stats */}
                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold text-green-600">{newAccountsStats.thisWeek}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">This Week</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-blue-600">{newAccountsStats.thisMonth}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">This Month</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-purple-600">+{newAccountsStats.growthRate}%</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">Growth Rate</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No new academies registered recently</p>
                        <p className="text-sm">New registrations will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Academy Management Tab */}
            <TabsContent value="academies" className="space-y-6">
              <AcademyManagement />
            </TabsContent>

            {/* Blog Management Tab */}
            <TabsContent value="blog" className="space-y-6">
              <BlogManagement />
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              {/* Compliance Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Compliances</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{complianceStats.totalCompliances}</p>
                      </div>
                      <FileCheck className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Reviews</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{complianceStats.pendingReviews}</p>
                      </div>
                      <Clock3 className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Approved This Month</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{complianceStats.approvedThisMonth}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Flagged Issues</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{complianceStats.flaggedIssues}</p>
                      </div>
                      <AlertOctagon className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Review Time</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{complianceStats.averageReviewTime}</p>
                      </div>
                      <Gavel className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Compliance Management */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-xl font-semibold">FIFA Compliance Management</CardTitle>
                    <CardDescription>Monitor and manage FIFA compliance requirements</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                          placeholder="Search compliance records..."
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="flagged">Flagged</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="player_registration">Player Registration</SelectItem>
                          <SelectItem value="transfer_compliance">Transfer Compliance</SelectItem>
                          <SelectItem value="academy_licensing">Academy Licensing</SelectItem>
                          <SelectItem value="financial_fair_play">Financial Fair Play</SelectItem>
                          <SelectItem value="youth_protection">Youth Protection</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Priorities</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Compliance Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800">
                          <TableHead className="font-semibold">Academy</TableHead>
                          <TableHead className="font-semibold">Compliance Type</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Priority</TableHead>
                          <TableHead className="font-semibold">Submission Date</TableHead>
                          <TableHead className="font-semibold">Due Date</TableHead>
                          <TableHead className="font-semibold">Reviewer</TableHead>
                          <TableHead className="font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isComplianceLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                              Loading compliance documents...
                            </TableCell>
                          </TableRow>
                        ) : complianceDocuments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                              <p>No compliance data available</p>
                              <p className="text-sm">New submissions will appear here</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          complianceDocuments.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{doc.academy_name}</p>
                                  <p className="text-xs text-muted-foreground">{doc.academy_email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{doc.document_type}</Badge>
                                <p className="text-xs mt-1">{doc.document_name}</p>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    doc.status === 'verified' ? 'default' : 
                                    doc.status === 'rejected' ? 'destructive' : 
                                    'secondary'
                                  }
                                >
                                  {doc.status === 'verified' ? 'Approved' : 
                                   doc.status === 'rejected' ? 'Rejected' : 
                                   'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Medium</Badge>
                              </TableCell>
                              <TableCell>{new Date(doc.upload_date).toLocaleDateString()}</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>Admin</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  {doc.file_url && (
                                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                      <Button variant="ghost" size="sm" title="View Document">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </a>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleUpdateDocumentStatus(doc.id, 'verified')}
                                    disabled={doc.status === 'verified'}
                                    title="Approve"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleUpdateDocumentStatus(doc.id, 'rejected')}
                                    disabled={doc.status === 'rejected'}
                                    title="Reject"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Showing 0 of 0 compliance records
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button variant="default" size="sm" className="w-8 h-8 p-0">1</Button>
                        <Button variant="outline" size="sm" className="w-8 h-8 p-0">2</Button>
                        <Button variant="outline" size="sm" className="w-8 h-8 p-0">3</Button>
                      </div>
                      <Button variant="outline" size="sm">
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="finances" className="space-y-6">
              {/* Financial Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${financialStats.totalRevenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      +{financialStats.revenueGrowth}% from last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                    <LineChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${financialStats.monthlyRevenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Current month earnings
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialStats.totalTransactions.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Avg: ${financialStats.averageTransactionValue}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialStats.pendingPayments}</div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting processing
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Overview Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart className="h-5 w-5" />
                      Revenue Breakdown
                    </CardTitle>
                    <CardDescription>Monthly revenue by source</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center py-8">
                        <div className="text-3xl font-bold mb-2">${financialStats.totalRevenue.toLocaleString()}</div>
                        <p className="text-muted-foreground">Total Revenue</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          Subscriptions
                        </span>
                        <span className="font-medium">${(financialStats.revenueBreakdown?.subscriptions || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          Transactions
                        </span>
                        <span className="font-medium">${(financialStats.revenueBreakdown?.transactions || 0).toLocaleString()}</span>
                      </div>
                      <div className="mt-4 h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${financialStats.totalRevenue > 0 ? ((financialStats.revenueBreakdown?.subscriptions || 0) / financialStats.totalRevenue) * 100 : 0}%`
                          }}
                        />
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${financialStats.totalRevenue > 0 ? ((financialStats.revenueBreakdown?.transactions || 0) / financialStats.totalRevenue) * 100 : 0}%`
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Payment Methods
                    </CardTitle>
                    <CardDescription>Distribution by method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-center py-8 text-slate-500">
                        Payment method data will be loaded from API
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Financial Management Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Transaction History
                      </CardTitle>
                      <CardDescription>Recent financial transactions and payments</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleExportFinancials}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search transactions..."
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="subscription">Subscription</SelectItem>
                          <SelectItem value="transfer_fee">Transfer Fee</SelectItem>
                          <SelectItem value="registration_fee">Registration</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Academy</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionsLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              Loading transactions...
                            </TableCell>
                          </TableRow>
                        ) : transactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          transactions.map((tx: any) => (
                            <TableRow key={tx.id}>
                              <TableCell className="font-mono text-xs">{tx.id.substring(0, 8)}...</TableCell>
                              <TableCell>{tx.academy}</TableCell>
                              <TableCell className="capitalize">{tx.type}</TableCell>
                              <TableCell>${tx.amount.toFixed(2)}</TableCell>
                              <TableCell className="capitalize">{tx.method?.replace('_', ' ') || 'N/A'}</TableCell>
                              <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge variant={tx.status === 'COMPLETED' ? 'default' : tx.status === 'PENDING' ? 'secondary' : 'destructive'}>
                                  {tx.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setViewingTransaction(tx)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing 0 of 0 transactions
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled>
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button variant="outline" size="sm">
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              {/* System Settings Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    System Settings
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Configure basic system preferences
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetSystemSettings}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                  <Button size="sm" onClick={saveSystemSettings}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </Button>
                </div>
              </div>

              {/* Simplified Settings */}
              <div className="grid grid-cols-1 gap-6">
                {/* General Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cog className="h-5 w-5" />
                      General Configuration
                    </CardTitle>
                    <CardDescription>
                      Basic system configuration and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={systemSettings.general.timezone} onValueChange={(value) => handleSystemSettingsChange('general', 'timezone', value)}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="America/New_York">America/New_York (Eastern)</SelectItem>
                            <SelectItem value="America/Los_Angeles">America/Los_Angeles (Pacific)</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="Africa/Lusaka">Africa/Lusaka</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select value={systemSettings.general.language} onValueChange={(value) => handleSystemSettingsChange('general', 'language', value)}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                            <SelectItem value="Portuguese">Portuguese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={systemSettings.general.currency} onValueChange={(value) => handleSystemSettingsChange('general', 'currency', value)}>
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="ZMW">ZMW - Zambian Kwacha</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t mt-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Maintenance Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable to restrict access during maintenance
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleSystemSettingsChange('general', 'maintenanceMode', !systemSettings.general.maintenanceMode)}
                          className={systemSettings.general.maintenanceMode ? "border-green-500 text-green-600" : ""}
                        >
                          {systemSettings.general.maintenanceMode ? (
                            <>
                              <ToggleRight className="h-4 w-4 mr-2" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4 mr-2" />
                              Disabled
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Analytics Dashboard
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Comprehensive insights and performance metrics
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              </div>

              {/* Overview Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          $0
                        </p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm text-green-600">+0%</span>
                        </div>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Users</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          0
                        </p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
                          <span className="text-sm text-blue-600">+0%</span>
                        </div>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Academies</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          0
                        </p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-sm text-red-600">+0%</span>
                        </div>
                      </div>
                      <Building className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Registration Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      User & Academy Growth
                    </CardTitle>
                    <CardDescription>Monthly registration trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area
                            type="monotone"
                            dataKey="users"
                            stackId="1"
                            stroke={chartConfig.users.color}
                            fill={chartConfig.users.color}
                            fillOpacity={0.6}
                          />
                          <Area
                            type="monotone"
                            dataKey="academies"
                            stackId="2"
                            stroke={chartConfig.academies.color}
                            fill={chartConfig.academies.color}
                            fillOpacity={0.6}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Revenue Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      Revenue Breakdown
                    </CardTitle>
                    <CardDescription>Monthly revenue by source</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="subscriptions" fill={chartConfig.subscriptions.color} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* User Activity Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-purple-600" />
                      User Activity Distribution
                    </CardTitle>
                    <CardDescription>Breakdown of user activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[]}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            label={({ activity, percentage }) => `${activity}: ${percentage}%`}
                          >
                            {/* No data available */}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* System Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-cyan-600" />
                      System Performance
                    </CardTitle>
                    <CardDescription>Real-time system metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line
                            type="monotone"
                            dataKey="cpu"
                            stroke={chartConfig.cpu.color}
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="memory"
                            stroke={chartConfig.memory.color}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Academy Performance Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-red-600" />
                    Top Performing Academies
                  </CardTitle>
                  <CardDescription>Academy performance metrics and rankings</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Academy Name</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Academy performance data will be loaded from API
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Geographic Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-600" />
                    Geographic Distribution
                  </CardTitle>
                  <CardDescription>User and academy distribution by country</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-4">Users by Country</h4>
                      <ChartContainer config={chartConfig} className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[]}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="users"
                              label={({ country, users }) => `${country}: ${users}`}
                            >
                              {/* No data available */}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                    <div>
                      <h4 className="font-medium mb-4">Country Statistics</h4>
                      <div className="space-y-4">
                        <div className="text-center text-muted-foreground py-8">
                          Geographic data will be loaded from API
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
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

      {/* Compliance Details Modal */}
      <Dialog open={isComplianceModalOpen} onOpenChange={setIsComplianceModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-blue-600" />
              Compliance Details - {selectedCompliance?.id}
            </DialogTitle>
            <DialogDescription>
              Review and manage FIFA compliance requirements
            </DialogDescription>
          </DialogHeader>

          {selectedCompliance && (
            <div className="space-y-6">
              {/* Academy Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5 text-blue-600" />
                      Academy Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Academy:</span>
                      <span className="font-medium">{selectedCompliance.academyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Academy ID:</span>
                      <span className="font-medium">{selectedCompliance.academyId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Compliance Type:</span>
                      <span className="font-medium">{selectedCompliance.complianceType}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock3 className="h-5 w-5 text-orange-600" />
                      Review Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Submitted:</span>
                      <span className="font-medium">{selectedCompliance.submissionDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Due Date:</span>
                      <span className="font-medium">{selectedCompliance.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Reviewer:</span>
                      <span className="font-medium">{selectedCompliance.reviewer}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-green-600" />
                    Current Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div>
                        {selectedCompliance.status === 'pending' && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                            <Clock3 className="h-3 w-3 mr-1" />
                            Pending Review
                          </Badge>
                        )}
                        {selectedCompliance.status === 'approved' && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {selectedCompliance.status === 'under_review' && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            <Eye className="h-3 w-3 mr-1" />
                            Under Review
                          </Badge>
                        )}
                        {selectedCompliance.status === 'flagged' && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <Flag className="h-3 w-3 mr-1" />
                            Flagged
                          </Badge>
                        )}
                      </div>
                      <div>
                        {selectedCompliance.priority === 'urgent' && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Urgent Priority
                          </Badge>
                        )}
                        {selectedCompliance.priority === 'high' && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">High Priority</Badge>
                        )}
                        {selectedCompliance.priority === 'medium' && (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium Priority</Badge>
                        )}
                        {selectedCompliance.priority === 'low' && (
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">Low Priority</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Description:</p>
                    <p className="text-slate-900 dark:text-white">{selectedCompliance.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Required Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedCompliance.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-sm font-medium">{doc}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Submitted
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons for Pending Compliance */}
              {selectedCompliance.status === 'pending' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gavel className="h-5 w-5 text-blue-600" />
                      Review Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => handleApproveCompliance(selectedCompliance.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Compliance
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleRejectCompliance(selectedCompliance.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Compliance
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleFlagCompliance(selectedCompliance.id)}
                        className="border-orange-200 text-orange-600 hover:bg-orange-50"
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Flag Issue
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-slate-600" />
                    Review Comments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">FIFA Compliance Officer</span>
                        <span className="text-xs text-slate-500">2024-01-19 10:30</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Initial review completed. All required documents have been submitted and are being processed.
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">System</span>
                        <span className="text-xs text-slate-500">2024-01-18 14:15</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Compliance submission received and assigned for review.
                      </p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <Label htmlFor="comment" className="text-sm font-medium">Add Comment</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="comment"
                        placeholder="Enter your review comment..."
                        className="flex-1"
                      />
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComplianceModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financial Details Modal */}
      <Dialog open={isFinancialModalOpen} onOpenChange={setIsFinancialModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Transaction Details - {selectedTransaction?.id}
            </DialogTitle>
            <DialogDescription>
              View detailed information about this financial transaction
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CircleDollarSign className="h-5 w-5" />
                      Transaction Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID:</span>
                      <span className="font-medium">{selectedTransaction.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference:</span>
                      <span className="font-medium">{selectedTransaction.reference}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="capitalize">
                        {selectedTransaction.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-lg">${selectedTransaction.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{selectedTransaction.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant={
                          selectedTransaction.status === 'completed' ? 'default' :
                            selectedTransaction.status === 'pending' ? 'secondary' :
                              'destructive'
                        }
                      >
                        {selectedTransaction.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Academy Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Academy:</span>
                      <span className="font-medium">{selectedTransaction.academy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Method:</span>
                      <div className="flex items-center gap-2">
                        {selectedTransaction.method === 'Credit Card' && <CreditCardIcon className="h-4 w-4" />}
                        {selectedTransaction.method === 'Bank Transfer' && <Banknote className="h-4 w-4" />}
                        {selectedTransaction.method === 'Mobile Money' && <HandCoins className="h-4 w-4" />}
                        {selectedTransaction.method === 'Wire Transfer' && <ArrowRightLeft className="h-4 w-4" />}
                        <span className="font-medium">{selectedTransaction.method}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description:</span>
                      <span className="font-medium text-right max-w-[200px]">{selectedTransaction.description}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Status and Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Transaction Status & Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        {selectedTransaction.status === 'completed' && (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        )}
                        {selectedTransaction.status === 'pending' && (
                          <Clock className="h-6 w-6 text-yellow-600" />
                        )}
                        {selectedTransaction.status === 'failed' && (
                          <XCircle className="h-6 w-6 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium capitalize">{selectedTransaction.status}</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedTransaction.status === 'completed' && 'Transaction completed successfully'}
                            {selectedTransaction.status === 'pending' && 'Transaction is being processed'}
                            {selectedTransaction.status === 'failed' && 'Transaction failed to process'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {selectedTransaction.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleProcessPayment(selectedTransaction.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Process Payment
                          </Button>
                        )}
                        {selectedTransaction.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefundTransaction(selectedTransaction.id)}
                          >
                            <ArrowDownRight className="h-4 w-4 mr-2" />
                            Refund
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportFinancials}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction History/Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Transaction Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="font-medium">Transaction Initiated</p>
                        <p className="text-sm text-muted-foreground">{selectedTransaction.date} - Payment request created</p>
                      </div>
                    </div>
                    {selectedTransaction.status !== 'failed' && (
                      <div className="flex items-center gap-4 p-3 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium">Processing</p>
                          <p className="text-sm text-muted-foreground">Payment being processed by {selectedTransaction.method}</p>
                        </div>
                      </div>
                    )}
                    {selectedTransaction.status === 'completed' && (
                      <div className="flex items-center gap-4 p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium">Completed</p>
                          <p className="text-sm text-muted-foreground">Payment successfully processed and confirmed</p>
                        </div>
                      </div>
                    )}
                    {selectedTransaction.status === 'failed' && (
                      <div className="flex items-center gap-4 p-3 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-medium">Failed</p>
                          <p className="text-sm text-muted-foreground">Payment failed - insufficient funds or technical error</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFinancialModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Academy Dialog */}
      <Dialog open={isCreateAcademyOpen} onOpenChange={setIsCreateAcademyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Academy</DialogTitle>
            <DialogDescription>
              Add a new academy to the platform with all required information.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Academy Name *</Label>
              <Input
                id="name"
                value={createAcademyForm.name}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, name: e.target.value })}
                placeholder="Enter academy name"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="director">Director Name *</Label>
              <Input
                id="director"
                value={createAcademyForm.director}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, director: e.target.value })}
                placeholder="Enter director name"
                className={formErrors.director ? "border-red-500" : ""}
              />
              {formErrors.director && <p className="text-sm text-red-500">{formErrors.director}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={createAcademyForm.location}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, location: e.target.value })}
                placeholder="City, Country"
                className={formErrors.location ? "border-red-500" : ""}
              />
              {formErrors.location && <p className="text-sm text-red-500">{formErrors.location}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={createAcademyForm.email}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, email: e.target.value })}
                placeholder="academy@example.com"
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={createAcademyForm.phone}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, phone: e.target.value })}
                placeholder="+260 XXX XXX XXX"
                className={formErrors.phone ? "border-red-500" : ""}
              />
              {formErrors.phone && <p className="text-sm text-red-500">{formErrors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="establishedDate">Established Date *</Label>
              <Input
                id="establishedDate"
                type="date"
                value={createAcademyForm.establishedDate}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, establishedDate: e.target.value })}
                className={formErrors.establishedDate ? "border-red-500" : ""}
              />
              {formErrors.establishedDate && <p className="text-sm text-red-500">{formErrors.establishedDate}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription">Subscription Plan</Label>
              <Select value={createAcademyForm.subscription} onValueChange={(value) => setCreateAcademyForm({ ...createAcademyForm, subscription: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Player Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={createAcademyForm.capacity}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, capacity: e.target.value })}
                placeholder="Maximum number of players"
                className={formErrors.capacity ? "border-red-500" : ""}
              />
              {formErrors.capacity && <p className="text-sm text-red-500">{formErrors.capacity}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={createAcademyForm.address}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, address: e.target.value })}
                placeholder="Full address"
                className={formErrors.address ? "border-red-500" : ""}
              />
              {formErrors.address && <p className="text-sm text-red-500">{formErrors.address}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={createAcademyForm.website}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, website: e.target.value })}
                placeholder="https://academy-website.com"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={createAcademyForm.description}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, description: e.target.value })}
                placeholder="Brief description of the academy"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateAcademyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAcademy}>
              <Save className="h-4 w-4 mr-2" />
              Create Academy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Academy Dialog */}
      <Dialog open={isViewAcademyOpen} onOpenChange={setIsViewAcademyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Academy Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about {selectedAcademy?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedAcademy && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Academy Name</Label>
                    <p className="text-lg font-semibold">{selectedAcademy.name}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Academy ID</Label>
                    <p className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{selectedAcademy.id}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Director</Label>
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {selectedAcademy.director}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Location</Label>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedAcademy.location}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedAcademy.status)}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</Label>
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {selectedAcademy.email || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Phone</Label>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selectedAcademy.phone || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Join Date</Label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {selectedAcademy.joinDate}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Subscription</Label>
                    <Badge variant="outline" className="mt-1">{selectedAcademy.subscription}</Badge>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Players</Label>
                    <p className="text-2xl font-bold text-blue-600">{selectedAcademy.players}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Monthly Revenue</Label>
                  <p className="text-2xl font-bold text-green-600">${selectedAcademy.revenue?.toLocaleString()}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Player Capacity</Label>
                  <p className="text-lg font-semibold">{selectedAcademy.capacity || 'Not specified'}</p>
                </div>
              </div>

              {selectedAcademy.address && (
                <div>
                  <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Address</Label>
                  <p className="mt-1">{selectedAcademy.address}</p>
                </div>
              )}

              {selectedAcademy.website && (
                <div>
                  <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Website</Label>
                  <p className="mt-1">
                    <a href={selectedAcademy.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {selectedAcademy.website}
                    </a>
                  </p>
                </div>
              )}

              {selectedAcademy.description && (
                <div>
                  <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">Description</Label>
                  <p className="mt-1 text-slate-700 dark:text-slate-300">{selectedAcademy.description}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewAcademyOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsViewAcademyOpen(false);
              handleEditAcademy(selectedAcademy);
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Academy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Academy Dialog */}
      <Dialog open={isEditAcademyOpen} onOpenChange={setIsEditAcademyOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Academy</DialogTitle>
            <DialogDescription>
              Update academy information for {selectedAcademy?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Academy Name *</Label>
              <Input
                id="edit-name"
                value={createAcademyForm.name}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, name: e.target.value })}
                placeholder="Enter academy name"
                className={formErrors.name ? "border-red-500" : ""}
              />
              {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-director">Director Name *</Label>
              <Input
                id="edit-director"
                value={createAcademyForm.director}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, director: e.target.value })}
                placeholder="Enter director name"
                className={formErrors.director ? "border-red-500" : ""}
              />
              {formErrors.director && <p className="text-sm text-red-500">{formErrors.director}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Location *</Label>
              <Input
                id="edit-location"
                value={createAcademyForm.location}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, location: e.target.value })}
                placeholder="City, Country"
                className={formErrors.location ? "border-red-500" : ""}
              />
              {formErrors.location && <p className="text-sm text-red-500">{formErrors.location}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={createAcademyForm.email}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, email: e.target.value })}
                placeholder="academy@example.com"
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input
                id="edit-phone"
                value={createAcademyForm.phone}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, phone: e.target.value })}
                placeholder="+260 XXX XXX XXX"
                className={formErrors.phone ? "border-red-500" : ""}
              />
              {formErrors.phone && <p className="text-sm text-red-500">{formErrors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-establishedDate">Established Date *</Label>
              <Input
                id="edit-establishedDate"
                type="date"
                value={createAcademyForm.establishedDate}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, establishedDate: e.target.value })}
                className={formErrors.establishedDate ? "border-red-500" : ""}
              />
              {formErrors.establishedDate && <p className="text-sm text-red-500">{formErrors.establishedDate}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subscription">Subscription Plan</Label>
              <Select value={createAcademyForm.subscription} onValueChange={(value) => setCreateAcademyForm({ ...createAcademyForm, subscription: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subscription" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-capacity">Player Capacity *</Label>
              <Input
                id="edit-capacity"
                type="number"
                min="1"
                value={createAcademyForm.capacity}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, capacity: e.target.value })}
                placeholder="Maximum number of players"
                className={formErrors.capacity ? "border-red-500" : ""}
              />
              {formErrors.capacity && <p className="text-sm text-red-500">{formErrors.capacity}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-address">Address *</Label>
              <Input
                id="edit-address"
                value={createAcademyForm.address}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, address: e.target.value })}
                placeholder="Full address"
                className={formErrors.address ? "border-red-500" : ""}
              />
              {formErrors.address && <p className="text-sm text-red-500">{formErrors.address}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-website">Website (Optional)</Label>
              <Input
                id="edit-website"
                type="url"
                value={createAcademyForm.website}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, website: e.target.value })}
                placeholder="https://academy-website.com"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={createAcademyForm.description}
                onChange={(e) => setCreateAcademyForm({ ...createAcademyForm, description: e.target.value })}
                placeholder="Brief description of the academy"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAcademyOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAcademy}>
              <Save className="h-4 w-4 mr-2" />
              Update Academy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Academy Dialog */}
      <Dialog open={isDeleteAcademyOpen} onOpenChange={setIsDeleteAcademyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Academy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedAcademy?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedAcademy && (
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Warning</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Deleting this academy will permanently remove:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 mt-2 ml-4 list-disc">
                <li>Academy profile and information</li>
                <li>Associated player records</li>
                <li>Transfer history</li>
                <li>Financial records</li>
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAcademyOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAcademy}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Academy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Reject Document Dialog */}
      <Dialog open={!!rejectingDocumentId} onOpenChange={(open) => !open && setRejectingDocumentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. This will be sent to the academy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rejectionReason">Reason for Rejection</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="E.g., Document is blurry, expired, or incorrect type."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingDocumentId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRejection} disabled={!rejectionReason.trim()}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewingTransaction} onOpenChange={(open) => !open && setViewingTransaction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Detailed information for transaction
            </DialogDescription>
          </DialogHeader>

          {viewingTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Academy</Label>
                  <p className="font-medium">{viewingTransaction.academy}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                  <p className="capitalize">{viewingTransaction.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                  <p className="font-bold text-lg">${viewingTransaction.amount?.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                  <p>{new Date(viewingTransaction.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Method</Label>
                  <p className="capitalize">{viewingTransaction.method?.replace('_', ' ') || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={viewingTransaction.status === 'COMPLETED' ? 'default' : viewingTransaction.status === 'PENDING' ? 'secondary' : 'destructive'} className="mt-1">
                    {viewingTransaction.status}
                  </Badge>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium text-muted-foreground">Transaction ID</Label>
                <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">{viewingTransaction.id}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTransaction(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}