import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Download, 
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  X,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import InvoiceGenerator from './InvoiceGenerator';
import { 
  FinancialTransaction,
  BudgetCategory,
  getFinancialTransactions,
  createFinancialTransaction,
  updateFinancialTransaction,
  deleteFinancialTransaction,
  getFinancialSummary,
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory
} from '../lib/api';

interface FinancialTransactionsManagerProps {
  academyId: string;
  academyDetails?: any;
}

const FinancialTransactionsManager: React.FC<FinancialTransactionsManagerProps> = ({ academyId, academyDetails }) => {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Modal states
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetCategory | null>(null);
  
  // Invoice state
  const [activeTab, setActiveTab] = useState<'transactions' | 'budgets' | 'invoices'>('transactions');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  // Form states
  const [transactionForm, setTransactionForm] = useState<Partial<FinancialTransaction>>({
    transaction_type: 'income',
    status: 'completed',
    transaction_date: new Date().toISOString().split('T')[0]
  });
  
  const [budgetForm, setBudgetForm] = useState<Partial<BudgetCategory>>({
    category_type: 'expense',
    period_type: 'monthly',
    fiscal_year: new Date().getFullYear(),
    is_active: true
  });

  // Summary data
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: '0',
    totalTransactions: 0
  });

  // Predefined categories
  const incomeCategories = [
    { value: 'Transfer Fees', label: t('dash.finance.cat.transferFees') },
    { value: 'Academy Fees', label: t('dash.finance.cat.academyFees') },
    { value: 'Training Programs', label: t('dash.finance.cat.trainingPrograms') },
    { value: 'Merchandise Sales', label: t('dash.finance.cat.merchandise') },
    { value: 'Sponsorship', label: t('dash.finance.cat.sponsorship') },
    { value: 'Grants', label: t('dash.finance.cat.grants') },
    { value: 'Tournament Prizes', label: t('dash.finance.cat.tournamentPrizes') },
    { value: 'Other Income', label: t('dash.finance.cat.otherIncome') }
  ];
  
  const expenseCategories = [
    { value: 'Staff Salaries', label: t('dash.finance.cat.staffSalaries') },
    { value: 'Facility Maintenance', label: t('dash.finance.cat.facilityMaintenance') },
    { value: 'Equipment', label: t('dash.finance.cat.equipment') },
    { value: 'Utilities', label: t('dash.finance.cat.utilities') },
    { value: 'Marketing', label: t('dash.finance.cat.marketing') },
    { value: 'Travel', label: t('dash.finance.cat.travel') },
    { value: 'Insurance', label: t('dash.finance.cat.insurance') },
    { value: 'Agent Fees', label: t('dash.finance.cat.agentFees') },
    { value: 'Other Expenses', label: t('dash.finance.cat.otherExpenses') }
  ];

  const paymentMethods = [
    { value: 'Bank Transfer', label: t('dash.finance.method.bankTransfer') },
    { value: 'Credit Card', label: t('dash.finance.method.creditCard') },
    { value: 'Cash', label: t('dash.finance.method.cash') },
    { value: 'Check', label: t('dash.finance.method.check') },
    { value: 'Online Payment', label: t('dash.finance.method.online') },
    { value: 'Other', label: t('dash.finance.method.other') }
  ];

  const statusOptions = [
    { value: 'pending', label: t('dash.finance.status.pending'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'completed', label: t('dash.finance.status.completed'), color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: t('dash.finance.status.cancelled'), color: 'bg-red-100 text-red-800' },
    { value: 'refunded', label: t('dash.finance.status.refunded'), color: 'bg-blue-100 text-blue-800' }
  ];

  useEffect(() => {
    fetchData();
  }, [academyId, currentPage, searchTerm, filterType, filterCategory, filterStatus, dateFrom, dateTo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [transactionsRes, summaryRes, budgetRes] = await Promise.all([
        getFinancialTransactions(academyId, {
          page: currentPage,
          limit: 20,
          type: filterType === 'all' ? undefined : filterType,
          category: filterCategory || undefined,
          status: filterStatus || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: searchTerm || undefined
        }),
        getFinancialSummary(academyId),
        getBudgetCategories(academyId)
      ]);

      setTransactions(transactionsRes.data?.transactions || []);
      setTotalPages(transactionsRes.data?.pagination?.totalPages || 1);
      setSummary(summaryRes.data?.summary || {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: '0',
        totalTransactions: 0
      });
      setBudgetCategories(budgetRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      if (!transactionForm.category || !transactionForm.amount || !transactionForm.description) {
        setError('Please fill in all required fields');
        return;
      }

      await createFinancialTransaction({
        ...transactionForm,
        academy_id: academyId,
        amount: Number(transactionForm.amount)
      } as FinancialTransaction);

      setShowTransactionModal(false);
      setTransactionForm({
        transaction_type: 'income',
        status: 'completed',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
    }
  };

  const handleUpdateTransaction = async () => {
    try {
      if (!editingTransaction?.id) return;

      await updateFinancialTransaction(editingTransaction.id, transactionForm);
      setShowTransactionModal(false);
      setEditingTransaction(null);
      setTransactionForm({
        transaction_type: 'income',
        status: 'completed',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await deleteFinancialTransaction(id);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  const openTransactionModal = (transaction?: FinancialTransaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setTransactionForm(transaction);
    } else {
      setEditingTransaction(null);
      setTransactionForm({
        transaction_type: 'income',
        status: 'completed',
        transaction_date: new Date().toISOString().split('T')[0]
      });
    }
    setShowTransactionModal(true);
  };

  // Budget Management Handlers
  const handleCreateBudgetCategory = async () => {
    try {
      // Enhanced validation
      if (!budgetForm.category_name?.trim()) {
        setError('Category name is required');
        return;
      }
      
      if (!budgetForm.budgeted_amount || Number(budgetForm.budgeted_amount) <= 0) {
        setError('Budgeted amount must be greater than 0');
        return;
      }

      if (!budgetForm.fiscal_year || budgetForm.fiscal_year < 2020 || budgetForm.fiscal_year > 2030) {
        setError('Please enter a valid fiscal year between 2020 and 2030');
        return;
      }

      // Check for duplicate category names
      const existingCategory = budgetCategories.find(
        cat => cat.category_name.toLowerCase() === budgetForm.category_name?.trim().toLowerCase()
      );
      if (existingCategory) {
        setError('A budget category with this name already exists');
        return;
      }

      await createBudgetCategory(academyId, {
        ...budgetForm,
        category_name: budgetForm.category_name?.trim() || '',
        budgeted_amount: Number(budgetForm.budgeted_amount)
      } as Omit<BudgetCategory, 'id' | 'academy_id' | 'created_at' | 'updated_at'>);

      setShowBudgetModal(false);
      setBudgetForm({
        category_type: 'expense',
        period_type: 'monthly',
        fiscal_year: new Date().getFullYear(),
        is_active: true
      });
      fetchData();
      setError(''); // Clear any previous errors
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget category');
    }
  };

  const handleUpdateBudgetCategory = async () => {
    try {
      if (!editingBudget?.id) return;

      // Enhanced validation
      if (!budgetForm.category_name?.trim()) {
        setError('Category name is required');
        return;
      }
      
      if (!budgetForm.budgeted_amount || Number(budgetForm.budgeted_amount) <= 0) {
        setError('Budgeted amount must be greater than 0');
        return;
      }

      if (!budgetForm.fiscal_year || budgetForm.fiscal_year < 2020 || budgetForm.fiscal_year > 2030) {
        setError('Please enter a valid fiscal year between 2020 and 2030');
        return;
      }

      // Check for duplicate category names (excluding current category)
      const existingCategory = budgetCategories.find(
        cat => cat.id !== editingBudget.id && 
               cat.category_name.toLowerCase() === budgetForm.category_name?.trim().toLowerCase()
      );
      if (existingCategory) {
        setError('A budget category with this name already exists');
        return;
      }

      await updateBudgetCategory(editingBudget.id, {
        ...budgetForm,
        category_name: budgetForm.category_name?.trim() || '',
        budgeted_amount: Number(budgetForm.budgeted_amount)
      });

      setShowBudgetModal(false);
      setEditingBudget(null);
      setBudgetForm({
        category_type: 'expense',
        period_type: 'monthly',
        fiscal_year: new Date().getFullYear(),
        is_active: true
      });
      fetchData();
      setError(''); // Clear any previous errors
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update budget category');
    }
  };

  const handleDeleteBudgetCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this budget category? This action cannot be undone.')) return;

    try {
      await deleteBudgetCategory(id);
      fetchData();
      setError(''); // Clear any previous errors
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete budget category');
    }
  };

  const openBudgetModal = (category?: BudgetCategory) => {
    if (category) {
      setEditingBudget(category);
      setBudgetForm(category);
    } else {
      setEditingBudget(null);
      setBudgetForm({
        category_type: 'expense',
        period_type: 'monthly',
        fiscal_year: new Date().getFullYear(),
        is_active: true
      });
    }
    setShowBudgetModal(true);
    setError(''); // Clear any previous errors when opening modal
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterCategory('');
    setFilterStatus('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  // Export Functions
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Financial Transactions Report', 20, 20);
    
    // Add summary information
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Total Revenue: ${formatCurrency(summary.totalRevenue)}`, 20, 45);
    doc.text(`Total Expenses: ${formatCurrency(summary.totalExpenses)}`, 20, 55);
    doc.text(`Net Profit: ${formatCurrency(summary.netProfit)}`, 20, 65);
    doc.text(`Profit Margin: ${summary.profitMargin}%`, 20, 75);
    
    // Add transactions table
    let yPosition = 90;
    doc.setFontSize(14);
    doc.text('Transactions', 20, yPosition);
    yPosition += 10;
    
    // Table headers
    doc.setFontSize(10);
    doc.text('Date', 20, yPosition);
    doc.text('Type', 50, yPosition);
    doc.text('Category', 80, yPosition);
    doc.text('Description', 110, yPosition);
    doc.text('Amount', 160, yPosition);
    doc.text('Status', 185, yPosition);
    yPosition += 10;
    
    // Add line under headers
    doc.line(20, yPosition - 5, 200, yPosition - 5);
    
    // Add transaction data
    transactions.forEach((transaction, index) => {
      if (yPosition > 270) { // Start new page if needed
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(formatDate(transaction.transaction_date), 20, yPosition);
      doc.text(transaction.transaction_type === 'income' ? 'Income' : 'Expense', 50, yPosition);
      doc.text(transaction.category.substring(0, 15), 80, yPosition);
      doc.text(transaction.description.substring(0, 25), 110, yPosition);
      doc.text(`${transaction.transaction_type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}`, 160, yPosition);
      doc.text(transaction.status, 185, yPosition);
      yPosition += 8;
    });
    
    // Save the PDF
    doc.save(`financial-transactions-${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportModal(false);
  };

  const exportToExcel = () => {
    // Prepare data for Excel export
    const exportData = [
      // Summary data
      ['Financial Transactions Report'],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [''],
      ['Summary'],
      ['Total Revenue', formatCurrency(summary.totalRevenue)],
      ['Total Expenses', formatCurrency(summary.totalExpenses)],
      ['Net Profit', formatCurrency(summary.netProfit)],
      ['Profit Margin', `${summary.profitMargin}%`],
      [''],
      ['Transactions'],
      // Headers
      ['Date', 'Type', 'Category', 'Subcategory', 'Description', 'Amount', 'Status', 'Payment Method', 'Reference Number', 'Notes'],
      // Transaction data
      ...transactions.map(transaction => [
        formatDate(transaction.transaction_date),
        transaction.transaction_type === 'income' ? 'Income' : 'Expense',
        transaction.category,
        transaction.subcategory || '',
        transaction.description,
        transaction.amount,
        transaction.status,
        transaction.payment_method || '',
        transaction.reference_number || '',
        transaction.notes || ''
      ])
    ];
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Set column widths
    const colWidths = [
      { wch: 12 }, // Date
      { wch: 10 }, // Type
      { wch: 20 }, // Category
      { wch: 15 }, // Subcategory
      { wch: 30 }, // Description
      { wch: 12 }, // Amount
      { wch: 10 }, // Status
      { wch: 15 }, // Payment Method
      { wch: 15 }, // Reference Number
      { wch: 25 }  // Notes
    ];
    ws['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Financial Transactions');
    
    // Save the Excel file
    XLSX.writeFile(wb, `financial-transactions-${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportModal(false);
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`/api/invoices?academy_id=${academyId}`, {
         headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
    }
  }, [activeTab]);

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleInvoiceSave = async (invoiceData: any) => {
    try {
      const url = editingInvoice ? `/api/invoices/${editingInvoice.id}` : '/api/invoices';
      const method = editingInvoice ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...invoiceData,
          academy_id: academyId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setShowInvoiceModal(false);
        setEditingInvoice(null);
        if (activeTab === 'invoices') fetchInvoices();
        fetchData(); // This will refresh the financial summary since the backend creates a transaction
      } else {
        throw new Error(result.error || 'Failed to save invoice');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice transaction');
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dash.financial.revenue')}</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRevenue)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dash.financial.expenses')}</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dash.financial.profit')}</p>
              <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.netProfit)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dash.financial.margin')}</p>
              <p className={`text-2xl font-bold ${parseFloat(summary.profitMargin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.profitMargin}%
              </p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b px-6">
          <div className="flex -mb-px space-x-8">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('budgets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'budgets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Budgets
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoices
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'transactions' && (
      <>
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => openTransactionModal()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dash.finance.manager.add')}
            </button>
            
            <button
              onClick={() => openBudgetModal()}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dash.finance.manager.budget')}
            </button>

            <button
              onClick={() => setShowInvoiceModal(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {t('dash.finance.manager.invoice')}
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('dash.settings.export')}
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('dash.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {t('common.clear')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{t('dash.finance.filter.allCategories')}</option>
            {[...incomeCategories, ...expenseCategories].map(category => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{t('dash.finance.filter.allStatus')}</option>
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('dash.finance.filter.fromDate')}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('dash.finance.filter.toDate')}
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dash.transfers.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dash.finance.category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dash.finance.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dash.transfers.amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const status = statusOptions.find(s => s.value === transaction.status);
                const categoryLabel = [...incomeCategories, ...expenseCategories].find(c => c.value === transaction.category)?.label || transaction.category;
                
                return (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.transaction_type === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.transaction_type === 'income' ? t('dash.finance.type.income') : t('dash.finance.type.expense')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {categoryLabel}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.transaction_type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status?.color}`}>
                        {status?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openTransactionModal(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => transaction.id && handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.previous')}
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t('common.page')} <span className="font-medium">{currentPage}</span> {t('common.of')}{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('common.previous')}
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {t('common.next')}
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* ... (rest of invoices content) */}
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
            <button
              onClick={() => {
                setEditingInvoice(null);
                setShowInvoiceModal(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dash.finance.manager.invoice')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length > 0 ? (
                  invoices.map((invoice) => (
                    <tr key={invoice.id || invoice.invoice_number} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.issue_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                         {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {invoice.status || 'Draft'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditInvoice(invoice)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No invoices found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'budgets' && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Budget Management</h3>
          <p className="text-gray-500 mb-6">Manage your academy budgets and track spending against targets.</p>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Budget
          </button>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTransaction ? 'Edit Transaction' : t('dash.finance.manager.add')}
                </h3>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction Type *
                    </label>
                    <select
                      value={transactionForm.transaction_type}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        transaction_type: e.target.value as 'income' | 'expense'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={transactionForm.category}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        category: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Category</option>
                      {(transactionForm.transaction_type === 'income' ? incomeCategories : expenseCategories).map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={transactionForm.subcategory || ''}
                    onChange={(e) => setTransactionForm({
                      ...transactionForm,
                      subcategory: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional subcategory"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={transactionForm.amount || ''}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        amount: parseFloat(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction Date *
                    </label>
                    <input
                      type="date"
                      value={transactionForm.transaction_date}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        transaction_date: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={transactionForm.description || ''}
                    onChange={(e) => setTransactionForm({
                      ...transactionForm,
                      description: e.target.value
                    })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter transaction description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={transactionForm.payment_method || ''}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        payment_method: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Payment Method</option>
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={transactionForm.status}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        status: e.target.value as 'pending' | 'completed' | 'cancelled' | 'refunded'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {statusOptions.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={transactionForm.reference_number || ''}
                    onChange={(e) => setTransactionForm({
                      ...transactionForm,
                      reference_number: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional reference number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={transactionForm.notes || ''}
                    onChange={(e) => setTransactionForm({
                      ...transactionForm,
                      notes: e.target.value
                    })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTransaction ? 'Update Transaction' : 'Create Transaction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingBudget ? 'Edit Budget Category' : 'Add Budget Category'}
                </h3>
                <button
                  onClick={() => setShowBudgetModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={budgetForm.category_name || ''}
                    onChange={(e) => setBudgetForm({
                      ...budgetForm,
                      category_name: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Equipment, Travel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Type
                  </label>
                  <select
                    value={budgetForm.category_type}
                    onChange={(e) => setBudgetForm({
                      ...budgetForm,
                      category_type: e.target.value as 'revenue' | 'expense'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budgeted Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetForm.budgeted_amount || ''}
                    onChange={(e) => setBudgetForm({
                      ...budgetForm,
                      budgeted_amount: parseFloat(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fiscal Year
                    </label>
                    <input
                      type="number"
                      value={budgetForm.fiscal_year}
                      onChange={(e) => setBudgetForm({
                        ...budgetForm,
                        fiscal_year: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Period Type
                    </label>
                    <select
                      value={budgetForm.period_type}
                      onChange={(e) => setBudgetForm({
                        ...budgetForm,
                        period_type: e.target.value as 'monthly' | 'quarterly' | 'yearly'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowBudgetModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingBudget ? handleUpdateBudgetCategory : handleCreateBudgetCategory}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <InvoiceGenerator
          academyId={academyId}
          academyDetails={academyDetails}
          initialData={editingInvoice}
          onClose={() => {
            setShowInvoiceModal(false);
            setEditingInvoice(null);
          }}
          onSave={handleInvoiceSave}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Export Data</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={exportToPDF}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-5 w-5 mr-2 text-red-600" />
                  Export as PDF
                </button>
                
                <button
                  onClick={exportToExcel}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-5 w-5 mr-2 text-green-600" />
                  Export as Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Missing Icon Component
const FileText = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <line x1="10" y1="9" x2="8" y2="9"></line>
  </svg>
);

export default FinancialTransactionsManager;
