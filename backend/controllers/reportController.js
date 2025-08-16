const db = require('../config/database');

const getReports = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get total income and expenses
    const [totals] = await db.execute(`
      SELECT 
        type1,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ?
      GROUP BY type1
    `, [userId]);

    // Get expenses by category
    const [expensesByCategory] = await db.execute(`
      SELECT 
        category,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = ? AND type1 = 'expense'
      GROUP BY category
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

    res.json({
      totals: totals.reduce((acc, curr) => {
        acc[curr.type] = parseFloat(curr.total);
        return acc;
      }, {}),
      expensesByCategory: expensesByCategory.map(item => ({
        category: item.category,
        amount: parseFloat(item.total)
      })),
      monthlyData: monthlyData.map(item => ({
        month: item.month,
        type: item.type,
        amount: parseFloat(item.total)
      }))
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getReports };