import { RequestHandler } from 'express';
import { query } from '../lib/db';
import { decrypt } from '../lib/encryption';

export interface AcademyDashboardStats {
  totalPlayers: number;
  activeTransfers: number;
  monthlyRevenue: number;
  recentTransfers: {
    id: string;
    player: string;
    from: string;
    to: string;
    amount: string;
    date: string;
    status: 'pending' | 'approved' | 'completed' | 'rejected';
  }[];
  monthlyFinancialPerformance: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
}

export const handleGetAcademyDashboardStats: RequestHandler = async (req, res) => {
  try {
    const { academyId } = req.query;
    
    if (!academyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Academy ID is required' 
      });
    }

    // Get total players count for the academy
    const totalPlayersResult = await query(
      'SELECT COUNT(*) as count FROM players WHERE academy_id = $1',
      [academyId]
    );
    const totalPlayers = parseInt(totalPlayersResult.rows[0].count) || 0;

    // Get active transfers count (pending, approved, or in-progress transfers)
    const activeTransfersResult = await query(
      `SELECT COUNT(*) as count FROM transfers 
       WHERE academy_id = $1 AND status IN ('pending', 'approved', 'in_progress')`,
      [academyId]
    );
    const activeTransfers = parseInt(activeTransfersResult.rows[0].count) || 0;

    // Get monthly revenue from completed transfers and financial transactions (current month)
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Get revenue from transfers
    const transferRevenueResult = await query(
      `SELECT COALESCE(SUM(transfer_amount), 0) as revenue 
       FROM transfers 
       WHERE academy_id = $1 
       AND status = 'completed' 
       AND transfer_date >= $2 
       AND transfer_date <= $3`,
      [academyId, firstDayOfMonth.toISOString(), lastDayOfMonth.toISOString()]
    );
    const transferRevenue = parseFloat(transferRevenueResult.rows[0].revenue) || 0;

    // Get revenue from financial transactions (income only)
    const financialRevenueResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as revenue 
       FROM financial_transactions 
       WHERE academy_id = $1 
       AND status = 'completed' 
       AND transaction_type = 'income'
       AND transaction_date >= $2 
       AND transaction_date <= $3`,
      [academyId, firstDayOfMonth.toISOString(), lastDayOfMonth.toISOString()]
    );
    const financialRevenue = parseFloat(financialRevenueResult.rows[0].revenue) || 0;

    // Combine both revenue sources
    const monthlyRevenue = transferRevenue + financialRevenue;

    // Get recent transfers (last 5 transfers)
    const recentTransfersResult = await query(
      `SELECT 
        id,
        player_name,
        from_club,
        to_club,
        transfer_amount,
        currency,
        transfer_date,
        status
       FROM transfers 
       WHERE academy_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [academyId]
    );

    const recentTransfers = recentTransfersResult.rows.map(transfer => ({
      id: transfer.id,
      player: transfer.player_name || 'Unknown Player',
      from: transfer.from_club || 'Unknown Club',
      to: transfer.to_club || 'Unknown Club',
      amount: transfer.transfer_amount 
        ? `${transfer.currency || '$'}${transfer.transfer_amount.toLocaleString()}` 
        : '$0',
      date: transfer.transfer_date 
        ? new Date(transfer.transfer_date).toLocaleDateString() 
        : new Date().toLocaleDateString(),
      status: transfer.status || 'pending'
    }));

    // Get monthly financial performance for the last 6 months (including both transfers and financial transactions)
    const monthlyFinancialResult = await query(
      `SELECT 
        DATE_TRUNC('month', transfer_date) as month,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN transfer_amount ELSE 0 END), 0) as revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN agent_fee ELSE 0 END), 0) as expenses
       FROM transfers 
       WHERE academy_id = $1 
       AND transfer_date >= $2
       GROUP BY DATE_TRUNC('month', transfer_date)
       ORDER BY month DESC
       LIMIT 6`,
      [academyId, new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()]
    );

    // Get financial transactions data for the same period
    const financialTransactionsResult = await query(
      `SELECT 
        DATE_TRUNC('month', transaction_date) as month,
        COALESCE(SUM(CASE WHEN status = 'completed' AND transaction_type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN status = 'completed' AND transaction_type = 'expense' THEN amount ELSE 0 END), 0) as expenses
       FROM financial_transactions 
       WHERE academy_id = $1 
       AND transaction_date >= $2
       GROUP BY DATE_TRUNC('month', transaction_date)
       ORDER BY month DESC
       LIMIT 6`,
      [academyId, new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString()]
    );

    // Create monthly financial performance array with last 6 months
    const monthlyFinancialPerformance = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = months[date.getMonth()];
      
      // Find transfer data for this month
      const transferData = monthlyFinancialResult.rows.find(row => {
        const rowMonth = new Date(row.month);
        return rowMonth.getMonth() === date.getMonth() && rowMonth.getFullYear() === date.getFullYear();
      });

      // Find financial transaction data for this month
      const financialData = financialTransactionsResult.rows.find(row => {
        const rowMonth = new Date(row.month);
        return rowMonth.getMonth() === date.getMonth() && rowMonth.getFullYear() === date.getFullYear();
      });
      
      // Combine revenue from both sources
      const transferRevenue = transferData ? parseFloat(transferData.revenue) || 0 : 0;
      const financialIncome = financialData ? parseFloat(financialData.income) || 0 : 0;
      const totalRevenue = transferRevenue + financialIncome;

      // Combine expenses from both sources
      const transferExpenses = transferData ? parseFloat(transferData.expenses) || 0 : 0;
      const financialExpenses = financialData ? parseFloat(financialData.expenses) || 0 : 0;
      const combinedExpenses = transferExpenses + financialExpenses;
      const totalExpenses = combinedExpenses > 0 ? combinedExpenses : Math.max(0, totalRevenue * 0.15); // Default 15% expenses if no expenses recorded
      
      const profit = totalRevenue - totalExpenses;
      
      monthlyFinancialPerformance.push({
        month: monthName,
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit
      });
    }

    const stats: AcademyDashboardStats = {
      totalPlayers,
      activeTransfers,
      monthlyRevenue,
      recentTransfers,
      monthlyFinancialPerformance
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching academy dashboard stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch academy dashboard statistics' 
    });
  }
};