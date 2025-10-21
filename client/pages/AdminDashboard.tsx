import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, clearSession } from '@/lib/auth';
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
  Smartphone,
  Wifi,
  HardDrive,
  Cloud,
  Download as DownloadIcon,
  Upload,
  HardDrive as BackupIcon,
  RotateCcw as RestoreIcon,
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
  HardDriveIcon
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, Line, LineChart, Pie, PieChart, Cell, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import ThemeToggle from '@/components/navigation/ThemeToggle';

// Mock data for admin dashboard
const adminData = {
  id: "ADMIN001",
  name: "FIFA Platform Admin",
  role: "Super Administrator",
  email: "admin@fifaplatform.com",
  phone: "+260 97 000 0000",
  avatar: "/images/admin-avatar.jpg"
};

const systemStats = {
  totalAcademies: 156,
  totalUsers: 2847,
  activeTransfers: 23,
  systemUptime: 99.8,
  monthlyRevenue: 125000,
  pendingApprovals: 12
};

const academiesData = [
  { 
    id: "ACD001", 
    name: "Elite Football Academy", 
    location: "Lusaka, Zambia", 
    status: "active", 
    players: 45, 
    director: "Michael Banda",
    joinDate: "2023-01-15",
    subscription: "Professional",
    revenue: 25000
  },
  { 
    id: "ACD002", 
    name: "Champions Youth FC", 
    location: "Ndola, Zambia", 
    status: "active", 
    players: 32, 
    director: "Sarah Mwanza",
    joinDate: "2023-03-22",
    subscription: "Standard",
    revenue: 18000
  },
  { 
    id: "ACD003", 
    name: "Future Stars Academy", 
    location: "Kitwe, Zambia", 
    status: "pending", 
    players: 28, 
    director: "John Phiri",
    joinDate: "2024-01-10",
    subscription: "Basic",
    revenue: 12000
  },
  { 
    id: "ACD004", 
    name: "Rising Eagles FC", 
    location: "Livingstone, Zambia", 
    status: "suspended", 
    players: 15, 
    director: "Grace Tembo",
    joinDate: "2022-11-08",
    subscription: "Standard",
    revenue: 8000
  }
];

const recentActivities = [
  {
    id: 1,
    type: "academy_registration",
    description: "New academy registration: Future Stars Academy",
    timestamp: "2024-01-20 14:30",
    status: "pending"
  },
  {
    id: 2,
    type: "transfer_approval",
    description: "Transfer approved: James Sakala to Nkana FC",
    timestamp: "2024-01-20 12:15",
    status: "completed"
  },
  {
    id: 3,
    type: "compliance_issue",
    description: "FIFA compliance issue reported for Rising Eagles FC",
    timestamp: "2024-01-20 10:45",
    status: "urgent"
  },
  {
    id: 4,
    type: "payment_received",
    description: "Subscription payment received from Elite Football Academy",
    timestamp: "2024-01-20 09:20",
    status: "completed"
  }
];

const pendingApprovals = [
  {
    id: 1,
    type: "Academy Registration",
    item: "Future Stars Academy",
    submittedBy: "John Phiri",
    date: "2024-01-18",
    priority: "high"
  },
  {
    id: 2,
    type: "Player Transfer",
    item: "Mary Chanda to Green Buffaloes",
    submittedBy: "Elite Football Academy",
    date: "2024-01-17",
    priority: "medium"
  },
  {
    id: 3,
    type: "Document Verification",
    item: "FIFA Compliance Certificate",
    submittedBy: "Champions Youth FC",
    date: "2024-01-16",
    priority: "low"
  }
];

// Transfer data
const transferStats = {
  totalTransfers: 156,
  pendingApprovals: 23,
  approvedThisMonth: 45,
  rejectedThisMonth: 8,
  averageProcessingTime: "3.2 days"
};

const transfersData = [
  {
    id: "TRF001",
    playerName: "James Sakala",
    playerAge: 19,
    position: "Forward",
    fromAcademy: "Elite Football Academy",
    toClub: "Nkana FC",
    transferFee: 50000,
    submissionDate: "2024-01-15",
    status: "pending",
    priority: "high",
    documents: ["Contract", "Medical Certificate", "FIFA Clearance"],
    agent: "Michael Banda",
    playerImage: "/images/players/james-sakala.jpg"
  },
  {
    id: "TRF002",
    playerName: "Mary Chanda",
    playerAge: 17,
    position: "Midfielder",
    fromAcademy: "Champions Youth FC",
    toClub: "Green Buffaloes",
    transferFee: 35000,
    submissionDate: "2024-01-12",
    status: "approved",
    priority: "medium",
    documents: ["Contract", "Medical Certificate", "FIFA Clearance", "Work Permit"],
    agent: "Sarah Mwanza",
    playerImage: "/images/players/mary-chanda.jpg"
  },
  {
    id: "TRF003",
    playerName: "David Phiri",
    playerAge: 20,
    position: "Defender",
    fromAcademy: "Future Stars Academy",
    toClub: "Zanaco FC",
    transferFee: 25000,
    submissionDate: "2024-01-10",
    status: "under_review",
    priority: "low",
    documents: ["Contract", "Medical Certificate"],
    agent: "John Phiri",
    playerImage: "/images/players/david-phiri.jpg"
  },
  {
    id: "TRF004",
    playerName: "Grace Tembo",
    playerAge: 18,
    position: "Goalkeeper",
    fromAcademy: "Rising Eagles FC",
    toClub: "Red Arrows FC",
    transferFee: 40000,
    submissionDate: "2024-01-08",
    status: "rejected",
    priority: "medium",
    documents: ["Contract", "Medical Certificate", "FIFA Clearance"],
    agent: "Grace Tembo",
    playerImage: "/images/players/grace-tembo.jpg"
  },
  {
    id: "TRF005",
    playerName: "Peter Mwanza",
    playerAge: 21,
    position: "Midfielder",
    fromAcademy: "Elite Football Academy",
    toClub: "Power Dynamos FC",
    transferFee: 60000,
    submissionDate: "2024-01-05",
    status: "pending",
    priority: "high",
    documents: ["Contract", "Medical Certificate", "FIFA Clearance", "International Clearance"],
    agent: "Michael Banda",
    playerImage: "/images/players/peter-mwanza.jpg"
  }
];

// FIFA Compliance Mock Data
const complianceStats = {
  totalCompliances: 89,
  pendingReviews: 15,
  approvedThisMonth: 34,
  flaggedIssues: 6,
  averageReviewTime: "2.1 days"
};

const complianceData = [
  {
    id: "CMP001",
    academyName: "Elite Football Academy",
    complianceType: "Player Registration",
    submissionDate: "2024-01-18",
    status: "pending",
    priority: "high",
    documents: ["Player Contract", "Medical Certificate", "Age Verification", "FIFA Clearance"],
    reviewer: "FIFA Compliance Officer",
    dueDate: "2024-01-25",
    description: "New player registration compliance check for James Sakala",
    academyId: "ACD001"
  },
  {
    id: "CMP002",
    academyName: "Champions Youth FC",
    complianceType: "Transfer Compliance",
    submissionDate: "2024-01-16",
    status: "approved",
    priority: "medium",
    documents: ["Transfer Agreement", "FIFA TMS Certificate", "International Clearance"],
    reviewer: "FIFA Compliance Officer",
    dueDate: "2024-01-23",
    description: "Transfer compliance verification for Mary Chanda",
    academyId: "ACD002"
  },
  {
    id: "CMP003",
    academyName: "Future Stars Academy",
    complianceType: "Academy Licensing",
    submissionDate: "2024-01-14",
    status: "under_review",
    priority: "high",
    documents: ["Academy License", "Facility Inspection Report", "Coach Certifications"],
    reviewer: "FIFA Licensing Officer",
    dueDate: "2024-01-28",
    description: "Annual academy licensing compliance review",
    academyId: "ACD003"
  },
  {
    id: "CMP004",
    academyName: "Rising Eagles FC",
    complianceType: "Financial Fair Play",
    submissionDate: "2024-01-12",
    status: "flagged",
    priority: "urgent",
    documents: ["Financial Statements", "Audit Report", "Transaction Records"],
    reviewer: "FIFA Financial Officer",
    dueDate: "2024-01-20",
    description: "Financial compliance review - irregularities detected",
    academyId: "ACD004"
  },
  {
    id: "CMP005",
    academyName: "Elite Football Academy",
    complianceType: "Youth Protection",
    submissionDate: "2024-01-10",
    status: "approved",
    priority: "medium",
    documents: ["Safeguarding Policy", "Background Checks", "Training Certificates"],
    reviewer: "FIFA Youth Protection Officer",
    dueDate: "2024-01-17",
    description: "Youth protection compliance verification",
    academyId: "ACD001"
  }
];

// Financial Overview Mock Data
const financialStats = {
  totalRevenue: 1250000,
  monthlyRevenue: 125000,
  totalTransactions: 2847,
  pendingPayments: 23,
  subscriptionRevenue: 980000,
  transferFees: 270000,
  averageTransactionValue: 439,
  revenueGrowth: 12.5
};

const revenueData = [
  { month: "Jan", revenue: 98000, subscriptions: 75000, transfers: 23000 },
  { month: "Feb", revenue: 105000, subscriptions: 78000, transfers: 27000 },
  { month: "Mar", revenue: 112000, subscriptions: 82000, transfers: 30000 },
  { month: "Apr", revenue: 118000, subscriptions: 85000, transfers: 33000 },
  { month: "May", revenue: 125000, subscriptions: 88000, transfers: 37000 },
  { month: "Jun", revenue: 132000, subscriptions: 92000, transfers: 40000 }
];

const transactionsData = [
  {
    id: "TXN001",
    type: "subscription",
    academy: "Elite Football Academy",
    amount: 2500,
    date: "2024-01-20",
    status: "completed",
    method: "Bank Transfer",
    reference: "SUB-EFA-2024-001",
    description: "Monthly Professional Subscription"
  },
  {
    id: "TXN002",
    type: "transfer_fee",
    academy: "Champions Youth FC",
    amount: 5000,
    date: "2024-01-19",
    status: "completed",
    method: "Credit Card",
    reference: "TRF-CYF-2024-002",
    description: "Transfer fee for Mary Chanda"
  },
  {
    id: "TXN003",
    type: "subscription",
    academy: "Future Stars Academy",
    amount: 1200,
    date: "2024-01-18",
    status: "pending",
    method: "Mobile Money",
    reference: "SUB-FSA-2024-003",
    description: "Monthly Basic Subscription"
  },
  {
    id: "TXN004",
    type: "registration_fee",
    academy: "Rising Eagles FC",
    amount: 800,
    date: "2024-01-17",
    status: "failed",
    method: "Bank Transfer",
    reference: "REG-REF-2024-004",
    description: "Academy registration fee"
  },
  {
    id: "TXN005",
    type: "transfer_fee",
    academy: "Elite Football Academy",
    amount: 7500,
    date: "2024-01-16",
    status: "completed",
    method: "Wire Transfer",
    reference: "TRF-EFA-2024-005",
    description: "Transfer fee for James Sakala"
  },
  {
    id: "TXN006",
    type: "subscription",
    academy: "Champions Youth FC",
    amount: 1800,
    date: "2024-01-15",
    status: "completed",
    method: "Credit Card",
    reference: "SUB-CYF-2024-006",
    description: "Monthly Standard Subscription"
  }
];

const paymentMethods = [
  { method: "Bank Transfer", count: 156, percentage: 45.2 },
  { method: "Credit Card", count: 98, percentage: 28.4 },
  { method: "Mobile Money", count: 67, percentage: 19.4 },
  { method: "Wire Transfer", count: 24, percentage: 7.0 }
];

// System Settings Mock Data
const systemSettings = {
  general: {
    siteName: "FIFA Platform Zambia",
    siteDescription: "Official FIFA Football Academy Management Platform",
    timezone: "Africa/Lusaka",
    language: "English",
    dateFormat: "DD/MM/YYYY",
    currency: "ZMW",
    maintenanceMode: false,
    registrationEnabled: true
  },
  security: {
    twoFactorAuth: true,
    passwordExpiry: 90,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    ipWhitelist: ["192.168.1.0/24", "10.0.0.0/8"],
    sslEnabled: true,
    encryptionLevel: "AES-256"
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    adminAlerts: true,
    systemAlerts: true,
    maintenanceAlerts: true,
    emailProvider: "SendGrid",
    smsProvider: "Twilio"
  },
  backup: {
    autoBackup: true,
    backupFrequency: "daily",
    backupRetention: 30,
    lastBackup: "2024-01-20 02:00:00",
    backupLocation: "AWS S3",
    backupSize: "2.4 GB"
  },
  performance: {
    cacheEnabled: true,
    compressionEnabled: true,
    cdnEnabled: true,
    maxFileSize: "10 MB",
    sessionStorage: "Redis",
    databaseOptimization: true
  },
  integrations: {
    fifaApi: true,
    paymentGateway: "Stripe",
    smsGateway: "Twilio",
    emailService: "SendGrid",
    cloudStorage: "AWS S3",
    analyticsService: "Google Analytics"
  }
};

const systemLogs = [
  {
    id: "LOG001",
    timestamp: "2024-01-20 14:30:25",
    level: "INFO",
    category: "Authentication",
    message: "User admin@fifaplatform.com logged in successfully",
    ip: "192.168.1.100"
  },
  {
    id: "LOG002",
    timestamp: "2024-01-20 14:25:12",
    level: "WARNING",
    category: "Security",
    message: "Failed login attempt for user test@example.com",
    ip: "203.45.67.89"
  },
  {
    id: "LOG003",
    timestamp: "2024-01-20 14:20:45",
    level: "ERROR",
    category: "Database",
    message: "Connection timeout to database server",
    ip: "localhost"
  },
  {
    id: "LOG004",
    timestamp: "2024-01-20 14:15:30",
    level: "INFO",
    category: "Backup",
    message: "Daily backup completed successfully",
    ip: "system"
  },
  {
    id: "LOG005",
    timestamp: "2024-01-20 14:10:18",
    level: "INFO",
    category: "System",
    message: "System health check completed - all services running",
    ip: "system"
  }
];

const systemHealth = {
  cpu: { usage: 45, status: "normal" },
  memory: { usage: 68, status: "normal" },
  disk: { usage: 32, status: "normal" },
  network: { status: "connected", latency: "12ms" },
  database: { status: "connected", connections: 45 },
  services: {
    webServer: "running",
    database: "running",
    cache: "running",
    backup: "running",
    monitoring: "running"
  }
};

// Analytics mock data
const analyticsData = {
  overview: {
    totalRevenue: 1250000,
    totalUsers: 2847,
    totalAcademies: 156,
    totalTransfers: 89,
    monthlyGrowth: 12.5,
    userGrowth: 8.3,
    revenueGrowth: 15.2,
    academyGrowth: 6.7
  },
  userRegistrations: [
    { month: "Jan", users: 245, academies: 12 },
    { month: "Feb", users: 289, academies: 15 },
    { month: "Mar", users: 324, academies: 18 },
    { month: "Apr", users: 378, academies: 22 },
    { month: "May", users: 445, academies: 28 },
    { month: "Jun", users: 512, academies: 31 },
    { month: "Jul", users: 589, academies: 35 },
    { month: "Aug", users: 634, academies: 38 },
    { month: "Sep", users: 698, academies: 42 },
    { month: "Oct", users: 756, academies: 45 },
    { month: "Nov", users: 823, academies: 48 },
    { month: "Dec", users: 891, academies: 52 }
  ],
  revenueData: [
    { month: "Jan", revenue: 85000, subscriptions: 45000, transfers: 40000 },
    { month: "Feb", revenue: 92000, subscriptions: 48000, transfers: 44000 },
    { month: "Mar", revenue: 98000, subscriptions: 52000, transfers: 46000 },
    { month: "Apr", revenue: 105000, subscriptions: 55000, transfers: 50000 },
    { month: "May", revenue: 112000, subscriptions: 58000, transfers: 54000 },
    { month: "Jun", revenue: 118000, subscriptions: 62000, transfers: 56000 },
    { month: "Jul", revenue: 125000, subscriptions: 65000, transfers: 60000 },
    { month: "Aug", revenue: 132000, subscriptions: 68000, transfers: 64000 },
    { month: "Sep", revenue: 138000, subscriptions: 72000, transfers: 66000 },
    { month: "Oct", revenue: 145000, subscriptions: 75000, transfers: 70000 },
    { month: "Nov", revenue: 152000, subscriptions: 78000, transfers: 74000 },
    { month: "Dec", revenue: 159000, subscriptions: 82000, transfers: 77000 }
  ],
  academyPerformance: [
    { name: "Elite Football Academy", players: 45, transfers: 8, revenue: 25000, rating: 4.8 },
    { name: "Champions Youth FC", players: 38, transfers: 6, revenue: 22000, rating: 4.6 },
    { name: "Future Stars Academy", players: 42, transfers: 7, revenue: 24000, rating: 4.7 },
    { name: "Rising Talents FC", players: 35, transfers: 5, revenue: 20000, rating: 4.5 },
    { name: "Dream Team Academy", players: 40, transfers: 6, revenue: 23000, rating: 4.6 }
  ],
  systemMetrics: [
    { time: "00:00", cpu: 25, memory: 45, requests: 120 },
    { time: "04:00", cpu: 20, memory: 42, requests: 85 },
    { time: "08:00", cpu: 35, memory: 55, requests: 280 },
    { time: "12:00", cpu: 45, memory: 68, requests: 450 },
    { time: "16:00", cpu: 52, memory: 72, requests: 520 },
    { time: "20:00", cpu: 38, memory: 58, requests: 380 }
  ],
  userActivity: [
    { activity: "Player Registrations", count: 1245, percentage: 35 },
    { activity: "Academy Signups", count: 156, percentage: 15 },
    { activity: "Transfer Requests", count: 89, percentage: 8 },
    { activity: "Document Uploads", count: 567, percentage: 25 },
    { activity: "Profile Updates", count: 234, percentage: 12 },
    { activity: "Support Tickets", count: 78, percentage: 5 }
  ],
  geographicData: [
    { country: "Zambia", users: 1245, academies: 89, color: "#0088FE" },
    { country: "South Africa", users: 567, academies: 34, color: "#00C49F" },
    { country: "Kenya", users: 423, academies: 21, color: "#FFBB28" },
    { country: "Nigeria", users: 389, academies: 18, color: "#FF8042" },
    { country: "Ghana", users: 223, academies: 12, color: "#8884D8" }
  ]
};

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
  transfers: {
    label: "Transfers",
    color: "#ea580c",
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedCompliance, setSelectedCompliance] = useState(null);
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!session || session.role !== "superadmin") {
      navigate("/admin/login");
    }
  }, [session, navigate]);

  // System settings handlers
  const handleSystemSettingsChange = (section, field, value) => {
    // Handle system settings changes
    console.log(`Updating ${section}.${field} to:`, value);
  };

  const handleLogout = () => {
    clearSession();
    navigate("/admin/login");
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleSuspendUser = (userId) => {
    // Handle user suspension logic
    console.log('Suspending user:', userId);
  };

  const handleDeleteUser = (userId) => {
    // Handle user deletion logic
    console.log('Deleting user:', userId);
  };

  const handleViewTransfer = (transfer) => {
    setSelectedTransfer(transfer);
    setIsTransferModalOpen(true);
  };

  const handleApproveTransfer = (transferId) => {
    // Handle transfer approval logic
    console.log('Approving transfer:', transferId);
  };

  const handleRejectTransfer = (transferId) => {
    // Handle transfer rejection logic
    console.log('Rejecting transfer:', transferId);
  };

  const handleRequestMoreInfo = (transferId) => {
    // Handle request for more information
    console.log('Requesting more info for transfer:', transferId);
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

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "academies", label: "Academy Management", icon: Building },
    { id: "users", label: "User Management", icon: Users },
    { id: "transfers", label: "Transfer Oversight", icon: TrendingUp },
    { id: "compliance", label: "FIFA Compliance", icon: Shield },
    { id: "finances", label: "Financial Overview", icon: DollarSign },
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
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
                    FIFA Platform Admin
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
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {systemStats.pendingApprovals}
                </span>
              </Button>
              <ThemeToggle />
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={adminData.avatar} />
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
                    className={`w-full justify-start text-white hover:bg-white/20 transition-all duration-300 ${
                      activeTab === item.id 
                        ? 'bg-white/20 border-l-4 border-yellow-400 shadow-lg' 
                        : 'border-l-4 border-transparent hover:border-yellow-400/50'
                    }`}
                    onClick={() => {
                      setActiveTab(item.id);
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
            
            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    System Overview
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    FIFA Platform administration dashboard
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm bg-red-100 text-red-800 border-red-200">
                  {adminData.id}
                </Badge>
              </div>

              {/* System Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Academies</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{systemStats.totalAcademies}</p>
                      </div>
                      <Building className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Users</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{systemStats.totalUsers.toLocaleString()}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Active Transfers</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{systemStats.activeTransfers}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">System Uptime</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{systemStats.systemUptime}%</p>
                      </div>
                      <Activity className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Monthly Revenue</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">${systemStats.monthlyRevenue.toLocaleString()}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Pending Approvals</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{systemStats.pendingApprovals}</p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity and Pending Approvals */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent System Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white">{activity.description}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{activity.timestamp}</p>
                        </div>
                        <Badge variant={activity.status === 'urgent' ? 'destructive' : activity.status === 'completed' ? 'default' : 'secondary'}>
                          {activity.status}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" />
                      Pending Approvals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pendingApprovals.map((approval) => (
                      <div key={approval.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white">{approval.item}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{approval.type} • {approval.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPriorityBadge(approval.priority)}
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Academy Management Tab */}
            <TabsContent value="academies" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Academy Management
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Manage and oversee all registered academies
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Academy
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Academy</TableHead>
                        <TableHead>Director</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Players</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {academiesData.map((academy) => (
                        <TableRow key={academy.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{academy.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{academy.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>{academy.director}</TableCell>
                          <TableCell>{academy.location}</TableCell>
                          <TableCell>{academy.players}</TableCell>
                          <TableCell>{getStatusBadge(academy.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{academy.subscription}</Badge>
                          </TableCell>
                          <TableCell>${academy.revenue.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    User Management
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Manage all platform users including players, coaches, and academy staff
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </div>

              {/* User Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Users</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">2,847</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Active Players</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">1,923</p>
                      </div>
                      <User className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Coaches</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">324</p>
                      </div>
                      <UserCheck className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">New This Month</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">156</p>
                      </div>
                      <UserPlus className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Search and Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input
                          type="text"
                          placeholder="Search users by name, email, or ID..."
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Roles</option>
                        <option value="player">Player</option>
                        <option value="coach">Coach</option>
                        <option value="academy_admin">Academy Admin</option>
                        <option value="parent">Parent</option>
                      </select>
                      <select className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Users Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Academy</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        {
                          id: 'USR001',
                          name: 'Marcus Johnson',
                          email: 'marcus.johnson@email.com',
                          avatar: '/placeholder.svg',
                          role: 'Player',
                          academy: 'Elite Football Academy',
                          registrationDate: '2024-01-15',
                          lastLogin: '2024-01-20 14:30',
                          status: 'active'
                        },
                        {
                          id: 'USR002',
                          name: 'Sarah Williams',
                          email: 'sarah.williams@email.com',
                          avatar: '/placeholder.svg',
                          role: 'Coach',
                          academy: 'Champions Academy',
                          registrationDate: '2023-11-08',
                          lastLogin: '2024-01-20 09:15',
                          status: 'active'
                        },
                        {
                          id: 'USR003',
                          name: 'David Rodriguez',
                          email: 'david.rodriguez@email.com',
                          avatar: '/placeholder.svg',
                          role: 'Academy Admin',
                          academy: 'Future Stars FC',
                          registrationDate: '2023-09-22',
                          lastLogin: '2024-01-19 16:45',
                          status: 'active'
                        },
                        {
                          id: 'USR004',
                          name: 'Emma Thompson',
                          email: 'emma.thompson@email.com',
                          avatar: '/placeholder.svg',
                          role: 'Player',
                          academy: 'Elite Football Academy',
                          registrationDate: '2024-01-10',
                          lastLogin: '2024-01-18 11:20',
                          status: 'inactive'
                        },
                        {
                          id: 'USR005',
                          name: 'Michael Chen',
                          email: 'michael.chen@email.com',
                          avatar: '/placeholder.svg',
                          role: 'Parent',
                          academy: 'Youth Development Center',
                          registrationDate: '2023-12-05',
                          lastLogin: '2024-01-20 08:30',
                          status: 'active'
                        },
                        {
                          id: 'USR006',
                          name: 'Lisa Anderson',
                          email: 'lisa.anderson@email.com',
                          avatar: '/placeholder.svg',
                          role: 'Coach',
                          academy: 'Premier Training Hub',
                          registrationDate: '2023-10-14',
                          lastLogin: 'Never',
                          status: 'suspended'
                        }
                      ].map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="bg-blue-100 text-blue-600 font-bold">
                                  {user.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-500">{user.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {user.role.toLowerCase().replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.academy}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{user.registrationDate}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{user.lastLogin}</p>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                user.status === 'active' ? 'default' : 
                                user.status === 'inactive' ? 'secondary' : 
                                user.status === 'suspended' ? 'destructive' : 'outline'
                              }
                              className="capitalize"
                            >
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleViewUser(user)}
                                title="View User Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditUser(user)}
                                title="Edit User"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleSuspendUser(user.id)}
                                title={user.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleDeleteUser(user.id)}
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Showing 1 to 6 of 2,847 users
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    <Button variant="default" size="sm" className="w-8 h-8 p-0">1</Button>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">2</Button>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">3</Button>
                    <span className="px-2 text-slate-600">...</span>
                    <Button variant="outline" size="sm" className="w-8 h-8 p-0">475</Button>
                  </div>
                  <Button variant="outline" size="sm">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transfers" className="space-y-6">
              {/* Transfer Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Transfers</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{transferStats.totalTransfers}</p>
                      </div>
                      <ArrowRightLeft className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Approvals</p>
                        <p className="text-2xl font-bold text-orange-600">{transferStats.pendingApprovals}</p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Approved This Month</p>
                        <p className="text-2xl font-bold text-green-600">{transferStats.approvedThisMonth}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Rejected This Month</p>
                        <p className="text-2xl font-bold text-red-600">{transferStats.rejectedThisMonth}</p>
                      </div>
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg. Processing</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{transferStats.averageProcessingTime}</p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transfer Management */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                        Transfer Management
                      </CardTitle>
                      <CardDescription>Review and manage player transfer requests</CardDescription>
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
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filter Bar */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search transfers by player name, academy, or club..."
                        className="pl-10"
                      />
                    </div>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Transfer Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Player</TableHead>
                          <TableHead>Transfer Details</TableHead>
                          <TableHead>Financial</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transfersData.map((transfer) => (
                          <TableRow key={transfer.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={transfer.playerImage} alt={transfer.playerName} />
                                  <AvatarFallback className="bg-blue-600 text-white">
                                    {transfer.playerName.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{transfer.playerName}</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {transfer.position} • Age {transfer.playerAge}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <Building className="h-4 w-4 text-slate-400" />
                                  <span className="text-slate-600 dark:text-slate-400">From:</span>
                                  <span className="font-medium">{transfer.fromAcademy}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                                  <span className="text-slate-600 dark:text-slate-400">To:</span>
                                  <span className="font-medium">{transfer.toClub}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium text-green-600">
                                  ${transfer.transferFee.toLocaleString()}
                                </p>
                                <p className="text-slate-600 dark:text-slate-400">Transfer Fee</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                transfer.status === 'approved' ? 'default' :
                                transfer.status === 'pending' ? 'secondary' :
                                transfer.status === 'rejected' ? 'destructive' :
                                'outline'
                              }>
                                {transfer.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                transfer.priority === 'high' ? 'destructive' :
                                transfer.priority === 'medium' ? 'secondary' :
                                'outline'
                              }>
                                {transfer.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p className="font-medium">{transfer.submissionDate}</p>
                                <p className="text-slate-600 dark:text-slate-400">by {transfer.agent}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewTransfer(transfer)}
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {transfer.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApproveTransfer(transfer.id)}
                                      title="Approve Transfer"
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRejectTransfer(transfer.id)}
                                      title="Reject Transfer"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                {transfer.status === 'under_review' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRequestMoreInfo(transfer.id)}
                                    title="Request More Information"
                                    className="text-orange-600 hover:text-orange-700"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Showing 1-5 of {transfersData.length} transfers
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
                        {complianceData.map((compliance) => (
                          <TableRow key={compliance.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{compliance.academyName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{compliance.id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{compliance.complianceType}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{compliance.description}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {compliance.status === 'pending' && (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                  <Clock3 className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                              {compliance.status === 'approved' && (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approved
                                </Badge>
                              )}
                              {compliance.status === 'under_review' && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Under Review
                                </Badge>
                              )}
                              {compliance.status === 'flagged' && (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  <Flag className="h-3 w-3 mr-1" />
                                  Flagged
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {compliance.priority === 'urgent' && (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Urgent
                                </Badge>
                              )}
                              {compliance.priority === 'high' && (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200">High</Badge>
                              )}
                              {compliance.priority === 'medium' && (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>
                              )}
                              {compliance.priority === 'low' && (
                                <Badge className="bg-gray-100 text-gray-800 border-gray-200">Low</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">{compliance.submissionDate}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-400">{compliance.dueDate}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{compliance.reviewer}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewCompliance(compliance)}
                                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                                  title="View Details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {compliance.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApproveCompliance(compliance.id)}
                                      className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                                      title="Approve"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRejectCompliance(compliance.id)}
                                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                      title="Reject"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleFlagCompliance(compliance.id)}
                                      className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                                      title="Flag Issue"
                                    >
                                      <Flag className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Showing 1-5 of {complianceData.length} compliance records
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
                      {revenueData.slice(-6).map((data, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium">{data.month}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-green-600">${data.subscriptions.toLocaleString()}</span>
                            <span className="text-blue-600">${data.transfers.toLocaleString()}</span>
                            <span className="font-semibold">${data.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          Subscriptions
                        </span>
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          Transfer Fees
                        </span>
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
                      {paymentMethods.map((method, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{method.method}</span>
                            <span className="font-medium">{method.percentage}%</span>
                          </div>
                          <Progress value={method.percentage} className="h-2" />
                        </div>
                      ))}
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
                        {transactionsData.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">{transaction.id}</TableCell>
                            <TableCell>{transaction.academy}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {transaction.type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              ${transaction.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {transaction.method === 'Credit Card' && <CreditCardIcon className="h-4 w-4" />}
                                {transaction.method === 'Bank Transfer' && <Banknote className="h-4 w-4" />}
                                {transaction.method === 'Mobile Money' && <HandCoins className="h-4 w-4" />}
                                {transaction.method === 'Wire Transfer' && <ArrowRightLeft className="h-4 w-4" />}
                                <span className="text-sm">{transaction.method}</span>
                              </div>
                            </TableCell>
                            <TableCell>{transaction.date}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  transaction.status === 'completed' ? 'default' :
                                  transaction.status === 'pending' ? 'secondary' :
                                  'destructive'
                                }
                              >
                                {transaction.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewTransaction(transaction)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {transaction.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleProcessPayment(transaction.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {transaction.status === 'completed' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRefundTransaction(transaction.id)}
                                  >
                                    <ArrowDownRight className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing 1-6 of {transactionsData.length} transactions
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
              {/* System Health Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
                        <p className="text-2xl font-bold">{systemHealth.cpu.usage}%</p>
                      </div>
                      <Cpu className="h-8 w-8 text-blue-600" />
                    </div>
                    <Progress value={systemHealth.cpu.usage} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Memory Usage</p>
                        <p className="text-2xl font-bold">{systemHealth.memory.usage}%</p>
                      </div>
                      <MemoryStick className="h-8 w-8 text-green-600" />
                    </div>
                    <Progress value={systemHealth.memory.usage} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Disk Usage</p>
                        <p className="text-2xl font-bold">{systemHealth.disk.usage}%</p>
                      </div>
                      <HardDrive className="h-8 w-8 text-orange-600" />
                    </div>
                    <Progress value={systemHealth.disk.usage} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Network</p>
                        <p className="text-2xl font-bold">{systemHealth.network.latency}</p>
                      </div>
                      <Network className="h-8 w-8 text-purple-600" />
                    </div>
                    <Badge variant="outline" className="mt-2">
                      {systemHealth.network.status}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Settings Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cog className="h-5 w-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription>
                      Basic system configuration and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="siteName">Site Name</Label>
                        <Input 
                          id="siteName" 
                          value={systemSettings.general.siteName} 
                          onChange={(e) => handleSystemSettingsChange('general', 'siteName', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={systemSettings.general.timezone}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Africa/Lusaka">Africa/Lusaka</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="Africa/Cairo">Africa/Cairo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select value={systemSettings.general.language}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                            <SelectItem value="Portuguese">Portuguese</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={systemSettings.general.currency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ZMW">ZMW - Zambian Kwacha</SelectItem>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Maintenance Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable to restrict access during maintenance
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        {systemSettings.general.maintenanceMode ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>
                      Authentication and security configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">
                          Require 2FA for admin accounts
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        {systemSettings.security.twoFactorAuth ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                        <Input 
                          id="passwordExpiry" 
                          type="number" 
                          value={systemSettings.security.passwordExpiry} 
                          onChange={(e) => handleSystemSettingsChange('security', 'passwordExpiry', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sessionTimeout">Session Timeout (min)</Label>
                        <Input 
                          id="sessionTimeout" 
                          type="number" 
                          value={systemSettings.security.sessionTimeout} 
                          onChange={(e) => handleSystemSettingsChange('security', 'sessionTimeout', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                      <Input 
                        id="maxLoginAttempts" 
                        type="number" 
                        value={systemSettings.security.maxLoginAttempts} 
                        onChange={(e) => handleSystemSettingsChange('security', 'maxLoginAttempts', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SSL Encryption</Label>
                        <p className="text-sm text-muted-foreground">
                          Force HTTPS connections
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        {systemSettings.security.encryptionLevel}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Settings
                    </CardTitle>
                    <CardDescription>
                      Configure system notifications and alerts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send notifications via email
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        {systemSettings.notifications.emailNotifications ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Send notifications via SMS
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        {systemSettings.notifications.smsNotifications ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="emailProvider">Email Provider</Label>
                        <Select value={systemSettings.notifications.emailProvider}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SendGrid">SendGrid</SelectItem>
                            <SelectItem value="Mailgun">Mailgun</SelectItem>
                            <SelectItem value="AWS SES">AWS SES</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="smsProvider">SMS Provider</Label>
                        <Select value={systemSettings.notifications.smsProvider}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Twilio">Twilio</SelectItem>
                            <SelectItem value="AWS SNS">AWS SNS</SelectItem>
                            <SelectItem value="Nexmo">Nexmo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Backup & Restore */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      Backup & Restore
                    </CardTitle>
                    <CardDescription>
                      Data backup and recovery settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto Backup</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically backup system data
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        {systemSettings.backup.autoBackup ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="backupFrequency">Backup Frequency</Label>
                        <Select value={systemSettings.backup.backupFrequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="backupRetention">Retention (days)</Label>
                        <Input 
                          id="backupRetention" 
                          type="number" 
                          value={systemSettings.backup.backupRetention} 
                          onChange={(e) => handleSystemSettingsChange('backup', 'backupRetention', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Last Backup:</span>
                        <span className="text-muted-foreground">{systemSettings.backup.lastBackup}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Backup Size:</span>
                        <span className="text-muted-foreground">{systemSettings.backup.backupSize}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <BackupIcon className="h-4 w-4 mr-2" />
                  Create Backup
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                          <RestoreIcon className="h-4 w-4 mr-2" />
                          Restore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* System Logs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    System Logs
                  </CardTitle>
                  <CardDescription>
                    Recent system activity and events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Input placeholder="Search logs..." />
                      </div>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>IP Address</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {systemLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-mono text-sm">
                                {log.timestamp}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    log.level === 'ERROR' ? 'destructive' : 
                                    log.level === 'WARNING' ? 'secondary' : 
                                    'outline'
                                  }
                                >
                                  {log.level}
                                </Badge>
                              </TableCell>
                              <TableCell>{log.category}</TableCell>
                              <TableCell className="max-w-md truncate">
                                {log.message}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {log.ip}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Services Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    System Services
                  </CardTitle>
                  <CardDescription>
                    Status of critical system services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Object.entries(systemHealth.services).map(([service, status]) => (
                      <div key={service} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium capitalize">{service.replace(/([A-Z])/g, ' $1')}</p>
                          <Badge 
                            variant={status === 'running' ? 'default' : 'destructive'}
                            className="mt-1"
                          >
                            {status}
                          </Badge>
                        </div>
                        <div className={`h-3 w-3 rounded-full ${status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
                          ${analyticsData.overview.totalRevenue.toLocaleString()}
                        </p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm text-green-600">+{analyticsData.overview.revenueGrowth}%</span>
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
                          {analyticsData.overview.totalUsers.toLocaleString()}
                        </p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
                          <span className="text-sm text-blue-600">+{analyticsData.overview.userGrowth}%</span>
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
                          {analyticsData.overview.totalAcademies}
                        </p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-sm text-red-600">+{analyticsData.overview.academyGrowth}%</span>
                        </div>
                      </div>
                      <Building className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Transfers</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {analyticsData.overview.totalTransfers}
                        </p>
                        <div className="flex items-center mt-1">
                          <TrendingUp className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm text-orange-600">+{analyticsData.overview.monthlyGrowth}%</span>
                        </div>
                      </div>
                      <ArrowRightLeft className="h-8 w-8 text-orange-600" />
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
                        <AreaChart data={analyticsData.userRegistrations}>
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
                        <BarChart data={analyticsData.revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="subscriptions" fill={chartConfig.subscriptions.color} />
                          <Bar dataKey="transfers" fill={chartConfig.transfers.color} />
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
                            data={analyticsData.userActivity}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            label={({ activity, percentage }) => `${activity}: ${percentage}%`}
                          >
                            {analyticsData.userActivity.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                            ))}
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
                        <LineChart data={analyticsData.systemMetrics}>
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
                        <TableHead>Transfers</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsData.academyPerformance.map((academy, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{academy.name}</TableCell>
                          <TableCell>{academy.players}</TableCell>
                          <TableCell>{academy.transfers}</TableCell>
                          <TableCell>${academy.revenue.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span>{academy.rating}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
                              data={analyticsData.geographicData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="users"
                              label={({ country, users }) => `${country}: ${users}`}
                            >
                              {analyticsData.geographicData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                    <div>
                      <h4 className="font-medium mb-4">Country Statistics</h4>
                      <div className="space-y-4">
                        {analyticsData.geographicData.map((country, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: country.color }}
                              />
                              <span className="font-medium">{country.country}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{country.users} users</div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">{country.academies} academies</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </main>
      </div>

      {/* User Details Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              User Details
            </DialogTitle>
            <DialogDescription>
              View and edit user information
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              {/* User Avatar and Basic Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                  <AvatarFallback className="bg-blue-600 text-white text-lg">
                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{selectedUser.email}</p>
                  <Badge variant={selectedUser.status === 'active' ? 'default' : 
                                selectedUser.status === 'suspended' ? 'destructive' : 'secondary'}>
                    {selectedUser.status}
                  </Badge>
                </div>
              </div>

              {/* User Details Form */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={selectedUser.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={selectedUser.email} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" defaultValue={selectedUser.phone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select defaultValue={selectedUser.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="player">Player</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="director">Academy Director</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academy">Academy</Label>
                  <Input id="academy" defaultValue={selectedUser.academy} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select defaultValue={selectedUser.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h4 className="font-medium">Additional Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">User ID:</span>
                    <p className="font-mono">{selectedUser.id}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Join Date:</span>
                    <p>{selectedUser.joinDate}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Last Login:</span>
                    <p>{selectedUser.lastLogin}</p>
                  </div>
                  <div>
                    <span className="text-slate-600 dark:text-slate-400">Location:</span>
                    <p>{selectedUser.location}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle save logic here
              setIsUserModalOpen(false);
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Details Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Transfer Details - {selectedTransfer?.id}
            </DialogTitle>
            <DialogDescription>
              Review and manage player transfer request
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransfer && (
            <div className="space-y-6">
              {/* Player Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Player Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={selectedTransfer.playerImage} alt={selectedTransfer.playerName} />
                        <AvatarFallback className="bg-blue-600 text-white text-lg">
                          {selectedTransfer.playerName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-semibold">{selectedTransfer.playerName}</h3>
                        <p className="text-slate-600 dark:text-slate-400">{selectedTransfer.position} • Age {selectedTransfer.playerAge}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Transfer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">From:</span>
                        <span className="font-medium">{selectedTransfer.fromAcademy}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">To:</span>
                        <span className="font-medium">{selectedTransfer.toClub}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Transfer Fee:</span>
                        <span className="font-medium text-green-600">${selectedTransfer.transferFee.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Submitted:</span>
                        <span className="font-medium">{selectedTransfer.submissionDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">Agent:</span>
                        <span className="font-medium">{selectedTransfer.agent}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Badge variant={
                        selectedTransfer.status === 'approved' ? 'default' :
                        selectedTransfer.status === 'pending' ? 'secondary' :
                        selectedTransfer.status === 'rejected' ? 'destructive' :
                        'outline'
                      } className="text-sm px-3 py-1">
                        {selectedTransfer.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={
                        selectedTransfer.priority === 'high' ? 'destructive' :
                        selectedTransfer.priority === 'medium' ? 'secondary' :
                        'outline'
                      } className="text-sm px-3 py-1">
                        {selectedTransfer.priority} priority
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedTransfer.documents.map((doc, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-sm">{doc}</span>
                          <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              {selectedTransfer.status === 'pending' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Button 
                        onClick={() => handleApproveTransfer(selectedTransfer.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve Transfer
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleRejectTransfer(selectedTransfer.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Transfer
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleRequestMoreInfo(selectedTransfer.id)}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Request More Info
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comments & Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-blue-600 text-white text-xs">MB</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">Michael Banda</span>
                        <span className="text-xs text-slate-500">2024-01-15 10:30</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Player has excellent performance record and meets all FIFA requirements for international transfer.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comment">Add Comment</Label>
                      <Input
                        id="comment"
                        placeholder="Add your comment or notes..."
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}