const db = require('../config/database');

const getReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month } = req.query; // Expected format: YYYY-MM
    
    console.log('Reports request - UserId:', userId, 'Month:', month); // Debug log
    
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
    console.log('Transaction count for month:', hasTransactions ? transactionCheck[0].count : 0); // Debug log

    if (!hasTransactions) {
      console.log('No transactions found for month:', month); // Debug log
      return res.json({
        success: true,
        data: {
          totals: {
            income: 0,
            expense: 0
          },
          expensesByCategory: [],
          monthlyData: {
            month: month,
            income: 0,
            expense: 0
          },
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

    console.log('Monthly totals:', monthlyTotals); // Debug log

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

    console.log('Expenses by category:', expensesByCategory); // Debug log

    // Format the monthly totals
    const formattedMonthlyData = {
      month: month,
      income: 0,
      expense: 0
    };

    monthlyTotals.forEach(item => {
      formattedMonthlyData[item.type1] = parseFloat(item.total);
    });

    // Format totals for backward compatibility (if needed elsewhere)
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

    console.log('Sending response:', responseData); // Debug log
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

// Alternative method to get reports for multiple months (if you want to keep the old functionality)
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
      type1: item.type1, // Keep as type1 for frontend
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
  getReportsOverview 
};