import { RequestHandler, Router } from 'express';
import { query } from '../lib/db.js';

export interface DashboardStats {
  totalAcademies: number;
  activeSubscriptions: number;
  totalUsers: number;
  totalIndividualPlayers: number;
  monthlyGrowth: {
    academies: number;
    subscriptions: number;
    users: number;
  };
}

export interface AcademyWithSubscription {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: 'active' | 'trial' | 'expired';
  subscriptionType: 'basic' | 'standard' | 'premium';
  userCount: number;
  createdAt: string;
  phone?: string;
  address?: string;
  district?: string;
  province?: string;
}

export interface SubscriptionData {
  id: string;
  academyName: string;
  plan: 'basic' | 'standard' | 'premium';
  status: 'active' | 'trial' | 'expired';
  startDate: string;
  endDate: string;
  userCount: number;
  monthlyRevenue: number;
}

export interface NewAccount {
  id: string;
  name: string;
  location: string;
  registeredDate: string;
  status: 'active' | 'pending' | 'inactive';
  playersCount: number;
}

export interface NewAccountsStats {
  totalNewAccounts: number;
  thisWeek: number;
  thisMonth: number;
  growthRate: number;
}

export interface CountryDistribution {
  country: string;
  academyCount: number;
  percentage: number;
  flag?: string;
}

export interface CountryDistributionStats {
  totalCountries: number;
  topCountry: string;
  topCountryPercentage: number;
  totalAcademies: number;
}

export interface FinancialGrowthData {
  month: string;
  revenue: number;
  subscriptions: number;
  growth: number;
}

export interface FinancialGrowthStats {
  totalRevenue: number;
  monthlyGrowth: number;
  totalSubscriptions: number;
  averageRevenuePerSubscription: number;
}

export const handleGetDashboardStats: RequestHandler = async (req, res) => {
  try {
    // Get total academies count
    const academiesResult = await query('SELECT COUNT(*) as count FROM academies');
    const totalAcademies = parseInt(academiesResult.rows[0].count);

    // Get total players count from players table (Academy Players)
    let totalPlayers = 0;
    try {
      const playersResult = await query(`
        SELECT COUNT(*) as count 
        FROM players p
        JOIN academies a ON p.academy_id = a.id
        WHERE a.status = 'active'
      `);
      totalPlayers = parseInt(playersResult.rows[0].count) || 0;
    } catch (err) {
      console.log('Players table may not exist or query failed, using fallback calculation');
      totalPlayers = totalAcademies * 25; // Fallback: average 25 players per academy
    }

    // Get total Individual Players
    let totalIndividualPlayers = 0;
    try {
      console.log('Fetching total individual players count...');
      const indPlayersResult = await query('SELECT COUNT(*) as count FROM individual_players');
      totalIndividualPlayers = parseInt(indPlayersResult.rows[0].count) || 0;
      console.log(`Found ${totalIndividualPlayers} individual players`);
    } catch (err: any) {
      console.error('Individual players table query failed:', err.message);
    }

    // Get active transfers count (using transfers table)
    let activeTransfers = 0;
    try {
      const transfersResult = await query('SELECT COUNT(*) as count FROM transfers WHERE status IN ($1, $2)', ['pending', 'in_progress']);
      activeTransfers = parseInt(transfersResult.rows[0].count) || 0;
    } catch (err) {
      console.log('Transfers table may not exist, using calculated value');
      activeTransfers = Math.floor(totalAcademies * 0.3); // Fallback calculation
    }

    // Calculate monthly revenue from financial transactions and subscriptions
    let monthlyRevenue = 0;
    let subscriptionRevenue = 0;
    try {
      // Get revenue from financial transactions (e.g. transfers)
      const revenueResult = await query(`
        SELECT SUM(amount) as total FROM financial_transactions 
        WHERE created_at >= date_trunc('month', CURRENT_DATE) 
        AND status = 'completed'
      `);
      monthlyRevenue = parseFloat(revenueResult.rows[0].total) || 0;

      // Add revenue from subscription payments
      const subscriptionResult = await query(`
        SELECT SUM(amount) as total FROM subscription_payments
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
        AND status = 'COMPLETED'
      `);
      subscriptionRevenue = parseFloat(subscriptionResult.rows[0].total) || 0;

      // Add revenue from individual player purchases
      const playerPurchaseResult = await query(`
        SELECT SUM(amount) as total FROM player_purchases
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
        AND status = 'completed'
      `);
      const playerRevenue = parseFloat(playerPurchaseResult.rows[0].total) || 0;

      monthlyRevenue += subscriptionRevenue + playerRevenue;
    } catch (err) {
      console.log('Error calculating revenue:', err);
      // Fallback calculation if tables don't exist yet
      monthlyRevenue = 0;
    }

    // Calculate monthly growth (academies created in the last month vs previous month)
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 2, 1);

    const currentMonthAcademies = await query(
      'SELECT COUNT(*) as count FROM academies WHERE created_at >= $1',
      [lastMonth.toISOString()]
    );

    const previousMonthAcademies = await query(
      'SELECT COUNT(*) as count FROM academies WHERE created_at >= $1 AND created_at < $2',
      [twoMonthsAgo.toISOString(), lastMonth.toISOString()]
    );

    const currentMonthCount = parseInt(currentMonthAcademies.rows[0].count);
    const previousMonthCount = parseInt(previousMonthAcademies.rows[0].count);
    const academiesGrowth = previousMonthCount > 0 ? currentMonthCount - previousMonthCount : currentMonthCount;

    // Get recent system activity
    let recentActivity = [];
    try {
      const activityResult = await query(`
        SELECT 
          'registration' as type,
          a.name as name,
          a.created_at as timestamp
        FROM academies a
        WHERE a.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY a.created_at DESC
        LIMIT 5
      `);
      recentActivity = activityResult.rows;
    } catch (err) {
      console.log('Error fetching recent activity, using empty array');
    }

    // Calculate total revenue (lifetime)
    let totalRevenue = 0;
    let totalTransactions = 0;
    let pendingPayments = 0;
    let averageTransactionValue = 0;
    let revenueGrowth = 0;

    try {
      // Total revenue from financial transactions
      const totalTxRevenueResult = await query(`
        SELECT SUM(amount) as total, COUNT(*) as count FROM financial_transactions 
        WHERE status = 'completed'
      `);
      const txRevenue = parseFloat(totalTxRevenueResult.rows[0].total) || 0;
      const txCount = parseInt(totalTxRevenueResult.rows[0].count) || 0;

      // Total revenue from subscription payments
      const totalSubRevenueResult = await query(`
        SELECT SUM(amount) as total, COUNT(*) as count FROM subscription_payments
        WHERE status = 'COMPLETED'
      `);
      const subRevenue = parseFloat(totalSubRevenueResult.rows[0].total) || 0;
      const subCount = parseInt(totalSubRevenueResult.rows[0].count) || 0;

      // Total revenue from individual player purchases
      const totalPlayerRevenueResult = await query(`
        SELECT SUM(amount) as total, COUNT(*) as count FROM player_purchases
        WHERE status = 'completed'
      `);
      const playerRevenue = parseFloat(totalPlayerRevenueResult.rows[0].total) || 0;
      const playerCount = parseInt(totalPlayerRevenueResult.rows[0].count) || 0;

      totalRevenue = txRevenue + subRevenue + playerRevenue;
      totalTransactions = txCount + subCount + playerCount;
      averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Pending payments
      const pendingTxResult = await query(`
        SELECT COUNT(*) as count FROM financial_transactions WHERE status = 'pending'
      `);
      const pendingSubResult = await query(`
        SELECT COUNT(*) as count FROM subscription_payments WHERE status = 'PENDING'
      `);
      pendingPayments = (parseInt(pendingTxResult.rows[0].count) || 0) + (parseInt(pendingSubResult.rows[0].count) || 0);

      // Calculate revenue growth (this month vs last month)
      const lastMonthStart = new Date();
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      lastMonthStart.setHours(0, 0, 0, 0);

      const lastMonthEnd = new Date();
      lastMonthEnd.setDate(1);
      lastMonthEnd.setHours(0, 0, 0, 0);

      const lastMonthRevenueResult = await query(`
        SELECT 
          (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions 
           WHERE created_at >= $1 AND created_at < $2 AND status = 'completed') +
          (SELECT COALESCE(SUM(amount), 0) FROM subscription_payments 
           WHERE created_at >= $1 AND created_at < $2 AND status = 'COMPLETED') as total
      `, [lastMonthStart.toISOString(), lastMonthEnd.toISOString()]);

      const lastMonthRevenue = parseFloat(lastMonthRevenueResult.rows[0].total) || 0;

      if (lastMonthRevenue > 0) {
        revenueGrowth = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
      } else if (monthlyRevenue > 0) {
        revenueGrowth = 100;
      }
    } catch (err) {
      console.error('Error calculating financial stats:', err);
    }

    const stats = {
      totalAcademies,
      totalPlayers,
      totalIndividualPlayers,
      activeTransfers,
      monthlyRevenue,
      totalRevenue,
      totalTransactions,
      pendingPayments,
      averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      revenueBreakdown: {
        subscriptions: subscriptionRevenue,
        transactions: monthlyRevenue - subscriptionRevenue
      },
      monthlyGrowth: {
        academies: academiesGrowth,
        subscriptions: academiesGrowth, // Assuming 1:1 relationship for now
        players: academiesGrowth * 25 // Estimate based on average players per academy
      },
      recentActivity
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

export const handleGetAdminTransactions: RequestHandler = async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    // Fetch transactions from subscription_payments
    // In a real system, you might want to UNION this with financial_transactions
    const queryText = `
      SELECT 
        sp.id,
        a.name as academy_name,
        'subscription' as type,
        sp.amount,
        sp.payment_method,
        sp.created_at as date,
        sp.status
      FROM subscription_payments sp
      JOIN academy_subscriptions sub ON sp.subscription_id = sub.id
      JOIN academies a ON sub.academy_id = a.id
      ORDER BY sp.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await query(queryText, [limit, offset]);

    const transactions = result.rows.map(row => ({
      id: row.id,
      academy: row.academy_name,
      type: row.type,
      amount: parseFloat(row.amount),
      method: row.payment_method,
      date: row.date,
      status: row.status
    }));

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

export const handleGetAcademiesWithSubscriptions: RequestHandler = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        a.id,
        a.name,
        a.code,
        a.address,
        a.district,
        a.province,
        a.phone,
        a.created_at,
        a.updated_at,
        COUNT(su.id) as user_count
      FROM academies a
      LEFT JOIN staff_users su ON a.id = su.academy_id AND su.is_active = true
      GROUP BY a.id, a.name, a.code, a.address, a.district, a.province, a.phone, a.created_at, a.updated_at
      ORDER BY a.created_at DESC
    `);

    const academies: AcademyWithSubscription[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: '', // Email not stored in academies table, would need to get from admin user
      subscriptionStatus: 'active' as const,
      subscriptionType: 'basic' as const,
      userCount: parseInt(row.user_count) || 0,
      createdAt: row.created_at,
      phone: row.phone || '',
      address: row.address || '',
      district: row.district || '',
      province: row.province || ''
    }));

    res.json(academies);
  } catch (error) {
    console.error('Error fetching academies with subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch academies data' });
  }
};

export const handleGetSubscriptions: RequestHandler = async (req, res) => {
  try {
    // For now, we'll generate subscription data based on academies
    // In a real implementation, you'd have a separate subscriptions table
    const result = await query(`
      SELECT 
        a.id,
        a.name,
        a.created_at,
        COUNT(su.id) as user_count
      FROM academies a
      LEFT JOIN staff_users su ON a.id = su.academy_id AND su.is_active = true
      GROUP BY a.id, a.name, a.created_at
      ORDER BY a.created_at DESC
    `);

    const subscriptions: SubscriptionData[] = result.rows.map(row => ({
      id: row.id,
      academyName: row.name,
      plan: 'basic' as const,
      status: 'active' as const,
      startDate: row.created_at,
      endDate: new Date(new Date(row.created_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from start
      userCount: parseInt(row.user_count) || 0,
      monthlyRevenue: 99 // Fixed monthly revenue for basic plan
    }));

    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions data' });
  }
};

export const handleGetNewAccounts: RequestHandler = async (req, res) => {
  try {
    // Get academies registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await query(`
      SELECT 
        a.id,
        a.name,
        COALESCE(a.district || ', ' || a.province, a.address, 'Location not specified') as location,
        a.created_at as registered_date,
        a.status,
        COUNT(p.id) as players_count
      FROM academies a
      LEFT JOIN players p ON a.id = p.academy_id
      WHERE a.created_at >= $1
      GROUP BY a.id, a.name, a.district, a.province, a.address, a.created_at, a.status
      ORDER BY a.created_at DESC
    `, [thirtyDaysAgo.toISOString()]);

    // Get stats for the last week and month
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weekResult = await query(`
      SELECT COUNT(*) as count
      FROM academies
      WHERE created_at >= $1
    `, [oneWeekAgo.toISOString()]);

    const monthResult = await query(`
      SELECT COUNT(*) as count
      FROM academies
      WHERE created_at >= $1
    `, [thirtyDaysAgo.toISOString()]);

    // Calculate growth rate (comparing this month to previous month)
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    const previousMonthResult = await query(`
      SELECT COUNT(*) as count
      FROM academies
      WHERE created_at >= $1 AND created_at < $2
    `, [twoMonthsAgo.toISOString(), thirtyDaysAgo.toISOString()]);

    const thisMonthCount = parseInt(monthResult.rows[0].count);
    const previousMonthCount = parseInt(previousMonthResult.rows[0].count);
    const growthRate = previousMonthCount > 0
      ? ((thisMonthCount - previousMonthCount) / previousMonthCount) * 100
      : thisMonthCount > 0 ? 100 : 0;

    const newAccounts: NewAccount[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      location: row.location,
      registeredDate: row.registered_date,
      status: row.status,
      playersCount: parseInt(row.players_count) || 0
    }));

    const stats: NewAccountsStats = {
      totalNewAccounts: thisMonthCount,
      thisWeek: parseInt(weekResult.rows[0].count),
      thisMonth: thisMonthCount,
      growthRate: Math.round(growthRate * 10) / 10 // Round to 1 decimal place
    };

    res.json({
      accounts: newAccounts,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching new accounts:', error);
    res.status(500).json({ error: 'Failed to fetch new accounts data' });
  }
};

export const handleGetCountryDistribution: RequestHandler = async (req, res) => {
  try {
    // Get academy distribution by country
    const countryQuery = `
      SELECT 
        COALESCE(NULLIF(TRIM(province), ''), 'Unknown') as country,
        COUNT(*) as academy_count
      FROM academies 
      WHERE status = 'active'
      GROUP BY COALESCE(NULLIF(TRIM(province), ''), 'Unknown')
      ORDER BY academy_count DESC
    `;

    const result = await query(countryQuery);
    const totalAcademies = result.rows.reduce((sum, row) => sum + parseInt(row.academy_count), 0);

    // Country flags mapping (basic set)
    const countryFlags: { [key: string]: string } = {
      'Zambia': '🇿🇲',
      'South Africa': '🇿🇦',
      'Kenya': '🇰🇪',
      'Nigeria': '🇳🇬',
      'Ghana': '🇬🇭',
      'Tanzania': '🇹🇿',
      'Uganda': '🇺🇬',
      'Zimbabwe': '🇿🇼',
      'Botswana': '🇧🇼',
      'Malawi': '🇲🇼',
      'Unknown': '🌍'
    };

    const countryDistribution: CountryDistribution[] = result.rows.map(row => {
      const academyCount = parseInt(row.academy_count);
      const percentage = totalAcademies > 0 ? Math.round((academyCount / totalAcademies) * 100 * 10) / 10 : 0;

      return {
        country: row.country,
        academyCount: academyCount,
        percentage: percentage,
        flag: countryFlags[row.country] || '🌍'
      };
    });

    // Calculate stats
    const topCountry = countryDistribution.length > 0 ? countryDistribution[0] : null;
    const stats: CountryDistributionStats = {
      totalCountries: countryDistribution.length,
      topCountry: topCountry ? topCountry.country : 'N/A',
      topCountryPercentage: topCountry ? topCountry.percentage : 0,
      totalAcademies: totalAcademies
    };

    res.json({
      countries: countryDistribution,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching country distribution:', error);
    res.status(500).json({ error: 'Failed to fetch country distribution data' });
  }
};

export const handleGetFinancialGrowth: RequestHandler = async (req, res) => {
  try {
    // Get financial data from subscription payments over the last 12 months
    const financialQuery = `
      WITH monthly_data AS (
        SELECT 
          DATE_TRUNC('month', sp.created_at) as month,
          COUNT(DISTINCT asub.id) as subscription_count,
          COALESCE(SUM(sp.amount), 0) as monthly_revenue
        FROM subscription_payments sp
        JOIN academy_subscriptions asub ON sp.subscription_id = asub.id
        WHERE sp.created_at >= NOW() - INTERVAL '12 months'
          AND sp.status = 'COMPLETED'
        GROUP BY DATE_TRUNC('month', sp.created_at)
      ),
      growth_calculation AS (
        SELECT 
          month,
          subscription_count,
          monthly_revenue,
          LAG(monthly_revenue) OVER (ORDER BY month) as prev_revenue
        FROM monthly_data
      )
      SELECT 
        month as raw_date,
        TO_CHAR(month, 'Mon YYYY') as month_label,
        monthly_revenue as revenue,
        subscription_count as subscriptions,
        CASE 
          WHEN prev_revenue > 0 THEN 
            ROUND(((monthly_revenue - prev_revenue) / prev_revenue * 100)::numeric, 1)
          ELSE 0 
        END as growth
      FROM growth_calculation
      ORDER BY raw_date;
    `;

    const result = await query(financialQuery);

    // If no real data, provide mock data for development
    let financialData: FinancialGrowthData[];

    if (result.rows.length === 0) {
      // Mock data for development
      const months = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024'];
      financialData = months.map((month, index) => ({
        month,
        revenue: 1500 + (index * 200) + Math.random() * 300,
        subscriptions: 15 + (index * 2) + Math.floor(Math.random() * 5),
        growth: index === 0 ? 0 : 5 + Math.random() * 10
      }));
    } else {
      financialData = result.rows.map(row => ({
        month: row.month_label,
        revenue: parseFloat(row.revenue) || 0,
        subscriptions: parseInt(row.subscriptions) || 0,
        growth: parseFloat(row.growth) || 0
      }));

      // If we only have 1 data point, add a previous month with 0 values to make the chart look better
      if (financialData.length === 1) {
        const currentDate = new Date(result.rows[0].raw_date);
        const prevDate = new Date(currentDate);
        prevDate.setMonth(prevDate.getMonth() - 1);

        const prevMonthLabel = prevDate.toLocaleString('default', { month: 'short', year: 'numeric' });

        financialData.unshift({
          month: prevMonthLabel,
          revenue: 0,
          subscriptions: 0,
          growth: 0
        });
      }
    }

    // Calculate statistics
    const totalRevenue = financialData.reduce((sum, data) => sum + data.revenue, 0);
    const totalSubscriptions = financialData.reduce((sum, data) => sum + data.subscriptions, 0);
    const averageGrowth = financialData.length > 1
      ? financialData.slice(1).reduce((sum, data) => sum + data.growth, 0) / (financialData.length - 1)
      : 0;
    const averageRevenuePerSubscription = totalSubscriptions > 0 ? totalRevenue / totalSubscriptions : 0;

    const stats: FinancialGrowthStats = {
      totalRevenue: Math.round(totalRevenue),
      monthlyGrowth: Math.round(averageGrowth * 10) / 10,
      totalSubscriptions: totalSubscriptions,
      averageRevenuePerSubscription: Math.round(averageRevenuePerSubscription * 100) / 100
    };

    res.json({
      data: financialData,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching financial growth:', error);
    res.status(500).json({ error: 'Failed to fetch financial growth data' });
  }
};

// Create router and define routes
const router = Router();
router.get('/stats', handleGetDashboardStats);
router.get('/new-accounts', handleGetNewAccounts);
router.get('/country-distribution', handleGetCountryDistribution);
router.get('/financial-growth', handleGetFinancialGrowth);
router.get('/transactions', handleGetAdminTransactions);

export default router;