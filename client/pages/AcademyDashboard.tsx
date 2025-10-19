import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Minus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ThemeToggle from '@/components/navigation/ThemeToggle';
import ComplianceDocuments from './ComplianceDocuments';

// Mock data for academy dashboard
const academyData = {
  id: "ACD001",
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

const playersData = [
  { id: 1, name: "John Mwanza", age: 16, position: "Forward", status: "active", rating: 85 },
  { id: 2, name: "Sarah Phiri", age: 15, position: "Midfielder", status: "active", rating: 82 },
  { id: 3, name: "David Tembo", age: 17, position: "Defender", status: "active", rating: 78 },
  { id: 4, name: "Grace Lungu", age: 16, position: "Goalkeeper", status: "injured", rating: 88 },
  { id: 5, name: "Peter Zulu", age: 15, position: "Winger", status: "active", rating: 80 }
];

const recentTransfers = [
  { 
    id: 1, 
    player: "James Sakala", 
    from: "Elite Football Academy", 
    to: "Nkana FC", 
    amount: "$15,000", 
    date: "2024-01-15",
    status: "completed"
  },
  { 
    id: 2, 
    player: "Mary Chanda", 
    from: "Elite Football Academy", 
    to: "Green Buffaloes", 
    amount: "$12,000", 
    date: "2024-01-10",
    status: "pending"
  }
];

const upcomingEvents = [
  { date: "2024-01-25", title: "Youth League Match", type: "match" },
  { date: "2024-01-28", title: "Training Camp", type: "training" },
  { date: "2024-02-01", title: "FIFA Inspection", type: "inspection" },
  { date: "2024-02-05", title: "Parent Meeting", type: "meeting" }
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

  const handleLogout = () => {
    console.log("Logout clicked - auth disabled for UI development");
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "players", label: "Players", icon: Users },
    { id: "transfers", label: "Transfers", icon: TrendingUp },
    { id: "compliance", label: "FIFA Compliance", icon: Shield },
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
                    {academyData.name}
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
                  <AvatarImage src={academyData.logo} />
                  <AvatarFallback className="bg-blue-600 text-white font-bold">{academyData.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {academyData.director.name}
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
                    className={`w-full justify-start text-white hover:bg-white/20 transition-all duration-300 ${
                      activeTab === item.id 
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
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
                <TabsTrigger value="finances">Finances</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Welcome to {academyData.name}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Academy management dashboard overview
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {academyData.id}
                </Badge>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Total Players</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{statsData.totalPlayers}</p>
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
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{statsData.activeTransfers}</p>
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
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">${statsData.monthlyRevenue.toLocaleString()}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">FIFA Compliance</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{statsData.complianceScore}%</p>
                      </div>
                      <Shield className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Subscription</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">Professional</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <Star className="h-6 w-6 text-yellow-500 mb-1" />
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity and Upcoming Events */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {upcomingEvents.map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{event.title}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{event.date}</p>
                        </div>
                        <Badge variant={event.type === 'inspection' ? 'destructive' : 'secondary'}>
                          {event.type}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Recent Transfers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentTransfers.map((transfer) => (
                      <div key={transfer.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{transfer.player}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{transfer.to} - {transfer.amount}</p>
                        </div>
                        <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                          {transfer.status}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Players Tab */}
            <TabsContent value="players" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Player Management</h2>
                <Button>
                  <Users className="h-4 w-4 mr-2" />
                  Add Player
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Registered Players</CardTitle>
                  <CardDescription>Manage your academy players and their information</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {playersData.map((player) => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">{player.name}</TableCell>
                          <TableCell>{player.age}</TableCell>
                          <TableCell>{player.position}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={player.rating} className="w-16 h-2" />
                              <span className="text-sm">{player.rating}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={player.status === 'active' ? 'default' : 'destructive'}>
                              {player.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <FileText className="h-4 w-4" />
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

            {/* Other tabs would be implemented similarly */}
            <TabsContent value="transfers" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Transfer Management</h2>
                <Button>
                  <TrendingUp className="h-4 w-4 mr-2" />
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
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentTransfers.map((transfer) => (
                      <div key={transfer.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{transfer.player}</h3>
                            <p className="text-sm text-slate-600">From: {transfer.from}</p>
                            <p className="text-sm text-slate-600">To: {transfer.to}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{transfer.amount}</p>
                            <p className="text-sm text-slate-600">{transfer.date}</p>
                            <Badge variant={transfer.status === 'completed' ? 'default' : 'secondary'}>
                              {transfer.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
                      {complianceData.areas.map((area) => (
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
                      ))}
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
                      {complianceData.actionItems.map((item) => (
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
                      ))}
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
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Management</h2>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </Button>
                </div>
              </div>

              {/* Financial Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">${financialData.overview.totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          +{financialData.overview.monthlyGrowth}% from last month
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
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600">${financialData.overview.totalExpenses.toLocaleString()}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Monthly operational costs</p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Net Profit</p>
                        <p className="text-2xl font-bold text-[#005391]">${financialData.overview.netProfit.toLocaleString()}</p>
                        <p className="text-xs text-[#005391] flex items-center mt-1">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          {financialData.overview.profitMargin}% margin
                        </p>
                      </div>
                      <Calculator className="h-8 w-8 text-[#005391]" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Transfer Revenue</p>
                        <p className="text-2xl font-bold text-purple-600">${financialData.revenue.playerTransfers.toLocaleString()}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Player sales income</p>
                      </div>
                      <Users className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Academy Fees</p>
                        <p className="text-2xl font-bold text-orange-600">${financialData.revenue.academyFees.toLocaleString()}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Monthly tuition fees</p>
                      </div>
                      <GraduationCap className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue & Expense Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChart className="h-5 w-5 mr-2" />
                      Revenue Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <span className="text-sm">Player Transfers</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.revenue.playerTransfers.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">52%</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                          <span className="text-sm">Academy Fees</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.revenue.academyFees.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">28%</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                          <span className="text-sm">Sponsorships</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.revenue.sponsorships.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">12%</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                          <span className="text-sm">Merchandise</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.revenue.merchandise.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">6%</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                          <span className="text-sm">Other</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.revenue.other.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">2%</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Expense Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                          <span className="text-sm">Staff Salaries</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.expenses.salaries.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">51%</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                          <span className="text-sm">Facilities</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.expenses.facilities.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">20%</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
                          <span className="text-sm">Equipment</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.expenses.equipment.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">13%</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-pink-500 rounded-full mr-3"></div>
                          <span className="text-sm">Travel</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.expenses.travel.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">9%</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-teal-500 rounded-full mr-3"></div>
                          <span className="text-sm">Marketing</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${financialData.expenses.marketing.toLocaleString()}</span>
                          <div className="text-xs text-slate-600">4%</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Transactions & Budget Tracking */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Receipt className="h-5 w-5 mr-2" />
                        Recent Transactions
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View All
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {financialData.recentTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                              transaction.type === 'income' ? 'bg-blue-100 text-[#005391]' : 'bg-red-100 text-red-600'
                            }`}>
                              {transaction.type === 'income' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{transaction.description}</p>
                              <p className="text-xs text-slate-600">{transaction.date} • {transaction.category}</p>
                            </div>
                          </div>
                          <div className={`font-semibold ${
                            transaction.type === 'income' ? 'text-[#005391]' : 'text-red-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Wallet className="h-5 w-5 mr-2" />
                      Budget Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {financialData.budgetCategories.map((category) => (
                        <div key={category.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{category.name}</span>
                            <span className="text-sm text-slate-600">
                              ${category.spent.toLocaleString()} / ${category.budgeted.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                category.percentage >= 90 ? 'bg-red-500' : 
                                category.percentage >= 75 ? 'bg-yellow-500' : 'bg-[#005391]'
                              }`}
                              style={{ width: `${category.percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className={`${
                              category.percentage >= 90 ? 'text-red-600' : 
                              category.percentage >= 75 ? 'text-yellow-600' : 'text-[#005391]'
                            }`}>
                              {category.percentage}% used
                            </span>
                            <span className="text-slate-600">
                              ${category.remaining.toLocaleString()} remaining
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Monthly Financial Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-6 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span>Revenue</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span>Expenses</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                        <span>Profit</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-4 h-64">
                      {financialData.monthlyData.map((month, index) => (
                        <div key={index} className="flex flex-col items-center justify-end space-y-1">
                          <div className="flex flex-col items-center justify-end h-48 space-y-1">
                            <div 
                              className="w-6 bg-green-500 rounded-t"
                              style={{ height: `${(month.revenue / 25000) * 100}%` }}
                              title={`Revenue: $${month.revenue.toLocaleString()}`}
                            ></div>
                            <div 
                              className="w-6 bg-red-500"
                              style={{ height: `${(month.expenses / 25000) * 100}%` }}
                              title={`Expenses: $${month.expenses.toLocaleString()}`}
                            ></div>
                            <div 
                              className={`w-6 rounded-b ${month.profit >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`}
                              style={{ height: `${Math.abs(month.profit / 25000) * 100}%` }}
                              title={`Profit: $${month.profit.toLocaleString()}`}
                            ></div>
                          </div>
                          <span className="text-xs font-medium">{month.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Alerts */}
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  <strong>Budget Alert:</strong> Staff Salaries category is at 90% of budget. Consider reviewing expenses or adjusting budget allocation for next month.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Subscription Tab */}
            <TabsContent value="subscription" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Management</h2>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Active Plan
                </Badge>
              </div>
              
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
                      <span className="text-lg font-semibold">Professional Plan</span>
                      <Badge className="bg-blue-600 text-white">$99/month</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Next billing date:</span>
                        <span className="font-medium">March 15, 2024</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Plan started:</span>
                        <span className="font-medium">January 15, 2024</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Status:</span>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Plan Features:</h4>
                      <ul className="text-sm space-y-1 text-slate-600">
                        <li>• Up to 500 players</li>
                        <li>• Advanced analytics</li>
                        <li>• Priority support</li>
                        <li>• Custom reports</li>
                        <li>• API access</li>
                      </ul>
                    </div>
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
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Players</span>
                          <span>287 / 500</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: '57%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Storage</span>
                          <span>12.4 GB / 50 GB</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{width: '25%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>API Calls</span>
                          <span>8,432 / 50,000</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{width: '17%'}}></div>
                        </div>
                      </div>
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
                      {[
                        { date: "Feb 15, 2024", amount: "$99.00", status: "Paid", invoice: "INV-2024-002" },
                        { date: "Jan 15, 2024", amount: "$99.00", status: "Paid", invoice: "INV-2024-001" },
                        { date: "Dec 15, 2023", amount: "$99.00", status: "Paid", invoice: "INV-2023-012" }
                      ].map((bill, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div>
                            <div className="font-medium">{bill.date}</div>
                            <div className="text-sm text-slate-600">{bill.invoice}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{bill.amount}</div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                              {bill.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Plan Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-slate-600" />
                      Plan Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Button className="w-full bg-gradient-to-r from-[#005391] to-[#0066b3] hover:from-[#004080] hover:to-[#0052a3] text-white">
                        Upgrade Plan
                      </Button>
                      <Button variant="outline" className="w-full">
                        Change Payment Method
                      </Button>
                      <Button variant="outline" className="w-full">
                        Download Invoice
                      </Button>
                      <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                        Cancel Subscription
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Academy Settings</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Academy Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Academy Name</label>
                      <input 
                        type="text" 
                        value={academyData.name}
                        className="w-full mt-1 p-2 border rounded-lg"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Location</label>
                      <input 
                        type="text" 
                        value={academyData.location}
                        className="w-full mt-1 p-2 border rounded-lg"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Established</label>
                      <input 
                        type="text" 
                        value={academyData.established}
                        className="w-full mt-1 p-2 border rounded-lg"
                        readOnly
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input 
                        type="email" 
                        value={academyData.email}
                        className="w-full mt-1 p-2 border rounded-lg"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <input 
                        type="tel" 
                        value={academyData.phone}
                        className="w-full mt-1 p-2 border rounded-lg"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Director</label>
                      <input 
                        type="text" 
                        value={academyData.director.name}
                        className="w-full mt-1 p-2 border rounded-lg"
                        readOnly
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
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