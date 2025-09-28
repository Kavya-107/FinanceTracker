import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, PieChart, BarChart3, Download, AlertTriangle, TrendingDown } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Helper functions for date formatting
const dateUtils = {
  // Get current month in YYYY-MM format
  getCurrentMonth: () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  // Get current year in YYYY format
  getCurrentYear: () => {
    return new Date().getFullYear().toString();
  },

  // Get Monday of current week in YYYY-MM-DD format
  getCurrentWeekMonday: () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  },

  // Validate and format month (YYYY-MM)
  formatMonth: (dateString) => {
    if (!dateString) return dateUtils.getCurrentMonth();
    
    // If it's already in YYYY-MM format
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // If it's a Date object or timestamp
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    return dateUtils.getCurrentMonth();
  },

  // Validate and format year (YYYY)
  formatYear: (dateString) => {
    if (!dateString) return dateUtils.getCurrentYear();
    
    // If it's already in YYYY format
    if (/^\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    // If it's a Date object or other format
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.getFullYear().toString();
    }
    
    return dateUtils.getCurrentYear();
  },

  // Validate and format week (YYYY-MM-DD of Monday)
  formatWeek: (dateString) => {
    if (!dateString) return dateUtils.getCurrentWeekMonday();
    
    // If it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return dateString;
      }
    }
    
    // If it's a Date object
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      return monday.toISOString().split('T')[0];
    }
    
    return dateUtils.getCurrentWeekMonday();
  }
};

// Updated API service with better error handling and proper formatting
const reportsAPI = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',

  getAuthHeaders: () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  },

  fetchWithAuth: async (endpoint) => {
    try {
      const fullUrl = `${reportsAPI.baseURL}${endpoint}`;
      console.log('Fetching from:', fullUrl);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: reportsAPI.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        } else if (response.status === 404) {
          throw new Error('Reports endpoint not found.');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Get transactions and process them for reports
  getReports: async (month) => {
    const formattedMonth = dateUtils.formatMonth(month);
    
    try {
      // First, get all transactions
      const response = await reportsAPI.fetchWithAuth('/api/transactions');
      const transactions = response.data || [];
      
      // Filter transactions for the specific month
      const monthTransactions = transactions.filter(transaction => {
        const transactionMonth = transaction.date.substring(0, 7); // YYYY-MM
        return transactionMonth === formattedMonth;
      });

      if (monthTransactions.length === 0) {
        return {
          success: true,
          data: {
            hasTransactions: false,
            totals: { income: 0, expense: 0 },
            monthlyData: { income: 0, expense: 0 },
            expensesByCategory: [],
            dailyBreakdown: []
          }
        };
      }

      // Process the data
      const totals = monthTransactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          acc.expense += transaction.amount;
        }
        return acc;
      }, { income: 0, expense: 0 });

      // Group expenses by category
      const expensesByCategory = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, transaction) => {
          const existing = acc.find(item => item.category === transaction.category);
          if (existing) {
            existing.amount += transaction.amount;
          } else {
            acc.push({ category: transaction.category, amount: transaction.amount });
          }
          return acc;
        }, [])
        .sort((a, b) => b.amount - a.amount);

      // Daily breakdown
      const dailyBreakdown = monthTransactions.reduce((acc, transaction) => {
        const date = transaction.date.split('T')[0]; // Get YYYY-MM-DD
        const existing = acc.find(item => item.date === date);
        if (existing) {
          if (transaction.type === 'income') {
            existing.income += transaction.amount;
          } else {
            existing.expense += transaction.amount;
          }
        } else {
          acc.push({
            date,
            income: transaction.type === 'income' ? transaction.amount : 0,
            expense: transaction.type === 'expense' ? transaction.amount : 0
          });
        }
        return acc;
      }, [])
      .sort((a, b) => a.date.localeCompare(b.date));

      return {
        success: true,
        data: {
          hasTransactions: true,
          totals,
          monthlyData: totals,
          expensesByCategory,
          dailyBreakdown
        }
      };

    } catch (error) {
      console.error('Error fetching monthly reports:', error);
      throw error;
    }
  },

  // Weekly reports
  getWeeklyReports: async (weekStart) => {
    const formattedWeek = dateUtils.formatWeek(weekStart);
    
    try {
      const response = await reportsAPI.fetchWithAuth('/api/transactions');
      const transactions = response.data || [];
      
      // Calculate week end date
      const startDate = new Date(formattedWeek);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      // Filter transactions for the specific week
      const weekTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date.split('T')[0]);
        return transactionDate >= startDate && transactionDate <= endDate;
      });

      if (weekTransactions.length === 0) {
        return {
          success: true,
          data: {
            hasTransactions: false,
            totals: { income: 0, expense: 0 },
            expensesByCategory: [],
            dailyBreakdown: []
          }
        };
      }

      // Process weekly data similar to monthly
      const totals = weekTransactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          acc.expense += transaction.amount;
        }
        return acc;
      }, { income: 0, expense: 0 });

      const expensesByCategory = weekTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, transaction) => {
          const existing = acc.find(item => item.category === transaction.category);
          if (existing) {
            existing.amount += transaction.amount;
          } else {
            acc.push({ category: transaction.category, amount: transaction.amount });
          }
          return acc;
        }, [])
        .sort((a, b) => b.amount - a.amount);

      const dailyBreakdown = weekTransactions.reduce((acc, transaction) => {
        const date = transaction.date.split('T')[0];
        const existing = acc.find(item => item.date === date);
        if (existing) {
          if (transaction.type === 'income') {
            existing.income += transaction.amount;
          } else {
            existing.expense += transaction.amount;
          }
        } else {
          acc.push({
            date,
            income: transaction.type === 'income' ? transaction.amount : 0,
            expense: transaction.type === 'expense' ? transaction.amount : 0
          });
        }
        return acc;
      }, [])
      .sort((a, b) => a.date.localeCompare(b.date));

      return {
        success: true,
        data: {
          hasTransactions: true,
          totals,
          expensesByCategory,
          dailyBreakdown
        }
      };

    } catch (error) {
      console.error('Error fetching weekly reports:', error);
      throw error;
    }
  },

  // Yearly reports
  getMonthlyReports: async (year) => {
    const formattedYear = dateUtils.formatYear(year);
    
    try {
      const response = await reportsAPI.fetchWithAuth('/api/transactions');
      const transactions = response.data || [];
      
      // Filter transactions for the specific year
      const yearTransactions = transactions.filter(transaction => {
        const transactionYear = transaction.date.substring(0, 4);
        return transactionYear === formattedYear;
      });

      if (yearTransactions.length === 0) {
        return {
          success: true,
          data: {
            hasTransactions: false,
            yearlyTotals: { income: 0, expense: 0 },
            categoryBreakdown: [],
            monthlyBreakdown: []
          }
        };
      }

      // Process yearly data
      const yearlyTotals = yearTransactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          acc.expense += transaction.amount;
        }
        return acc;
      }, { income: 0, expense: 0 });

      const categoryBreakdown = yearTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, transaction) => {
          const existing = acc.find(item => item.category === transaction.category);
          if (existing) {
            existing.amount += transaction.amount;
          } else {
            acc.push({ category: transaction.category, amount: transaction.amount });
          }
          return acc;
        }, [])
        .sort((a, b) => b.amount - a.amount);

      // Monthly breakdown for the year
      const monthlyBreakdown = yearTransactions.reduce((acc, transaction) => {
        const month = transaction.date.substring(0, 7); // YYYY-MM
        const existing = acc.find(item => item.month === month);
        if (existing) {
          if (transaction.type === 'income') {
            existing.income += transaction.amount;
          } else {
            existing.expense += transaction.amount;
          }
        } else {
          acc.push({
            month,
            income: transaction.type === 'income' ? transaction.amount : 0,
            expense: transaction.type === 'expense' ? transaction.amount : 0
          });
        }
        return acc;
      }, [])
      .sort((a, b) => a.month.localeCompare(b.month));

      return {
        success: true,
        data: {
          hasTransactions: true,
          yearlyTotals,
          categoryBreakdown,
          monthlyBreakdown
        }
      };

    } catch (error) {
      console.error('Error fetching yearly reports:', error);
      throw error;
    }
  },

  getOverviewReports: async () => {
    try {
      const response = await reportsAPI.fetchWithAuth('/api/transactions');
      const transactions = response.data || [];
      
      if (transactions.length === 0) {
        return {
          success: true,
          data: {
            hasTransactions: false,
            totals: { income: 0, expense: 0 }
          }
        };
      }

      const totals = transactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          acc.expense += transaction.amount;
        }
        return acc;
      }, { income: 0, expense: 0 });

      return {
        success: true,
        data: {
          hasTransactions: true,
          totals
        }
      };

    } catch (error) {
      console.error('Error fetching overview reports:', error);
      throw error;
    }
  }
};

// Helper function to get Monday of a given date
const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

// Download functionality
const downloadUtils = {
  downloadAsJSON: (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  downloadAsCSV: (data, filename) => {
    let csv = '';
    
    // Add summary data
    csv += 'Financial Report Summary\n';
    csv += 'Period,Income,Expenses,Balance\n';
    csv += `"${data.period || filename}","${data.income || 0}","${data.expenses || 0}","${(data.income || 0) - (data.expenses || 0)}"\n\n`;
    
    // Add category breakdown if available
    if (data.categories && data.categories.length > 0) {
      csv += 'Category Breakdown\n';
      csv += 'Category,Amount\n';
      data.categories.forEach(cat => {
        csv += `"${cat.category}","${cat.amount}"\n`;
      });
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

const Reports = () => {
  const [reportType, setReportType] = useState('monthly');
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [reportData, setReportData] = useState(null);
  const [previousPeriodData, setPreviousPeriodData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize currentPeriod based on report type with proper formatting
  useEffect(() => {
    const now = new Date();
    if (reportType === 'weekly') {
      setCurrentPeriod(dateUtils.getCurrentWeekMonday());
    } else if (reportType === 'yearly') {
      setCurrentPeriod(dateUtils.getCurrentYear());
    } else {
      setCurrentPeriod(dateUtils.getCurrentMonth());
    }
  }, [reportType]);

  useEffect(() => {
    if (currentPeriod && currentPeriod.length > 0) {
      fetchReports();
      fetchPreviousPeriodData();
    }
  }, [currentPeriod, reportType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let apiResponse;
      if (reportType === 'weekly') {
        apiResponse = await reportsAPI.getWeeklyReports(currentPeriod);
      } else if (reportType === 'yearly') {
        apiResponse = await reportsAPI.getMonthlyReports(currentPeriod);
      } else {
        apiResponse = await reportsAPI.getReports(currentPeriod);
      }
      
      if (apiResponse) {
        setReportData(apiResponse.data || apiResponse);
      }
      
    } catch (error) {
      console.error('Fetch reports error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousPeriodData = async () => {
    try {
      let response;
      
      if (reportType === 'weekly') {
        const currentDate = new Date(currentPeriod);
        const prevWeek = new Date(currentDate);
        prevWeek.setDate(currentDate.getDate() - 7);
        const previousPeriod = prevWeek.toISOString().split('T')[0];
        response = await reportsAPI.getWeeklyReports(previousPeriod);
      } else if (reportType === 'yearly') {
        const prevYear = (parseInt(currentPeriod) - 1).toString();
        response = await reportsAPI.getMonthlyReports(prevYear);
      } else {
        const [year, month] = currentPeriod.split('-').map(Number);
        const prevDate = new Date(year, month - 2); // month - 2 because months are 0-indexed
        const previousPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        response = await reportsAPI.getReports(previousPeriod);
      }
      
      if (response && response.success !== false) {
        setPreviousPeriodData(response.data || response);
      } else {
        setPreviousPeriodData(null);
      }
    } catch (error) {
      console.log('Could not fetch previous period data:', error.message);
      setPreviousPeriodData(null);
    }
  };

  // Smart insights generation
  const generateInsights = () => {
    if (!reportData || !reportData.hasTransactions) return [];
    
    const insights = [];
    const totals = getTotals();
    const expenseCategories = reportType === 'yearly' 
      ? reportData.categoryBreakdown 
      : reportData.expensesByCategory;

    // Top spending category
    if (expenseCategories && expenseCategories.length > 0) {
      const topCategory = expenseCategories[0];
      const totalExpenses = totals.expense;
      if (totalExpenses > 0) {
        const percentage = ((topCategory.amount / totalExpenses) * 100).toFixed(1);
        
        insights.push({
          type: 'warning',
          title: 'Highest Spending Category',
          message: `${topCategory.category} accounts for ${percentage}% of your total expenses (${formatCurrency(topCategory.amount)}).`,
          suggestion: percentage > 40 ? 'Consider reviewing and reducing expenses in this category.' : 'This seems reasonable for your spending pattern.'
        });
      }
    }

    // Comparison with previous period
    if (previousPeriodData && previousPeriodData.hasTransactions) {
      const prevTotals = getPreviousTotals();
      const expenseChange = totals.expense - prevTotals.expense;
      const expenseChangePercent = prevTotals.expense > 0 ? ((expenseChange / prevTotals.expense) * 100).toFixed(1) : 0;
      
      if (Math.abs(expenseChangePercent) > 10) {
        const period = reportType === 'weekly' ? 'week' : reportType === 'yearly' ? 'year' : 'month';
        insights.push({
          type: expenseChange > 0 ? 'warning' : 'success',
          title: `Spending ${expenseChange > 0 ? 'Increased' : 'Decreased'}`,
          message: `Your expenses ${expenseChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(expenseChangePercent)}% compared to last ${period} (${expenseChange > 0 ? '+' : ''}${formatCurrency(expenseChange)}).`,
          suggestion: expenseChange > 0 ? 'Consider reviewing your recent purchases to identify areas for cost reduction.' : 'Great job on reducing your expenses!'
        });
      }
    }

    // Budget health check
    const savings = totals.income - totals.expense;
    const savingsRate = totals.income > 0 ? ((savings / totals.income) * 100).toFixed(1) : 0;
    
    if (savings < 0) {
      insights.push({
        type: 'danger',
        title: 'Spending Exceeds Income',
        message: `You spent ${formatCurrency(Math.abs(savings))} more than your income this period.`,
        suggestion: 'Review your expenses and consider creating a budget to avoid overspending.'
      });
    } else if (savingsRate < 10) {
      insights.push({
        type: 'warning',
        title: 'Low Savings Rate',
        message: `You saved only ${savingsRate}% of your income this period.`,
        suggestion: 'Consider increasing your savings rate to at least 20% for better financial health.'
      });
    } else if (savingsRate > 30) {
      insights.push({
        type: 'success',
        title: 'Excellent Savings Rate',
        message: `You saved ${savingsRate}% of your income this period.`,
        suggestion: 'Great financial discipline! Consider investing your savings for long-term growth.'
      });
    }

    return insights;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPeriodDisplay = () => {
    if (reportType === 'weekly' && currentPeriod) {
      const startDate = new Date(currentPeriod);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (reportType === 'yearly') {
      return currentPeriod;
    } else if (currentPeriod) {
      const date = new Date(currentPeriod + '-01');
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
    return 'Loading...';
  };

  const navigatePeriod = (direction) => {
    if (!currentPeriod) return;
    
    try {
      if (reportType === 'weekly') {
        const currentDate = new Date(currentPeriod);
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction === 'prev' ? -7 : 7));
        setCurrentPeriod(dateUtils.formatWeek(newDate));
      } else if (reportType === 'yearly') {
        const year = parseInt(currentPeriod);
        setCurrentPeriod((year + (direction === 'prev' ? -1 : 1)).toString());
      } else {
        const [year, month] = currentPeriod.split('-').map(Number);
        const currentDate = new Date(year, month - 1);
        currentDate.setMonth(currentDate.getMonth() + (direction === 'prev' ? -1 : 1));
        setCurrentPeriod(dateUtils.formatMonth(currentDate));
      }
    } catch (error) {
      console.error('Error navigating period:', error);
      setError('Error navigating to selected period. Please try again.');
    }
  };

  const canNavigateNext = () => {
    if (!currentPeriod) return false;
    
    const today = new Date();
    if (reportType === 'weekly') {
      const currentWeek = new Date(currentPeriod);
      return currentWeek < today;
    } else if (reportType === 'yearly') {
      const currentYear = parseInt(currentPeriod);
      return currentYear < today.getFullYear();
    } else {
      const [year, month] = currentPeriod.split('-').map(Number);
      const currentDate = new Date(year, month - 1);
      const todayMonth = new Date(today.getFullYear(), today.getMonth());
      return currentDate < todayMonth;
    }
  };

  // Download handlers
  const handleDownload = (format) => {
    if (!reportData) return;
    
    const totals = getTotals();
    const filename = `${reportType}-report-${currentPeriod}.${format}`;
    
    const downloadData = {
      period: formatPeriodDisplay(),
      type: reportType,
      income: totals.income,
      expenses: totals.expense,
      balance: totals.income - totals.expense,
      categories: reportType === 'yearly' 
        ? reportData.categoryBreakdown 
        : reportData.expensesByCategory,
      generatedAt: new Date().toISOString()
    };

    if (format === 'json') {
      downloadUtils.downloadAsJSON(downloadData, filename);
    } else if (format === 'csv') {
      downloadUtils.downloadAsCSV(downloadData, filename);
    }
  };

  // Chart data preparation
  const getMainChartData = () => {
    if (!reportData) return null;

    if (reportType === 'weekly') {
      if (reportData.dailyBreakdown?.length > 0) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weekData = new Array(7).fill(0).map((_, index) => {
          const date = new Date(currentPeriod);
          date.setDate(date.getDate() + index);
          const dateStr = date.toISOString().split('T')[0];
          const dayData = reportData.dailyBreakdown.find(d => d.date === dateStr);
          return {
            day: days[index],
            income: dayData?.income || 0,
            expense: dayData?.expense || 0
          };
        });

        return {
          labels: weekData.map(d => d.day),
          datasets: [
            {
              label: 'Income',
              data: weekData.map(d => d.income),
              backgroundColor: '#22c55e',
              borderColor: '#16a34a',
              borderWidth: 1
            },
            {
              label: 'Expenses',
              data: weekData.map(d => d.expense),
              backgroundColor: '#f97316',
              borderColor: '#ea580c',
              borderWidth: 1
            }
          ]
        };
      }
    } else if (reportType === 'yearly') {
      if (reportData.monthlyBreakdown?.length > 0) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const yearData = new Array(12).fill(0).map((_, index) => {
          const monthStr = `${currentPeriod}-${String(index + 1).padStart(2, '0')}`;
          const monthData = reportData.monthlyBreakdown.find(m => m.month === monthStr);
          return {
            month: months[index],
            income: monthData?.income || 0,
            expense: monthData?.expense || 0
          };
        });

        return {
          labels: yearData.map(d => d.month),
          datasets: [
            {
              label: 'Income',
              data: yearData.map(d => d.income),
              backgroundColor: '#22c55e',
              borderColor: '#16a34a',
              borderWidth: 1
            },
            {
              label: 'Expenses',
              data: yearData.map(d => d.expense),
              backgroundColor: '#f97316',
              borderColor: '#ea580c',
              borderWidth: 1
            }
          ]
        };
      }
    } else {
      return {
        labels: [formatPeriodDisplay()],
        datasets: [
          {
            label: 'Income',
            data: [reportData.monthlyData?.income || reportData.totals?.income || 0],
            backgroundColor: '#22c55e',
            borderColor: '#16a34a',
            borderWidth: 1
          },
          {
            label: 'Expenses',
            data: [reportData.monthlyData?.expense || reportData.totals?.expense || 0],
            backgroundColor: '#f97316',
            borderColor: '#ea580c',
            borderWidth: 1
          }
        ]
      };
    }
    return null;
  };

  const getPieData = () => {
    if (!reportData) return null;
    
    const expenseData = reportType === 'yearly' 
      ? reportData.categoryBreakdown 
      : reportData.expensesByCategory;
      
    if (!expenseData?.length) return null;

    return {
      labels: expenseData.map(item => item.category),
      datasets: [
        {
          data: expenseData.map(item => item.amount),
          backgroundColor: [
            '#0ea5e9', '#22c55e', '#f97316', '#8b5cf6',
            '#f59e0b', '#ef4444', '#10b981', '#3b82f6'
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    };
  };

  // Get totals for summary cards
  const getTotals = () => {
    if (!reportData) return { income: 0, expense: 0 };
    
    if (reportType === 'yearly') {
      return reportData.yearlyTotals || { income: 0, expense: 0 };
    } else if (reportType === 'weekly') {
      return reportData.totals || { income: 0, expense: 0 };
    } else {
      // Monthly - handle both possible response formats
      return reportData.totals || {
        income: reportData.monthlyData?.income || 0,
        expense: reportData.monthlyData?.expense || 0
      };
    }
  };

  const getPreviousTotals = () => {
    if (!previousPeriodData) return { income: 0, expense: 0 };
    
    if (reportType === 'yearly') {
      return previousPeriodData.yearlyTotals || { income: 0, expense: 0 };
    } else if (reportType === 'weekly') {
      return previousPeriodData.totals || { income: 0, expense: 0 };
    } else {
      return previousPeriodData.totals || {
        income: previousPeriodData.monthlyData?.income || 0,
        expense: previousPeriodData.monthlyData?.expense || 0
      };
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${reportType === 'weekly' ? 'Daily Breakdown' : reportType === 'yearly' ? 'Monthly Breakdown' : 'Income vs Expenses'} - ${formatPeriodDisplay()}`,
        font: { size: 16 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '₹' + value.toLocaleString();
          }
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: `Expenses by Category - ${formatPeriodDisplay()}`,
        font: { size: 16 }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.label + ': ' + formatCurrency(context.parsed);
          }
        }
      }
    }
  };

  const insights = generateInsights();

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Financial Reports</h1>
        </div>
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ 
            height: '60px', 
            background: 'linear-gradient(90deg, #f0f0f0 25%, transparent 37%, #f0f0f0 63%)',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Financial Reports</h1>
        </div>
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <h4>Connection Error</h4>
            <p>{error}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={() => window.history.back()}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              Go Back
            </button>
            <button 
              onClick={fetchReports}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData || !reportData.hasTransactions) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '600' }}>Financial Reports</h1>
        </div>
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>No transactions found for {formatPeriodDisplay()}</h3>
          <p>Start adding transactions to see your financial reports.</p>
        </div>
      </div>
    );
  }

  const totals = getTotals();
  const balance = totals.income - totals.expense;
  const mainChartData = getMainChartData();
  const pieData = getPieData();

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '1rem' }}>Financial Reports</h1>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button 
            onClick={() => handleDownload('csv')}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <Download size={16} />
            CSV
          </button>
          <button 
            onClick={() => handleDownload('json')}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <Download size={16} />
            JSON
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '0.5rem' }}>
        {[
          { id: 'weekly', label: 'Weekly', icon: Calendar },
          { id: 'monthly', label: 'Monthly', icon: BarChart3 },
          { id: 'yearly', label: 'Yearly', icon: TrendingUp }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setReportType(id)}
            style={{
              background: reportType === id ? '#3b82f6' : 'white',
              color: reportType === id ? 'white' : '#374151',
              border: reportType === id ? 'none' : '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      {/* Period Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <button 
          onClick={() => navigatePeriod('prev')}
          style={{
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '0.75rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div style={{ 
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '1rem 2rem',
          minWidth: '300px',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>{formatPeriodDisplay()}</h3>
        </div>
        <button 
          onClick={() => navigatePeriod('next')}
          disabled={!canNavigateNext()}
          style={{
            background: canNavigateNext() ? 'white' : '#f9fafb',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '0.75rem',
            cursor: canNavigateNext() ? 'pointer' : 'not-allowed',
            opacity: canNavigateNext() ? 1 : 0.5,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '600' }}>Smart Insights</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {insights.map((insight, index) => (
              <div 
                key={index}
                style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  background: insight.type === 'success' 
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)'
                    : insight.type === 'warning'
                    ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%)',
                  borderLeft: `4px solid ${
                    insight.type === 'success' ? '#22c55e' : insight.type === 'warning' ? '#fbbf24' : '#f97316'
                  }`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ 
                    padding: '0.25rem', 
                    borderRadius: '50%', 
                    background: insight.type === 'success' 
                      ? 'rgba(34, 197, 94, 0.15)' 
                      : insight.type === 'warning'
                      ? 'rgba(251, 191, 36, 0.15)'
                      : 'rgba(249, 115, 22, 0.15)'
                  }}>
                    {insight.type === 'success' ? (
                      <TrendingUp size={16} style={{ color: '#22c55e' }} />
                    ) : insight.type === 'warning' ? (
                      <AlertTriangle size={16} style={{ color: '#fbbf24' }} />
                    ) : (
                      <TrendingDown size={16} style={{ color: '#f97316' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      fontWeight: '600', 
                      marginBottom: '0.5rem',
                      color: insight.type === 'success' ? '#15803d' : insight.type === 'warning' ? '#92400e' : '#9a3412'
                    }}>
                      {insight.title}
                    </h4>
                    <p style={{ 
                      marginBottom: '0.75rem',
                      color: insight.type === 'success' ? '#166534' : insight.type === 'warning' ? '#a16207' : '#c2410c'
                    }}>
                      {insight.message}
                    </p>
                    <p style={{ 
                      fontSize: '0.875rem',
                      color: insight.type === 'success' ? '#15803d' : insight.type === 'warning' ? '#92400e' : '#9a3412'
                    }}>
                      💡 {insight.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Income</span>
            <TrendingUp size={24} />
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: '700' }}>{formatCurrency(totals.income)}</div>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Expenses</span>
            <TrendingDown size={24} />
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: '700' }}>{formatCurrency(totals.expense)}</div>
        </div>
        
        <div style={{
          background: balance >= 0 
            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Balance</span>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%', 
              background: balance >= 0 ? '#10b981' : '#ef4444'
            }} />
          </div>
          <div style={{ fontSize: '1.875rem', fontWeight: '700' }}>
            {formatCurrency(balance)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: pieData ? 'repeat(auto-fit, minmax(400px, 1fr))' : '1fr', 
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Main Chart */}
        {mainChartData && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ height: '400px', position: 'relative' }}>
              <Bar data={mainChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Pie Chart */}
        {pieData && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ height: '400px', position: 'relative' }}>
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown Table */}
      {(() => {
        const categoryData = reportType === 'yearly' ? reportData.categoryBreakdown : reportData.expensesByCategory;
        return categoryData && categoryData.length > 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>Expense Breakdown by Category</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      CATEGORY
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'right', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      AMOUNT
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'right', 
                      fontSize: '0.875rem', 
                      fontWeight: '600', 
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      PERCENTAGE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((category, index) => {
                    const percentage = totals.expense > 0 ? ((category.amount / totals.expense) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ 
                          padding: '1rem', 
                          fontSize: '0.875rem', 
                          color: '#374151',
                          fontWeight: '500'
                        }}>
                          {category.category}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          textAlign: 'right', 
                          fontSize: '0.875rem', 
                          color: '#374151',
                          fontWeight: '600'
                        }}>
                          {formatCurrency(category.amount)}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          textAlign: 'right', 
                          fontSize: '0.875rem', 
                          color: '#6b7280'
                        }}>
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{
              padding: '1rem 1.5rem',
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb'
            }}>
              <p style={{ 
                margin: 0, 
                fontSize: '0.875rem', 
                color: '#6b7280',
                textAlign: 'center'
              }}>
                Report generated on {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
};

export default Reports;