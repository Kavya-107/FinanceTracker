const db = require('../config/database');

const getReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month } = req.query; // Expected format: YYYY-MM
    
    console.log('Reports request - UserId:', userId, 'Month:', month);
    
    // Validate month parameter
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Expected format: YYYY-MM'
      });
    }

    // Check if there are any transactions for the specified month
    const [transactionCheck] = await db.execute(`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE user_id = ? AND DATE_FORMAT(dateToday, '%Y-%m') = ?
    `, [userId, month]);

    const hasTransactions = transactionCheck[0].count > 0;

    if (!hasTransactions) {
      return res.json({
        success: true,
        data: {
          totals: { income: 0, expense: 0 },
          expensesByCategory: [],
          monthlyData: { month: month, income: 0, expense: 0 },
          hasTransactions: false
        }
      });
    }

    // Get total income and expenses for the specified month
    const [monthlyTotals] = await db.execute(`
      SELECT 
        type1,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND DATE_FORMAT(dateToday, '%Y-%m') = ?
      GROUP BY type1
    `, [userId, month]);

    // Get expenses by category for the specified month
    const [expensesByCategory] = await db.execute(`
      SELECT 
        category,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND type1 = 'expense' AND DATE_FORMAT(dateToday, '%Y-%m') = ?
      GROUP BY category
      ORDER BY total DESC
    `, [userId, month]);

    // Format the monthly totals
    const formattedMonthlyData = {
      month: month,
      income: 0,
      expense: 0
    };

    monthlyTotals.forEach(item => {
      formattedMonthlyData[item.type1] = parseFloat(item.total);
    });

    // Format totals for backward compatibility
    const formattedTotals = {};
    monthlyTotals.forEach(item => {
      formattedTotals[item.type1] = parseFloat(item.total);
    });

    // Format expenses by category
    const formattedExpensesByCategory = expensesByCategory.map(item => ({
      category: item.category,
      amount: parseFloat(item.total)
    }));

    const responseData = {
      success: true,
      data: {
        totals: formattedTotals,
        expensesByCategory: formattedExpensesByCategory,
        monthlyData: formattedMonthlyData,
        hasTransactions: true
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports',
      error: error.message
    });
  }
};

const getWeeklyReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { week } = req.query; // Expected format: YYYY-MM-DD (Monday of the week)
    
    console.log('Weekly Reports request - UserId:', userId, 'Week:', week);
    
    // Validate week parameter
    if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid week format. Expected format: YYYY-MM-DD (Monday of the week)'
      });
    }

    // Calculate week end date (Sunday)
    const weekStart = new Date(week);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Check if there are any transactions for the specified week
    const [transactionCheck] = await db.execute(`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE user_id = ? AND dateToday BETWEEN ? AND ?
    `, [userId, week, weekEndStr]);

    const hasTransactions = transactionCheck[0].count > 0;

    if (!hasTransactions) {
      return res.json({
        success: true,
        data: {
          weekRange: { start: week, end: weekEndStr },
          totals: { income: 0, expense: 0 },
          expensesByCategory: [],
          dailyBreakdown: [],
          hasTransactions: false
        }
      });
    }

    // Get total income and expenses for the specified week
    const [weeklyTotals] = await db.execute(`
      SELECT 
        type1,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND dateToday BETWEEN ? AND ?
      GROUP BY type1
    `, [userId, week, weekEndStr]);

    // Get expenses by category for the specified week
    const [expensesByCategory] = await db.execute(`
      SELECT 
        category,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND type1 = 'expense' AND dateToday BETWEEN ? AND ?
      GROUP BY category
      ORDER BY total DESC
    `, [userId, week, weekEndStr]);

    // Get daily breakdown for the week
    const [dailyBreakdown] = await db.execute(`
      SELECT 
        dateToday,
        type1,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND dateToday BETWEEN ? AND ?
      GROUP BY dateToday, type1
      ORDER BY dateToday
    `, [userId, week, weekEndStr]);

    // Format weekly totals
    const formattedTotals = { income: 0, expense: 0 };
    weeklyTotals.forEach(item => {
      formattedTotals[item.type1] = parseFloat(item.total);
    });

    // Format expenses by category
    const formattedExpensesByCategory = expensesByCategory.map(item => ({
      category: item.category,
      amount: parseFloat(item.total)
    }));

    // Format daily breakdown
    const dailyBreakdownMap = {};
    dailyBreakdown.forEach(item => {
      if (!dailyBreakdownMap[item.dateToday]) {
        dailyBreakdownMap[item.dateToday] = { date: item.dateToday, income: 0, expense: 0 };
      }
      dailyBreakdownMap[item.dateToday][item.type1] = parseFloat(item.total);
    });

    const formattedDailyBreakdown = Object.values(dailyBreakdownMap);

    const responseData = {
      success: true,
      data: {
        weekRange: { start: week, end: weekEndStr },
        totals: formattedTotals,
        expensesByCategory: formattedExpensesByCategory,
        dailyBreakdown: formattedDailyBreakdown,
        hasTransactions: true
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching weekly reports',
      error: error.message
    });
  }
};

const getMonthlyReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year } = req.query; // Expected format: YYYY
    
    console.log('Monthly Reports request - UserId:', userId, 'Year:', year);
    
    // Validate year parameter
    if (!year || !/^\d{4}$/.test(year)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year format. Expected format: YYYY'
      });
    }

    // Get monthly breakdown for the specified year
    const [monthlyData] = await db.execute(`
      SELECT 
        DATE_FORMAT(dateToday, '%Y-%m') as month,
        type1,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND YEAR(dateToday) = ?
      GROUP BY DATE_FORMAT(dateToday, '%Y-%m'), type1
      ORDER BY month
    `, [userId, year]);

    // Get category breakdown for the year
    const [categoryData] = await db.execute(`
      SELECT 
        category,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND type1 = 'expense' AND YEAR(dateToday) = ?
      GROUP BY category
      ORDER BY total DESC
    `, [userId, year]);

    // Get year totals
    const [yearTotals] = await db.execute(`
      SELECT 
        type1,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND YEAR(dateToday) = ?
      GROUP BY type1
    `, [userId, year]);

    const hasTransactions = monthlyData.length > 0;

    if (!hasTransactions) {
      return res.json({
        success: true,
        data: {
          year: year,
          yearlyTotals: { income: 0, expense: 0 },
          monthlyBreakdown: [],
          categoryBreakdown: [],
          hasTransactions: false
        }
      });
    }

    // Format yearly totals
    const formattedYearlyTotals = { income: 0, expense: 0 };
    yearTotals.forEach(item => {
      formattedYearlyTotals[item.type1] = parseFloat(item.total);
    });

    // Format monthly breakdown
    const monthlyBreakdownMap = {};
    monthlyData.forEach(item => {
      if (!monthlyBreakdownMap[item.month]) {
        monthlyBreakdownMap[item.month] = { month: item.month, income: 0, expense: 0 };
      }
      monthlyBreakdownMap[item.month][item.type1] = parseFloat(item.total);
    });

    const formattedMonthlyBreakdown = Object.values(monthlyBreakdownMap);

    // Format category breakdown
    const formattedCategoryBreakdown = categoryData.map(item => ({
      category: item.category,
      amount: parseFloat(item.total)
    }));

    const responseData = {
      success: true,
      data: {
        year: year,
        yearlyTotals: formattedYearlyTotals,
        monthlyBreakdown: formattedMonthlyBreakdown,
        categoryBreakdown: formattedCategoryBreakdown,
        hasTransactions: true
      }
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching monthly reports:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching monthly reports',
      error: error.message
    });
  }
};

const getReportsOverview = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get total income and expenses for all time
    const [totals] = await db.execute(`
      SELECT 
        type1,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ?
      GROUP BY type1
    `, [userId]);

    // Get expenses by category for all time
    const [expensesByCategory] = await db.execute(`
      SELECT 
        category,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND type1 = 'expense'
      GROUP BY category
      ORDER BY total DESC
    `, [userId]);

    // Get monthly data for the last 6 months
    const [monthlyData] = await db.execute(`
      SELECT 
        DATE_FORMAT(dateToday, '%Y-%m') as month,
        type1,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND dateToday >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(dateToday, '%Y-%m'), type1
      ORDER BY month
    `, [userId]);

    // Format the response to match frontend expectations
    const formattedTotals = {};
    totals.forEach(item => {
      formattedTotals[item.type1] = parseFloat(item.total);
    });

    const formattedExpensesByCategory = expensesByCategory.map(item => ({
      category: item.category,
      amount: parseFloat(item.total)
    }));

    const formattedMonthlyData = monthlyData.map(item => ({
      month: item.month,
      type1: item.type1,
      amount: parseFloat(item.total)
    }));

    res.json({
      success: true,
      data: {
        totals: formattedTotals,
        expensesByCategory: formattedExpensesByCategory,
        monthlyData: formattedMonthlyData
      }
    });

  } catch (error) {
    console.error('Error fetching reports overview:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports overview',
      error: error.message
    });
  }
};

module.exports = { 
  getReports,
  getWeeklyReports,
  getMonthlyReports,
  getReportsOverview 
};