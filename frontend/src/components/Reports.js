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
import { Bar, Pie } from 'react-chartjs-2';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  TrendingUp, 
  Download, 
  AlertTriangle, 
  TrendingDown, 
  ArrowLeft, 
  RefreshCw,
  BarChart3 
} from 'lucide-react';
import './Reports.css';

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
  getCurrentMonth: () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },

  getCurrentYear: () => {
    return new Date().getFullYear().toString();
  },

  getCurrentWeekMonday: () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  },

  formatMonth: (dateString) => {
    if (!dateString) return dateUtils.getCurrentMonth();
    
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    return dateUtils.getCurrentMonth();
  },

  formatYear: (dateString) => {
    if (!dateString) return dateUtils.getCurrentYear();
    
    if (/^\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.getFullYear().toString();
    }
    
    return dateUtils.getCurrentYear();
  },

  formatWeek: (dateString) => {
    if (!dateString) return dateUtils.getCurrentWeekMonday();
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return dateString;
      }
    }
    
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

// API service
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

  getReports: async (month) => {
    const formattedMonth = dateUtils.formatMonth(month);
    
    try {
      const response = await reportsAPI.fetchWithAuth('/api/transactions');
      const transactions = response.data || [];
      
      const monthTransactions = transactions.filter(transaction => {
        const transactionMonth = transaction.date.substring(0, 7);
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

      const totals = monthTransactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          acc.expense += transaction.amount;
        }
        return acc;
      }, { income: 0, expense: 0 });

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

      const dailyBreakdown = monthTransactions.reduce((acc, transaction) => {
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

  getWeeklyReports: async (weekStart) => {
    const formattedWeek = dateUtils.formatWeek(weekStart);
    
    try {
      const response = await reportsAPI.fetchWithAuth('/api/transactions');
      const transactions = response.data || [];
      
      const startDate = new Date(formattedWeek);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
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

  getMonthlyReports: async (year) => {
    const formattedYear = dateUtils.formatYear(year);
    
    try {
      const response = await reportsAPI.fetchWithAuth('/api/transactions');
      const transactions = response.data || [];
      
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

      const monthlyBreakdown = yearTransactions.reduce((acc, transaction) => {
        const month = transaction.date.substring(0, 7);
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

  getCustomRangeReports: async (startDate, endDate) => {
    try {
      const response = await reportsAPI.fetchWithAuth('/api/transactions');
      const transactions = response.data || [];
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      const rangeTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= start && transactionDate <= end;
      });

      if (rangeTransactions.length === 0) {
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

      const totals = rangeTransactions.reduce((acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += transaction.amount;
        } else if (transaction.type === 'expense') {
          acc.expense += transaction.amount;
        }
        return acc;
      }, { income: 0, expense: 0 });

      const expensesByCategory = rangeTransactions
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

      const dailyBreakdown = rangeTransactions.reduce((acc, transaction) => {
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
          dailyBreakdown,
          dateRange: { start: startDate, end: endDate }
        }
      };

    } catch (error) {
      console.error('Error fetching custom range reports:', error);
      throw error;
    }
  }
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
    
    csv += 'Financial Report Summary\n';
    csv += 'Period,Income,Expenses,Balance\n';
    csv += `"${data.period || filename}","${data.income || 0}","${data.expenses || 0}","${(data.income || 0) - (data.expenses || 0)}"\n\n`;
    
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
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [generatingCustomReport, setGeneratingCustomReport] = useState(false);

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
    if (currentPeriod && currentPeriod.length > 0 && reportType !== 'custom') {
      fetchReports();
      fetchPreviousPeriodData();
    }
  }, [currentPeriod, reportType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let apiResponse;
      
      if (reportType === 'custom') {
        if (!customStartDate || !customEndDate) {
          setError('Please select both start and end dates');
          setLoading(false);
          return;
        }
        if (new Date(customStartDate) > new Date(customEndDate)) {
          setError('Start date must be before end date');
          setLoading(false);
          return;
        }
        
        setGeneratingCustomReport(true);
        apiResponse = await reportsAPI.getCustomRangeReports(customStartDate, customEndDate);
        setGeneratingCustomReport(false);
      } else if (reportType === 'weekly') {
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
      setError(`Failed to load reports: ${error.message}`);
      setGeneratingCustomReport(false);
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
        const prevDate = new Date(year, month - 2);
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

  const handleGoBack = () => {
    window.history.back();
  };

  const handleTryDifferentPeriod = () => {
    const now = new Date();
    if (reportType === 'weekly') {
      setCurrentPeriod(dateUtils.getCurrentWeekMonday());
    } else if (reportType === 'yearly') {
      setCurrentPeriod(dateUtils.getCurrentYear());
    } else {
      setCurrentPeriod(dateUtils.getCurrentMonth());
    }
    setReportData(null);
    setLoading(true);
  };

  const handleTryDifferentReportType = () => {
    if (reportType === 'custom') {
      setReportType('monthly');
    } else {
      setReportType('weekly');
    }
    setReportData(null);
    setLoading(true);
  };

  const generateInsights = () => {
    if (!reportData || !reportData.hasTransactions) return [];
    
    const insights = [];
    const totals = getTotals();
    const expenseCategories = reportType === 'yearly' 
      ? reportData.categoryBreakdown 
      : reportData.expensesByCategory;

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
    if (reportType === 'custom' && reportData?.dateRange) {
      const start = new Date(reportData.dateRange.start);
      const end = new Date(reportData.dateRange.end);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (reportType === 'weekly' && currentPeriod) {
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
    } else if (reportType === 'custom' && reportData.dailyBreakdown?.length > 0) {
      const dailyData = reportData.dailyBreakdown.map(day => ({
        date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        income: day.income,
        expense: day.expense
      }));

      return {
        labels: dailyData.map(d => d.date),
        datasets: [
          {
            label: 'Income',
            data: dailyData.map(d => d.income),
            backgroundColor: '#22c55e',
            borderColor: '#16a34a',
            borderWidth: 1
          },
          {
            label: 'Expenses',
            data: dailyData.map(d => d.expense),
            backgroundColor: '#f97316',
            borderColor: '#ea580c',
            borderWidth: 1
          }
        ]
      };
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

  const getTotals = () => {
    if (!reportData) return { income: 0, expense: 0 };
    
    if (reportType === 'yearly') {
      return reportData.yearlyTotals || { income: 0, expense: 0 };
    } else if (reportType === 'weekly' || reportType === 'custom') {
      return reportData.totals || { income: 0, expense: 0 };
    } else {
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
        text: `${reportType === 'weekly' ? 'Daily Breakdown' : reportType === 'yearly' ? 'Monthly Breakdown' : reportType === 'custom' ? 'Daily Breakdown' : 'Income vs Expenses'} - ${formatPeriodDisplay()}`,
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
      <div className="loading-container">
        <div className="loading-header">
          <h1 className="loading-title">Financial Reports</h1>
        </div>
        <div className="loading-content">
          <div className="loading-shimmer"></div>
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-header">
          <h1 className="error-title">Financial Reports</h1>
        </div>
        <div className="error-content">
          <div className="error-alert">
            <h4>Connection Error</h4>
            <p>{error}</p>
          </div>
          <div className="action-buttons">
            <button className="action-btn" onClick={handleGoBack}>
              <ArrowLeft size={16} />
              Go Back
            </button>
            <button className="action-btn primary" onClick={fetchReports}>
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData || !reportData.hasTransactions) {
    return (
      <div className="no-data-container">
        <div className="no-data-header">
          <h1 className="no-data-title">Financial Reports</h1>
        </div>
        <div className="no-data-content">
          <div className="no-data-alert">
            <h3 className="no-data-title-inner">No Transactions Found</h3>
            <p className="no-data-message">
              No transactions found for <strong>{formatPeriodDisplay()}</strong>. 
              {reportType === 'custom' ? ' Try selecting a different date range.' : ' Try selecting a different period or report type.'}
            </p>
            
            <div className="action-buttons">
              <button className="action-btn" onClick={handleGoBack}>
                <ArrowLeft size={16} />
                Go Back
              </button>
              
              <button className="action-btn primary" onClick={handleTryDifferentPeriod}>
                <RefreshCw size={16} />
                Try Current Period
              </button>
              
              <button className="action-btn success" onClick={handleTryDifferentReportType}>
                <BarChart3 size={16} />
                Switch Report Type
              </button>
            </div>
          </div>
          
          <div className="tips-section">
            <h4 className="tips-title">Quick Tips:</h4>
            <ul className="tips-list">
              <li>Make sure you have transactions recorded for the selected period</li>
              <li>Try switching to a different report type (Weekly, Monthly, Yearly)</li>
              <li>Check if you're filtering by the correct date range</li>
              <li>Navigate to previous/next periods using the navigation buttons</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const totals = getTotals();
  const balance = totals.income - totals.expense;
  const mainChartData = getMainChartData();
  const pieData = getPieData();

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header">
        <h1 className="reports-title">Financial Reports</h1>
        
        <div className="header-actions">
          {/* Blue Export Buttons */}
          <div className="export-buttons">
            <button 
              className="export-btn"
              onClick={() => handleDownload('csv')}
            >
              <Download size={16} />
              CSV
            </button>
            <button 
              className="export-btn"
              onClick={() => handleDownload('json')}
            >
              <Download size={16} />
              JSON
            </button>
          </div>
          
          {/* Time Filters */}
          <div className="time-filters">
            {[
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'yearly', label: 'Yearly' },
              { id: 'custom', label: 'Custom Range' }
            ].map(({ id, label }) => (
              <button
                key={id}
                className={`time-filter-btn ${reportType === id ? 'active' : ''}`}
                onClick={() => setReportType(id)}
              >
                {label}
              </button>
            ))}
          </div>
          
          {/* Range Selector */}
          {reportType !== 'custom' && (
            <div className="range-selector">
              <div className="range-display">
                <div className="range-display-text">
                  <Calendar size={14} />
                  {formatPeriodDisplay()}
                </div>
              </div>
              
              <div className="nav-arrows">
                <button 
                  className="nav-btn"
                  onClick={() => navigatePeriod('prev')}
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  className="nav-btn"
                  onClick={() => navigatePeriod('next')}
                  disabled={!canNavigateNext()}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {reportType === 'custom' && (
        <div className="custom-range-picker">
          <h3 className="custom-range-title">Select Date Range</h3>
          <div className="custom-range-grid">
            <div className="date-input-group">
              <label className="date-label">Start Date</label>
              <input
                type="date"
                className="date-input"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="date-input-group">
              <label className="date-label">End Date</label>
              <input
                type="date"
                className="date-input"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
            <button
              className="generate-btn"
              onClick={fetchReports}
              disabled={!customStartDate || !customEndDate || generatingCustomReport}
            >
              {generatingCustomReport ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      )}

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="insights-section">
          <h2 className="insights-title">Smart Insights</h2>
          <div className="insights-grid">
            {insights.map((insight, index) => (
              <div 
                key={index}
                className={`insight-card ${insight.type}`}
              >
                <div className="insight-content">
                  <div className={`insight-icon ${insight.type}`}>
                    {insight.type === 'success' ? (
                      <TrendingUp size={16} style={{ color: '#22c55e' }} />
                    ) : insight.type === 'warning' ? (
                      <AlertTriangle size={16} style={{ color: '#fbbf24' }} />
                    ) : (
                      <TrendingDown size={16} style={{ color: '#f97316' }} />
                    )}
                  </div>
                  <div className="insight-text">
                    <h4 className={`insight-title ${insight.type}`}>
                      {insight.title}
                    </h4>
                    <p className={`insight-message ${insight.type}`}>
                      {insight.message}
                    </p>
                    <p className={`insight-suggestion ${insight.type}`}>
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
      <div className="summary-grid">
        <div className="summary-card income">
          <div className="summary-header">
            <span className="summary-label">Total Income</span>
            <TrendingUp size={24} />
          </div>
          <div className="summary-value">{formatCurrency(totals.income)}</div>
        </div>
        
        <div className="summary-card expense">
          <div className="summary-header">
            <span className="summary-label">Total Expenses</span>
            <TrendingDown size={24} />
          </div>
          <div className="summary-value">{formatCurrency(totals.expense)}</div>
        </div>
        
        <div className={`summary-card balance ${balance < 0 ? 'negative' : ''}`}>
          <div className="summary-header">
            <span className="summary-label">Balance</span>
            <div className={`balance-indicator ${balance < 0 ? 'negative' : ''}`} />
          </div>
          <div className="summary-value">
            {formatCurrency(balance)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Main Chart */}
        {mainChartData && (
          <div className="chart-container">
            <div className="chart-wrapper">
              <Bar data={mainChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Pie Chart */}
        {pieData && (
          <div className="chart-container">
            <div className="chart-wrapper">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown Table */}
      {(() => {
        const categoryData = reportType === 'yearly' ? reportData.categoryBreakdown : reportData.expensesByCategory;
        return categoryData && categoryData.length > 0 ? (
          <div className="category-table-container">
            <div className="table-header">
              <h3 className="table-title">Expense Breakdown by Category</h3>
            </div>
            <div className="table-scroll">
              <table className="category-table">
                <thead>
                  <tr>
                    <th>CATEGORY</th>
                    <th>AMOUNT</th>
                    <th>PERCENTAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((category, index) => {
                    const percentage = totals.expense > 0 ? ((category.amount / totals.expense) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={index}>
                        <td className="category-name">{category.category}</td>
                        <td className="category-amount">{formatCurrency(category.amount)}</td>
                        <td className="category-percentage">{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <p className="generated-text">
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