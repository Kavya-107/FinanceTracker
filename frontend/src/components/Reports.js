import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// API service to connect with your backend
const reportsAPI = {
  getReports: async (month) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken'); // Adjust based on how you store auth token
      
     
      const apiUrl = `http://localhost:5000/api/reports?month=${month}`;
      
      console.log('Making API call to:', apiUrl);
      console.log('Using token:', token ? 'Token present' : 'No token found');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch reports');
      }

      return data;
    } catch (error) {
      console.error('Detailed error in getReports:', error);
      throw error;
    }
  }
};

const Reports = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReports(currentMonth);
  }, [currentMonth]);

  const fetchReports = async (month) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching reports for month:', month);
      const response = await reportsAPI.getReports(month);
      console.log('API Response:', response);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports data. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatMonthDisplay = (monthStr) => {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const navigateMonth = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const currentDate = new Date(year, month - 1);
    
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    const newMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonth(newMonth);
  };

  const canNavigateNext = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const currentDate = new Date(year, month - 1);
    const today = new Date();
    today.setDate(1);
    return currentDate < today;
  };

  // Styles
  const containerStyle = {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '2rem',
    color: '#333',
    fontSize: '2.5rem',
    fontWeight: 'bold'
  };

  const monthNavigationStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2rem',
    gap: '1rem'
  };

  const navButtonStyle = {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease'
  };

  const disabledNavButtonStyle = {
    ...navButtonStyle,
    backgroundColor: '#f5f5f5',
    cursor: 'not-allowed',
    opacity: 0.5
  };

  const monthDisplayStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    minWidth: '200px',
    textAlign: 'center',
    color: '#333',
    padding: '0.5rem 1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  const summaryStatsStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  };

  const statCardStyle = {
    padding: '2rem',
    borderRadius: '12px',
    backgroundColor: 'white',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textAlign: 'center',
    transition: 'transform 0.2s ease',
    cursor: 'pointer'
  };

  const chartsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '2rem',
    marginBottom: '2rem'
  };

  const chartCardStyle = {
    padding: '1.5rem',
    borderRadius: '12px',
    backgroundColor: 'white',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const chartWrapperStyle = {
    height: '400px',
    position: 'relative'
  };

  const noDataStyle = {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#666',
    fontSize: '1.2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const loadingStyle = {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const errorStyle = {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };

  const tableContainerStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse'
  };

  const tableHeaderStyle = {
    backgroundColor: '#f8f9fa',
    padding: '1rem',
    textAlign: 'left',
    borderBottom: '1px solid #dee2e6',
    fontWeight: 'bold',
    color: '#495057'
  };

  const tableCellStyle = {
    padding: '1rem',
    borderBottom: '1px solid #dee2e6',
    color: '#495057'
  };

  const retryButtonStyle = {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    marginTop: '1rem',
    transition: 'background-color 0.2s ease'
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <h1 style={headerStyle}>Financial Reports</h1>
        <div style={loadingStyle}>
          <div style={{ 
            display: 'inline-block', 
            width: '50px', 
            height: '50px', 
            border: '5px solid #f3f3f3', 
            borderTop: '5px solid #007bff', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }}></div>
          <p style={{ marginTop: '1rem', color: '#666', fontSize: '1.1rem' }}>Loading reports...</p>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `
          }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <h1 style={headerStyle}>Financial Reports</h1>
        <div style={errorStyle}>
          <p style={{ color: '#dc3545', marginBottom: '1rem', fontSize: '1.1rem' }}>{error}</p>
          <button 
            onClick={() => fetchReports(currentMonth)}
            style={retryButtonStyle}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div style={containerStyle}>
        <h1 style={headerStyle}>Financial Reports</h1>
        <div style={noDataStyle}>
          <p>No report data available.</p>
        </div>
      </div>
    );
  }

  // Pie Chart Data for Expenses by Category
  const expensesPieData = {
    labels: reportData.expensesByCategory?.map(item => item.category) || [],
    datasets: [
      {
        data: reportData.expensesByCategory?.map(item => item.amount) || [],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#C9CBCF'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  // Monthly Bar Chart Data
  const monthlyBarData = {
    labels: [formatMonthDisplay(currentMonth)],
    datasets: [
      {
        label: 'Income',
        data: [reportData.monthlyData?.income || 0],
        backgroundColor: '#28a745',
        borderColor: '#1e7e34',
        borderWidth: 1
      },
      {
        label: 'Expenses',
        data: [reportData.monthlyData?.expense || 0],
        backgroundColor: '#dc3545',
        borderColor: '#c82333',
        borderWidth: 1
      }
    ]
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
        text: `Monthly Overview - ${formatMonthDisplay(currentMonth)}`,
        font: {
          size: 16
        }
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
        text: `Expenses by Category - ${formatMonthDisplay(currentMonth)}`,
        font: {
          size: 16
        }
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

  const netBalance = (reportData.monthlyData?.income || 0) - (reportData.monthlyData?.expense || 0);

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Financial Reports</h1>
      
      {/* Month Navigation */}
      <div style={monthNavigationStyle}>
        <button 
          style={navButtonStyle}
          onClick={() => navigateMonth('prev')}
          onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
        >
          <ChevronLeft size={24} />
        </button>
        
        <div style={monthDisplayStyle}>
          {formatMonthDisplay(currentMonth)}
        </div>
        
        <button 
          style={canNavigateNext() ? navButtonStyle : disabledNavButtonStyle}
          onClick={() => canNavigateNext() && navigateMonth('next')}
          disabled={!canNavigateNext()}
          onMouseOver={(e) => {
            if (canNavigateNext()) {
              e.target.style.backgroundColor = '#f8f9fa';
            }
          }}
          onMouseOut={(e) => {
            if (canNavigateNext()) {
              e.target.style.backgroundColor = 'white';
            }
          }}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Check if there are transactions for this month */}
      {!reportData.hasTransactions ? (
        <div style={noDataStyle}>
          <h2 style={{ color: '#6c757d', marginBottom: '1rem' }}>No transactions found for {formatMonthDisplay(currentMonth)}</h2>
          <p style={{ color: '#6c757d' }}>Start adding transactions to see your financial reports.</p>
        </div>
      ) : (
        <>
          {/* Summary Statistics */}
          <div style={summaryStatsStyle}>
            <div 
              style={statCardStyle}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#28a745', marginBottom: '0.5rem' }}>
                {formatCurrency(reportData.monthlyData?.income || 0)}
              </div>
              <div style={{ color: '#6c757d', fontSize: '1.1rem' }}>Monthly Income</div>
            </div>
            
            <div 
              style={statCardStyle}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#dc3545', marginBottom: '0.5rem' }}>
                {formatCurrency(reportData.monthlyData?.expense || 0)}
              </div>
              <div style={{ color: '#6c757d', fontSize: '1.1rem' }}>Monthly Expenses</div>
            </div>
            
            <div 
              style={statCardStyle}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                color: netBalance >= 0 ? '#28a745' : '#dc3545',
                marginBottom: '0.5rem'
              }}>
                {formatCurrency(netBalance)}
              </div>
              <div style={{ color: '#6c757d', fontSize: '1.1rem' }}>Net Balance</div>
            </div>
          </div>

          {/* Charts */}
          <div style={chartsContainerStyle}>
            {/* Monthly Overview */}
            <div style={chartCardStyle}>
              <div style={chartWrapperStyle}>
                <Bar data={monthlyBarData} options={chartOptions} />
              </div>
            </div>

            {/* Expenses by Category */}
            <div style={chartCardStyle}>
              {reportData.expensesByCategory && reportData.expensesByCategory.length > 0 ? (
                <div style={chartWrapperStyle}>
                  <Pie data={expensesPieData} options={pieOptions} />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6c757d' }}>
                  <h3>No expense categories for this month</h3>
                  <p>Add some expense transactions to see category breakdown</p>
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown Table */}
          {reportData.expensesByCategory && reportData.expensesByCategory.length > 0 && (
            <div style={tableContainerStyle}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #dee2e6', backgroundColor: '#f8f9fa' }}>
                <h3 style={{ margin: 0, color: '#495057' }}>Expense Breakdown by Category</h3>
              </div>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>Category</th>
                    <th style={tableHeaderStyle}>Amount</th>
                    <th style={tableHeaderStyle}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.expensesByCategory.map((item, index) => {
                    const totalExpense = reportData.monthlyData?.expense || 1;
                    const percentage = ((item.amount / totalExpense) * 100).toFixed(1);
                    return (
                      <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={tableCellStyle}>{item.category}</td>
                        <td style={tableCellStyle}>{formatCurrency(item.amount)}</td>
                        <td style={tableCellStyle}>{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;