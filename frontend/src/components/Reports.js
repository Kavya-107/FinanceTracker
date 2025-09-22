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

// Mock API service (using state instead of localStorage)
const reportsAPI = {
  getAuthHeaders: () => {
    // Mock authentication - in a real app, this would check for actual auth
    return {
      'Authorization': `Bearer mock-token`,
      'Content-Type': 'application/json'
    };
  },

  // Mock data generator
  generateMockData: (type, period) => {
    const categories = ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Shopping', 'Healthcare'];
    const baseIncome = 50000 + Math.random() * 30000;
    const baseExpense = 30000 + Math.random() * 25000;
    
    if (type === 'weekly') {
      const dailyBreakdown = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(new Date(period).getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        income: Math.random() * (baseIncome / 30),
        expense: Math.random() * (baseExpense / 30)
      }));
      
      const totals = dailyBreakdown.reduce((acc, day) => ({
        income: acc.income + day.income,
        expense: acc.expense + day.expense
      }), { income: 0, expense: 0 });

      return {
        success: true,
        data: {
          hasTransactions: true,
          totals,
          dailyBreakdown,
          expensesByCategory: categories.slice(0, 4).map(cat => ({
            category: cat,
            amount: Math.random() * (totals.expense / 4)
          })).sort((a, b) => b.amount - a.amount)
        }
      };
    } else if (type === 'yearly') {
      const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => ({
        month: `${period}-${String(i + 1).padStart(2, '0')}`,
        income: baseIncome * (0.8 + Math.random() * 0.4),
        expense: baseExpense * (0.8 + Math.random() * 0.4)
      }));

      const yearlyTotals = monthlyBreakdown.reduce((acc, month) => ({
        income: acc.income + month.income,
        expense: acc.expense + month.expense
      }), { income: 0, expense: 0 });

      return {
        success: true,
        data: {
          hasTransactions: true,
          yearlyTotals,
          monthlyBreakdown,
          categoryBreakdown: categories.map(cat => ({
            category: cat,
            amount: Math.random() * (yearlyTotals.expense / 6)
          })).sort((a, b) => b.amount - a.amount)
        }
      };
    } else {
      // Monthly
      return {
        success: true,
        data: {
          hasTransactions: true,
          monthlyData: {
            income: baseIncome,
            expense: baseExpense
          },
          expensesByCategory: categories.slice(0, 5).map(cat => ({
            category: cat,
            amount: Math.random() * (baseExpense / 5)
          })).sort((a, b) => b.amount - a.amount)
        }
      };
    }
  },

  getReports: async (month) => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
    return reportsAPI.generateMockData('monthly', month);
  },
  
  getWeeklyReports: async (weekStart) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return reportsAPI.generateMockData('weekly', weekStart);
  },
  
  getMonthlyReports: async (year) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return reportsAPI.generateMockData('yearly', year);
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
    csv += `"${filename}","${data.income || 0}","${data.expenses || 0}","${(data.income || 0) - (data.expenses || 0)}"\n\n`;
    
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

  // Initialize currentPeriod based on report type
  useEffect(() => {
    const now = new Date();
    if (reportType === 'weekly') {
      setCurrentPeriod(getMondayOfWeek(now));
    } else if (reportType === 'yearly') {
      setCurrentPeriod(now.getFullYear().toString());
    } else {
      setCurrentPeriod(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [reportType]);

  useEffect(() => {
    if (currentPeriod) {
      fetchReports();
      fetchPreviousPeriodData();
    }
  }, [currentPeriod, reportType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (reportType === 'weekly') {
        response = await reportsAPI.getWeeklyReports(currentPeriod);
      } else if (reportType === 'yearly') {
        response = await reportsAPI.getMonthlyReports(currentPeriod);
      } else {
        response = await reportsAPI.getReports(currentPeriod);
      }
      
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError(`Failed to load reports: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousPeriodData = async () => {
    try {
      let previousPeriod;
      
      if (reportType === 'weekly') {
        const currentDate = new Date(currentPeriod);
        const prevWeek = new Date(currentDate);
        prevWeek.setDate(currentDate.getDate() - 7);
        previousPeriod = prevWeek.toISOString().split('T')[0];
        const response = await reportsAPI.getWeeklyReports(previousPeriod);
        setPreviousPeriodData(response.data);
      } else if (reportType === 'yearly') {
        const prevYear = (parseInt(currentPeriod) - 1).toString();
        previousPeriod = prevYear;
        const response = await reportsAPI.getMonthlyReports(previousPeriod);
        setPreviousPeriodData(response.data);
      } else {
        const [year, month] = currentPeriod.split('-').map(Number);
        const prevDate = new Date(year, month - 2); // month - 2 because months are 0-indexed
        previousPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        const response = await reportsAPI.getReports(previousPeriod);
        setPreviousPeriodData(response.data);
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
      const percentage = ((topCategory.amount / totalExpenses) * 100).toFixed(1);
      
      insights.push({
        type: 'warning',
        title: 'Highest Spending Category',
        message: `${topCategory.category} accounts for ${percentage}% of your total expenses (${formatCurrency(topCategory.amount)}).`,
        suggestion: percentage > 40 ? 'Consider reviewing and reducing expenses in this category.' : 'This seems reasonable for your spending pattern.'
      });
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
    
    if (reportType === 'weekly') {
      const currentDate = new Date(currentPeriod);
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + (direction === 'prev' ? -7 : 7));
      setCurrentPeriod(newDate.toISOString().split('T')[0]);
    } else if (reportType === 'yearly') {
      const year = parseInt(currentPeriod);
      setCurrentPeriod((year + (direction === 'prev' ? -1 : 1)).toString());
    } else {
      const [year, month] = currentPeriod.split('-').map(Number);
      const currentDate = new Date(year, month - 1);
      currentDate.setMonth(currentDate.getMonth() + (direction === 'prev' ? -1 : 1));
      const newPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      setCurrentPeriod(newPeriod);
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
            data: [reportData.monthlyData?.income || 0],
            backgroundColor: '#22c55e',
            borderColor: '#16a34a',
            borderWidth: 1
          },
          {
            label: 'Expenses',
            data: [reportData.monthlyData?.expense || 0],
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
      return {
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
      return {
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
      <div className="reports">
        <div className="container">
          <div className="dashboard-header">
            <h1>Financial Reports</h1>
          </div>
          <div className="stat-card text-center">
            <div className="loading" style={{ height: '60px', borderRadius: '8px', marginBottom: '1rem' }}></div>
            <p>Loading reports...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports">
        <div className="container">
          <div className="dashboard-header">
            <h1>Financial Reports</h1>
          </div>
          <div className="stat-card text-center">
            <div className="alert alert-danger mb-3">
              {error}
            </div>
            <button 
              onClick={fetchReports}
              className="btn btn-primary"
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
      <div className="reports">
        <div className="container">
          <div className="dashboard-header">
            <h1>Financial Reports</h1>
          </div>
          <div className="stat-card text-center">
            <h3 className="mb-2">No transactions found for {formatPeriodDisplay()}</h3>
            <p>Start adding transactions to see your financial reports.</p>
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
    <div className="reports">
      <div className="container">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Financial Reports</h1>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button 
              onClick={() => handleDownload('csv')}
              className="btn btn-secondary btn-small"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={16} />
              CSV
            </button>
            <button 
              onClick={() => handleDownload('json')}
              className="btn btn-secondary btn-small"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
              className={`nav-item ${reportType === id ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
            className="btn btn-secondary"
            style={{ padding: '0.75rem' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="stat-card" style={{ minWidth: '300px', padding: '1rem 2rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{formatPeriodDisplay()}</h3>
          </div>
          <button 
            onClick={() => navigatePeriod('next')}
            disabled={!canNavigateNext()}
            className={`btn ${canNavigateNext() ? 'btn-secondary' : 'btn-secondary'}`}
            style={{ 
              padding: '0.75rem',
              opacity: canNavigateNext() ? 1 : 0.5,
              cursor: canNavigateNext() ? 'pointer' : 'not-allowed'
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Smart Insights */}
        {insights.length > 0 && (
          <div className="mb-4">
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '600' }}>Smart Insights</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={`alert ${
                    insight.type === 'success' 
                      ? 'alert-success' 
                      : insight.type === 'warning'
                      ? 'alert alert-warning'
                      : 'alert-danger'
                  }`}
                  style={{
                    padding: '1.5rem',
                    borderRadius: 'var(--border-radius-lg)',
                    border: 'none',
                    boxShadow: 'var(--shadow-md)',
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
        <div className="dashboard-stats">
          <div className="stat-card income-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="stat-label">Total Income</span>
              <TrendingUp size={24} style={{ color: 'var(--success-color)' }} />
            </div>
            <div className="stat-value income">{formatCurrency(totals.income)}</div>
          </div>
          
          <div className="stat-card expense-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="stat-label">Total Expenses</span>
              <TrendingDown size={24} style={{ color: 'var(--danger-color)' }} />
            </div>
            <div className="stat-value expense">{formatCurrency(totals.expense)}</div>
          </div>
          
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="stat-label">Balance</span>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                borderRadius: '50%', 
                background: balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)' 
              }} />
            </div>
            <div className={`stat-value ${balance >= 0 ? 'income' : 'expense'}`}>
              {formatCurrency(balance)}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-container">
          {/* Main Chart */}
          {mainChartData && (
            <div className="chart-card">
              <div style={{ height: '400px', position: 'relative' }}>
                <Bar data={mainChartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Pie Chart */}
          {pieData && (
            <div className="chart-card">
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
            <div className="transactions-section mt-4">
              <div className="transactions-header">
                <h3>Expense Breakdown by Category</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em'
                      }}>
                        Category
                      </th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em'
                      }}>
                        Amount
                      </th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em'
                      }}>
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((category, index) => {
                      const percentage = ((category.amount / totals.expense) * 100).toFixed(1);
                      return (
                        <tr key={index} className="transaction-item">
                          <td style={{ 
                            padding: '1rem', 
                            fontWeight: '500', 
                            color: 'var(--text-primary)' 
                          }}>
                            {category.category}
                          </td>
                          <td style={{ 
                            padding: '1rem', 
                            textAlign: 'right', 
                            color: 'var(--text-primary)',
                            fontWeight: '600'
                          }}>
                            {formatCurrency(category.amount)}
                          </td>
                          <td style={{ 
                            padding: '1rem', 
                            textAlign: 'right', 
                            color: 'var(--text-muted)' 
                          }}>
                            {percentage}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null;
        })()}

        {/* Footer */}
        <div className="text-center mt-4" style={{ color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '0.875rem' }}>
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
    </div>
  );
};

export default Reports;