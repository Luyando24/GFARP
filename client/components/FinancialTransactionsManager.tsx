import React, { useState, useEffect, useRef } from 'react';
import { Api } from '@/lib/api';
import { useLanguage } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
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
  Bell,
  Repeat2,
  Settings2,
  UserRound
} from 'lucide-react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import InvoiceGenerator from './InvoiceGenerator';
import { 
  FinancialTransaction,
  PlayerFeeSubscription,
  BudgetCategory,
  getFinancialTransactions,
  createFinancialTransaction,
  updateFinancialTransaction,
  deleteFinancialTransaction,
  getFinancialSummary,
  getBudgetCategories,
  createBudgetCategory,
  updateBudgetCategory,
  deleteBudgetCategory,
  getAcademyFinancialSettings,
  updateAcademyFinancialSettings,
  getPlayerFeeSubscriptions,
  updatePlayerFeeSubscription,
  processPlayerFeeReminders
} from '../lib/api';

interface FinancialTransactionsManagerProps {
  academyId: string;
  academyDetails?: any;
}

const FinancialTransactionsManager: React.FC<FinancialTransactionsManagerProps> = ({ academyId, academyDetails }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [feeSubscriptions, setFeeSubscriptions] = useState<PlayerFeeSubscription[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [currencyDraft, setCurrencyDraft] = useState('USD');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [defaultReminderDays, setDefaultReminderDays] = useState(7);
  const [savingSettings, setSavingSettings] = useState(false);
  const financialRequestId = useRef(0);

  const showSuccess = (message: string) => toast({
    title: 'Success',
    description: message,
    duration: 4000,
  });

  const showError = (message: string) => toast({
    title: 'Action failed',
    description: message,
    variant: 'destructive',
    duration: 6000,
  });
  
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
  const [activeTab, setActiveTab] = useState<'player-fees' | 'subscriptions' | 'transactions' | 'budgets' | 'invoices'>('player-fees');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  // Form states
  const [transactionForm, setTransactionForm] = useState<Partial<FinancialTransaction>>({
    transaction_type: 'income',
    category: 'Academy Fees',
    status: 'completed',
    transaction_date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    payment_type: 'monthly',
    is_external_payment: true,
    reminder_days_before: 7,
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

  const emptyTransactionForm = (playerFee = true): Partial<FinancialTransaction> => ({
    transaction_type: 'income',
    category: playerFee ? 'Academy Fees' : undefined,
    status: 'completed',
    transaction_date: new Date().toISOString().split('T')[0],
    currency: defaultCurrency,
    payment_type: playerFee ? 'monthly' : undefined,
    is_external_payment: playerFee,
    reminder_days_before: defaultReminderDays,
  });

  const loadFeeManagementData = async () => {
    try {
      const [settings, subscriptions] = await Promise.all([
        getAcademyFinancialSettings(academyId),
        getPlayerFeeSubscriptions(academyId),
      ]);
      setDefaultCurrency(settings.default_currency || 'USD');
      setCurrencyDraft(settings.default_currency || 'USD');
      setRemindersEnabled(settings.renewal_reminders_enabled !== false);
      setDefaultReminderDays(settings.default_reminder_days ?? 7);
      setFeeSubscriptions(subscriptions || []);

      const allPlayers: any[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await Api.getPlayers(academyId, undefined, page, 100);
        allPlayers.push(...(response.data?.players || []));
        totalPages = response.data?.pagination?.totalPages || 1;
        page += 1;
      } while (page <= totalPages);
      setPlayers(allPlayers);
    } catch (err) {
      console.error('Error fetching player fee management data:', err);
      showError(err instanceof Error ? err.message : 'Failed to load player fee management data');
    }
  };

  useEffect(() => {
    if (academyId && (activeTab === 'player-fees' || activeTab === 'subscriptions')) {
      // Keep the current UI visible while fresh player-fee data is loaded.
      loadFeeManagementData();
    }
  }, [academyId, activeTab]);

  useEffect(() => {
    fetchData();
  }, [academyId, currentPage, searchTerm, filterType, filterCategory, filterStatus, dateFrom, dateTo, activeTab, defaultCurrency]);

  const fetchData = async () => {
    const requestId = ++financialRequestId.current;
    const requestedTab = activeTab;

    try {
      const [transactionsRes, summaryRes, budgetRes] = await Promise.all([
        getFinancialTransactions(academyId, {
          page: currentPage,
          limit: 20,
          type: filterType === 'all' ? undefined : filterType,
          category: filterCategory || undefined,
          status: filterStatus || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: searchTerm || undefined,
          currency: defaultCurrency,
          playerFeesOnly: requestedTab === 'player-fees',
        }),
        getFinancialSummary(academyId, { currency: defaultCurrency }),
        getBudgetCategories(academyId)
      ]);

      // Ignore a slower response from a tab/filter selection that is no longer current.
      if (requestId !== financialRequestId.current) return;

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
      if (requestId !== financialRequestId.current) return;
      showError(err instanceof Error ? err.message : t('common.error'));
      console.error("Error fetching financial data:", err);
    }
  };

  const handleCreateTransaction = async () => {
    try {
      if (!transactionForm.category || !transactionForm.amount || !transactionForm.description) {
        showError('Please fill in all required fields');
        return;
      }
      if (transactionForm.category === 'Academy Fees' && !transactionForm.player_id) {
        showError('Select the player who paid this fee');
        return;
      }
      if (transactionForm.is_recurring && !transactionForm.next_renewal_date) {
        showError('Choose the next renewal date for this recurring fee');
        return;
      }

      await createFinancialTransaction({
        ...transactionForm,
        academy_id: academyId,
        amount: Number(transactionForm.amount)
      } as FinancialTransaction);

      setShowTransactionModal(false);
      setTransactionForm(emptyTransactionForm(activeTab === 'player-fees'));
      await Promise.all([fetchData(), loadFeeManagementData()]);
      showSuccess('Transaction created successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create transaction');
    }
  };

  const handleUpdateTransaction = async () => {
    try {
      if (!editingTransaction?.id) return;

      await updateFinancialTransaction(editingTransaction.id, transactionForm);
      setShowTransactionModal(false);
      setEditingTransaction(null);
      setTransactionForm(emptyTransactionForm(activeTab === 'player-fees'));
      fetchData();
      showSuccess('Transaction updated successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async (id: string | number) => {
    console.debug('Delete button clicked:', { transactionId: id, idType: typeof id });
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await deleteFinancialTransaction(id);
      fetchData();
      showSuccess('Transaction deleted successfully');
    } catch (err) {
      console.error('Delete transaction error:', err);
      showError(err instanceof Error ? err.message : 'Failed to delete transaction');
    }
  };

  const openTransactionModal = (transaction?: FinancialTransaction, playerFee = activeTab === 'player-fees') => {
    console.debug('Edit button clicked:', { transactionId: transaction?.id, rawDate: transaction?.transaction_date });
    if (transaction) {
      setEditingTransaction(transaction);
      let formattedDate = '';
      try {
        formattedDate = transaction.transaction_date ? new Date(transaction.transaction_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      } catch (e) {
        formattedDate = new Date().toISOString().split('T')[0];
      }
      setTransactionForm({
        ...transaction,
        transaction_date: formattedDate
      });
    } else {
      setEditingTransaction(null);
      setTransactionForm(emptyTransactionForm(playerFee));
    }
    setShowTransactionModal(true);
  };

  const openSubscriptionPayment = (subscription: PlayerFeeSubscription) => {
    setEditingTransaction(null);
    setTransactionForm({
      ...emptyTransactionForm(true),
      player_id: subscription.player_id,
      fee_subscription_id: subscription.id,
      description: subscription.fee_name,
      amount: Number(subscription.amount),
      currency: subscription.currency,
      payment_type: subscription.billing_cycle,
      custom_payment_type: subscription.custom_billing_label,
      next_renewal_date: subscription.billing_cycle === 'custom' ? '' : subscription.next_renewal_date,
    });
    setShowTransactionModal(true);
  };

  const openRecurringFee = () => {
    setEditingTransaction(null);
    setTransactionForm({ ...emptyTransactionForm(true), is_recurring: true });
    setShowTransactionModal(true);
  };

  const saveFinancialSettings = async () => {
    try {
      setSavingSettings(true);
      const currency = currencyDraft.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Enter a valid three-letter ISO currency code');
      const settings = await updateAcademyFinancialSettings(academyId, {
        default_currency: currency,
        renewal_reminders_enabled: remindersEnabled,
        default_reminder_days: defaultReminderDays,
      });
      setDefaultCurrency(settings.default_currency);
      setCurrencyDraft(settings.default_currency);
      showSuccess('Financial settings saved');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save financial settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const changeSubscriptionStatus = async (subscription: PlayerFeeSubscription, status: PlayerFeeSubscription['status']) => {
    try {
      await updatePlayerFeeSubscription(subscription.id, { status });
      await loadFeeManagementData();
      showSuccess(`Recurring fee ${status}`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update recurring fee');
    }
  };

  const sendRenewalReminders = async () => {
    try {
      const result = await processPlayerFeeReminders(academyId);
      await loadFeeManagementData();
      showSuccess(`Reminder run complete: ${result.emailsSent} sent, ${result.emailsFailed} failed`);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to send renewal reminders');
    }
  };

  // Budget Management Handlers
  const handleCreateBudgetCategory = async () => {
    try {
      if (!academyId) {
        showError('Academy ID is missing. Please refresh the page.');
        return;
      }

      // Enhanced validation
      if (!budgetForm.category_name?.trim()) {
        showError('Category name is required');
        return;
      }
      
      if (!budgetForm.budgeted_amount || Number(budgetForm.budgeted_amount) <= 0) {
        showError('Budgeted amount must be greater than 0');
        return;
      }

      if (!budgetForm.fiscal_year || budgetForm.fiscal_year < 2020 || budgetForm.fiscal_year > 2030) {
        showError('Please enter a valid fiscal year between 2020 and 2030');
        return;
      }

      // Check for duplicate category names
      const existingCategory = budgetCategories.find(
        cat => cat.category_name.toLowerCase() === budgetForm.category_name?.trim().toLowerCase()
      );
      if (existingCategory) {
        showError('A budget category with this name already exists');
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
      showSuccess('Budget category created successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create budget category');
    }
  };

  const handleUpdateBudgetCategory = async () => {
    try {
      if (!editingBudget?.id) return;

      // Enhanced validation
      if (!budgetForm.category_name?.trim()) {
        showError('Category name is required');
        return;
      }
      
      if (!budgetForm.budgeted_amount || Number(budgetForm.budgeted_amount) <= 0) {
        showError('Budgeted amount must be greater than 0');
        return;
      }

      if (!budgetForm.fiscal_year || budgetForm.fiscal_year < 2020 || budgetForm.fiscal_year > 2030) {
        showError('Please enter a valid fiscal year between 2020 and 2030');
        return;
      }

      // Check for duplicate category names (excluding current category)
      const existingCategory = budgetCategories.find(
        cat => cat.id !== editingBudget.id && 
               cat.category_name.toLowerCase() === budgetForm.category_name?.trim().toLowerCase()
      );
      if (existingCategory) {
        showError('A budget category with this name already exists');
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
      showSuccess('Budget category updated successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update budget category');
    }
  };

  const handleDeleteBudgetCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this budget category? This action cannot be undone.')) return;

    try {
      await deleteBudgetCategory(id);
      fetchData();
      showSuccess('Budget category deleted successfully');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete budget category');
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
  };

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: defaultCurrency
      }).format(amount);
    } catch {
      return `${defaultCurrency} ${Number(amount).toFixed(2)}`;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Error';
    }
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
  const getAllTransactionsForReport = async () => {
    const reportTransactions: FinancialTransaction[] = [];
    let page = 1;
    let pages = 1;
    do {
      const response = await getFinancialTransactions(academyId, {
        page,
        limit: 200,
        type: filterType === 'all' ? undefined : filterType,
        category: filterCategory || undefined,
        status: filterStatus || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: searchTerm || undefined,
        currency: defaultCurrency,
        playerFeesOnly: activeTab === 'player-fees',
      });
      reportTransactions.push(...(response.data.transactions || []));
      pages = response.data.pagination.totalPages || 1;
      page += 1;
    } while (page <= pages);
    return reportTransactions;
  };

  const exportToPDF = async () => {
    const reportTransactions = await getAllTransactionsForReport();
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
    reportTransactions.forEach((transaction) => {
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

  const exportToExcel = async () => {
    const reportTransactions = await getAllTransactionsForReport();
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
      ['Date', 'Type', 'Player', 'Category', 'Payment Type', 'Description', 'Amount', 'Currency', 'Status', 'Payment Method', 'Reference Number', 'External Payment', 'Notes'],
      // Transaction data
      ...reportTransactions.map(transaction => [
        formatDate(transaction.transaction_date),
        transaction.transaction_type === 'income' ? 'Income' : 'Expense',
        transaction.player_name || '',
        transaction.category,
        transaction.payment_type === 'custom' ? transaction.custom_payment_type : transaction.payment_type || '',
        transaction.description,
        transaction.amount,
        transaction.currency || defaultCurrency,
        transaction.status,
        transaction.payment_method || '',
        transaction.reference_number || '',
        transaction.is_external_payment ? 'Yes' : 'No',
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

    const subscriptionSheet = XLSX.utils.json_to_sheet(feeSubscriptions.map(subscription => ({
      Player: subscription.player_name,
      Email: subscription.player_email,
      Fee: subscription.fee_name,
      Amount: Number(subscription.amount),
      Currency: subscription.currency,
      'Billing Cycle': subscription.billing_cycle === 'custom'
        ? subscription.custom_billing_label
        : subscription.billing_cycle,
      'Next Renewal': subscription.next_renewal_date,
      'Reminder Days': subscription.reminder_days_before,
      Status: subscription.status,
      'Last Reminder': subscription.last_reminder_sent_at || '',
    })));
    XLSX.utils.book_append_sheet(wb, subscriptionSheet, 'Recurring Player Fees');
    
    // Save the Excel file
    XLSX.writeFile(wb, `financial-transactions-${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportModal(false);
  };

  const exportInvoiceToPDF = (invoice: any) => {
    const doc = new jsPDF();
    
    // Add company/academy header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text(academyDetails?.name || 'Academy Invoice', 20, 20);
    
    doc.setFontSize(10);
    doc.text(academyDetails?.location || '', 20, 30);
    doc.text(academyDetails?.email || '', 20, 35);
    
    // Invoice details
    doc.setFontSize(16);
    doc.text('INVOICE', 150, 20);
    
    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 150, 30);
    doc.text(`Date: ${invoice.issue_date}`, 150, 35);
    doc.text(`Status: ${invoice.status || 'Draft'}`, 150, 40);
    
    // Bill To
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 50);
    doc.setFontSize(10);
    doc.text(invoice.client_name || 'N/A', 20, 60);
    if (invoice.client_email) doc.text(invoice.client_email, 20, 65);
    
    // Line items header
    doc.line(20, 75, 190, 75);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text('Description', 20, 80);
    doc.text('Amount', 160, 80);
    doc.setFont("helvetica", "normal");
    doc.line(20, 85, 190, 85);
    
    // Items
    let yPos = 95;
    
    if (invoice.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item: any) => {
            doc.text(item.description || 'Item', 20, yPos);
            doc.text(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount || 0), 160, yPos);
            yPos += 10;
        });
    } else {
        doc.text('Invoice Total', 20, yPos);
        doc.text(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.total_amount || 0), 160, yPos);
        yPos += 10;
    }
    
    // Total
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text('Total:', 130, yPos);
    doc.text(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.total_amount || 0), 160, yPos);
    
    doc.save(`Invoice_${invoice.invoice_number}.pdf`);
  };

  const fetchInvoices = async () => {
    try {
      const data = await Api.get<any>(`/invoices?academy_id=${academyId}`);
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
  }, [academyId, activeTab]);

  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleInvoiceSave = async (invoiceData: any) => {
    try {
      const url = editingInvoice ? `/invoices/${editingInvoice.id}` : '/invoices';
      const method = editingInvoice ? 'PUT' : 'POST';
      console.log('Invoice Save Request:', { url, method, id: editingInvoice?.id });
      
      const result = method === 'PUT' 
        ? await Api.put<any>(url, { ...invoiceData, academy_id: academyId })
        : await Api.post<any>(url, { ...invoiceData, academy_id: academyId });

      if (result.success) {
        setShowInvoiceModal(false);
        setEditingInvoice(null);
        if (activeTab === 'invoices') fetchInvoices();
        fetchData(); // This will refresh the financial summary since the backend creates a transaction
        showSuccess(editingInvoice ? 'Invoice updated successfully' : 'Invoice created successfully');
      } else {
        throw new Error(result.error || 'Failed to save invoice');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save invoice transaction');
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Player fee settings</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Fee entries record payments collected directly by your academy outside Soccer Circular.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <label className="text-sm text-slate-700">
              Default currency
              <input
                value={currencyDraft}
                onChange={(event) => setCurrencyDraft(event.target.value.toUpperCase().slice(0, 3))}
                maxLength={3}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 uppercase"
                placeholder="USD"
                aria-label="Default currency code"
              />
            </label>
            <label className="text-sm text-slate-700">
              Reminder lead days
              <input
                type="number"
                min={0}
                max={90}
                value={defaultReminderDays}
                onChange={(event) => setDefaultReminderDays(Number(event.target.value))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(event) => setRemindersEnabled(event.target.checked)}
              />
              Email reminders
            </label>
            <button
              onClick={saveFinancialSettings}
              disabled={savingSettings}
              className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {savingSettings ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      </div>

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
      <div className="mb-6 overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto border-b px-4 sm:px-6">
          <div className="-mb-px flex w-max min-w-full gap-6 sm:gap-8">
            <button
              onClick={() => { setActiveTab('player-fees'); setCurrentPage(1); }}
              className={`shrink-0 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'player-fees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Player Fees
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`shrink-0 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subscriptions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Recurring Fees
            </button>
            <button
              onClick={() => { setActiveTab('transactions'); setCurrentPage(1); }}
              className={`shrink-0 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('budgets')}
              className={`shrink-0 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'budgets'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Budgets
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`shrink-0 py-4 px-1 border-b-2 font-medium text-sm ${
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

      {(activeTab === 'player-fees' || activeTab === 'transactions') && (
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
              {activeTab === 'player-fees' ? 'Record Player Fee' : t('dash.finance.manager.add')}
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
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('dash.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          >
            <option value="">{t('dash.finance.filter.allCategories')}</option>
            {[...incomeCategories, ...expenseCategories].map(category => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
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
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            placeholder={t('dash.finance.filter.fromDate')}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            placeholder={t('dash.finance.filter.toDate')}
          />
        </div>

        {/* Clear Filters Button */}
        {(searchTerm || filterType !== 'all' || filterCategory || filterStatus || dateFrom || dateTo) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors flex items-center"
            >
              <X className="h-4 w-4 mr-2" />
              {t('common.clear')}
            </button>
          </div>
        )}
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
                {activeTab === 'player-fees' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('dash.finance.category')}
                </th>
                {activeTab === 'player-fees' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Type
                  </th>
                )}
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
                    {activeTab === 'player-fees' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{transaction.player_name || 'Unassigned'}</div>
                        <div className="text-xs text-gray-500">{transaction.player_email || ''}</div>
                      </td>
                    )}
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
                    {activeTab === 'player-fees' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize text-gray-900">
                        {transaction.payment_type === 'custom'
                          ? transaction.custom_payment_type || 'Custom'
                          : transaction.payment_type || 'One-time'}
                        {transaction.fee_subscription_id && (
                          <span className="ml-2 inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Recurring</span>
                        )}
                      </td>
                    )}
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

      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg bg-white p-6 shadow sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Repeat2 className="h-5 w-5 text-purple-600" /> Recurring player fees
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Renewal reminders go to both the academy and player email and are logged per due date.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={openRecurringFee}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" /> New recurring fee
              </button>
              <button
                onClick={sendRenewalReminders}
                disabled={!remindersEnabled}
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Bell className="mr-2 h-4 w-4" /> Send due reminders
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Player', 'Fee', 'Amount', 'Billing', 'Next renewal', 'Reminder status', 'Status', 'Actions'].map((heading) => (
                      <th key={heading} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {feeSubscriptions.map((subscription) => {
                    const academyDelivery = subscription.reminder_delivery?.academy;
                    const playerDelivery = subscription.reminder_delivery?.player;
                    const cycleLabel = subscription.billing_cycle === 'custom'
                      ? subscription.custom_billing_label || 'Custom'
                      : subscription.billing_cycle;
                    return (
                      <tr key={subscription.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4 text-sm">
                          <div className="font-medium text-gray-900">{subscription.player_name}</div>
                          <div className="text-xs text-gray-500">{subscription.player_email}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-900">{subscription.fee_name}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: subscription.currency }).format(Number(subscription.amount))}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm capitalize text-gray-700">{cycleLabel}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatDate(subscription.next_renewal_date)}
                          <div className="text-xs text-gray-500">{subscription.reminder_days_before} days before</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-xs">
                          <div className={academyDelivery?.status === 'sent' ? 'text-green-700' : academyDelivery?.status === 'failed' ? 'text-red-700' : 'text-gray-500'}>
                            Academy: {academyDelivery?.status || 'Pending'}
                          </div>
                          <div className={playerDelivery?.status === 'sent' ? 'text-green-700' : playerDelivery?.status === 'failed' ? 'text-red-700' : 'text-gray-500'}>
                            Player: {playerDelivery?.status || 'Pending'}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                            subscription.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>{subscription.status}</span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openSubscriptionPayment(subscription)} className="text-blue-600 hover:text-blue-800">Record payment</button>
                            {subscription.status === 'active' ? (
                              <button onClick={() => changeSubscriptionStatus(subscription, 'paused')} className="text-amber-600 hover:text-amber-800">Pause</button>
                            ) : subscription.status === 'paused' ? (
                              <button onClick={() => changeSubscriptionStatus(subscription, 'active')} className="text-green-600 hover:text-green-800">Resume</button>
                            ) : null}
                            {!['cancelled', 'completed'].includes(subscription.status) && (
                              <button onClick={() => changeSubscriptionStatus(subscription, 'cancelled')} className="text-red-600 hover:text-red-800">Cancel</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {feeSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        No recurring player fees yet. Record a player fee and enable recurring reminders to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* ... (rest of invoices content) */}
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
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
                        <button
                          onClick={() => exportInvoiceToPDF(invoice)}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Download className="h-4 w-4 inline mr-1" />
                          PDF
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
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-medium text-gray-900">Budget Management</h3>
            <button
              onClick={() => openBudgetModal()}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Budget
            </button>
          </div>

          {budgetCategories.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Budget Categories</h3>
              <p className="text-gray-500 mb-6">Create your first budget category to start tracking.</p>
              <button
                onClick={() => setShowBudgetModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Budget
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fiscal Year
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Budgeted Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {budgetCategories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {category.category_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            category.category_type === 'revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {category.category_type === 'revenue' ? 'Revenue' : 'Expense'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.fiscal_year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(category.budgeted_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {category.period_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openBudgetModal(category)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => category.id && handleDeleteBudgetCategory(category.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                {(transactionForm.category === 'Academy Fees' || transactionForm.player_id) && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="mb-3 flex items-start gap-2 text-sm text-blue-800">
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>This records a fee collected externally by the academy. Soccer Circular will not process or charge this payment.</span>
                    </div>
                    <label className="block text-sm font-medium text-gray-700">
                      Player *
                      <select
                        value={transactionForm.player_id || ''}
                        onChange={(event) => setTransactionForm({
                          ...transactionForm,
                          player_id: event.target.value || undefined,
                          is_external_payment: true,
                        })}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select player</option>
                        {players.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.firstName} {player.lastName}{player.email ? ` — ${player.email}` : ' — no email'}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

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
                        category: e.target.value,
                        transaction_type: e.target.value === 'Academy Fees' ? 'income' : transactionForm.transaction_type,
                        is_external_payment: e.target.value === 'Academy Fees' ? true : transactionForm.is_external_payment,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Category</option>
                      {(transactionForm.transaction_type === 'income' ? incomeCategories : expenseCategories).map(category => (
                        <option key={category.value} value={category.value}>{category.label}</option>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      Currency *
                    </label>
                    <input
                      value={transactionForm.currency || defaultCurrency}
                      onChange={(e) => setTransactionForm({
                        ...transactionForm,
                        currency: e.target.value.toUpperCase().slice(0, 3)
                      })}
                      maxLength={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="USD"
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

                {(transactionForm.category === 'Academy Fees' || transactionForm.player_id) && (
                  <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Payment type *</label>
                        <select
                          value={transactionForm.payment_type || 'monthly'}
                          onChange={(event) => setTransactionForm({
                            ...transactionForm,
                            payment_type: event.target.value as 'monthly' | 'yearly' | 'custom',
                            custom_payment_type: event.target.value === 'custom' ? transactionForm.custom_payment_type : undefined,
                          })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      {transactionForm.payment_type === 'custom' && (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">Custom payment type *</label>
                          <input
                            value={transactionForm.custom_payment_type || ''}
                            onChange={(event) => setTransactionForm({ ...transactionForm, custom_payment_type: event.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Term fee, 6-week program"
                          />
                        </div>
                      )}
                    </div>

                    {!transactionForm.fee_subscription_id && (
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={Boolean(transactionForm.is_recurring)}
                          onChange={(event) => setTransactionForm({ ...transactionForm, is_recurring: event.target.checked })}
                        />
                        Create a recurring fee schedule and send renewal reminders
                      </label>
                    )}

                    {(transactionForm.is_recurring || transactionForm.fee_subscription_id) && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            {transactionForm.fee_subscription_id && transactionForm.payment_type === 'custom'
                              ? 'Next renewal after this payment *'
                              : 'Next renewal date *'}
                          </label>
                          <input
                            type="date"
                            value={transactionForm.next_renewal_date || ''}
                            onChange={(event) => setTransactionForm({ ...transactionForm, next_renewal_date: event.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {!transactionForm.fee_subscription_id && (
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Remind days before renewal</label>
                            <input
                              type="number"
                              min={0}
                              max={90}
                              value={transactionForm.reminder_days_before ?? defaultReminderDays}
                              onChange={(event) => setTransactionForm({ ...transactionForm, reminder_days_before: Number(event.target.value) })}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                        <option key={method.value} value={method.value}>{method.label}</option>
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
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white">
            <div className="p-4 sm:p-6">
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
