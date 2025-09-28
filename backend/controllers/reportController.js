const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

const getReports = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month } = req.query;
    
    console.log('Reports request - UserId:', userId, 'Month:', month);
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month format. Expected format: YYYY-MM'
      });
    }

    const [year, monthNum] = month.split('-');
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    const transactionCount = await Transaction.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate }
    });

    const hasTransactions = transactionCount > 0;

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

    const monthlyTotals = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const expensesByCategory = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    const formattedMonthlyData = {
      month: month,
      income: 0,
      expense: 0
    };

    const formattedTotals = { income: 0, expense: 0 };
    monthlyTotals.forEach(item => {
      formattedMonthlyData[item._id] = item.total;
      formattedTotals[item._id] = item.total;
    });

    const formattedExpensesByCategory = expensesByCategory.map(item => ({
      category: item._id,
      amount: item.total
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
    const { week } = req.query;
    
    console.log('Weekly Reports request - UserId:', userId, 'Week:', week);
    
    if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid week format. Expected format: YYYY-MM-DD (Monday of the week)'
      });
    }

    const weekStart = new Date(week);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const transactionCount = await Transaction.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: weekStart, $lte: weekEnd }
    });

    const hasTransactions = transactionCount > 0;

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

    const weeklyTotals = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: weekStart, $lte: weekEnd }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const expensesByCategory = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: weekStart, $lte: weekEnd }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    const dailyBreakdown = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: weekStart, $lte: weekEnd }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);

    const formattedTotals = { income: 0, expense: 0 };
    weeklyTotals.forEach(item => {
      formattedTotals[item._id] = item.total;
    });

    const formattedExpensesByCategory = expensesByCategory.map(item => ({
      category: item._id,
      amount: item.total
    }));

    const dailyBreakdownMap = {};
    dailyBreakdown.forEach(item => {
      const date = item._id.date;
      if (!dailyBreakdownMap[date]) {
        dailyBreakdownMap[date] = { date: date, income: 0, expense: 0 };
      }
      dailyBreakdownMap[date][item._id.type] = item.total;
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
    const { year } = req.query;
    
    console.log('Monthly Reports request - UserId:', userId, 'Year:', year);
    
    if (!year || !/^\d{4}$/.test(year)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year format. Expected format: YYYY'
      });
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$date" } },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.month': 1 }
      }
    ]);

    const categoryData = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    const yearTotals = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

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

    const formattedYearlyTotals = { income: 0, expense: 0 };
    yearTotals.forEach(item => {
      formattedYearlyTotals[item._id] = item.total;
    });

    const monthlyBreakdownMap = {};
    monthlyData.forEach(item => {
      const month = item._id.month;
      if (!monthlyBreakdownMap[month]) {
        monthlyBreakdownMap[month] = { month: month, income: 0, expense: 0 };
      }
      monthlyBreakdownMap[month][item._id.type] = item.total;
    });

    const formattedMonthlyBreakdown = Object.values(monthlyBreakdownMap);

    const formattedCategoryBreakdown = categoryData.map(item => ({
      category: item._id,
      amount: item.total
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
    
    const totals = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId)
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const expensesByCategory = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense'
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$date" } },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.month': 1 }
      }
    ]);

    const formattedTotals = { income: 0, expense: 0 };
    totals.forEach(item => {
      formattedTotals[item._id] = item.total;
    });

    const formattedExpensesByCategory = expensesByCategory.map(item => ({
      category: item._id,
      amount: item.total
    }));

    const formattedMonthlyData = monthlyData.map(item => ({
      month: item._id.month,
      type1: item._id.type,
      amount: item.total
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