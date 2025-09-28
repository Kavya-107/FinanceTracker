import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { transactionsAPI, authAPI } from '../services/api';
import FilterComponent from './FilterComponent';
import { Filter, AlertCircle, RefreshCw } from 'lucide-react';

const Dashboard = ({ onAddTransaction }) => {
  const [allTransactions, setAllTransactions] = useState([]);
  const [displayTransactions, setDisplayTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState({});
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Other existing state...
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [customCategories, setCustomCategories] = useState({
    income: [],
    expense: []
  });
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const defaultCategories = {
    expense: ['Food', 'Rent', 'Bills', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare', 'Utilities', 'Other'],
    income: ['Salary', 'Scholarship', 'Freelance', 'Investment', 'Business', 'Gift', 'Bonus', 'Other']
  };

  // Authentication check
  useEffect(() => {
    console.log('🔍 Checking authentication status...');
    const token = localStorage.getItem('token');
    
    setDebugInfo(prev => ({
      ...prev,
      tokenExists: !!token,
      tokenValue: token ? `${token.substring(0, 20)}...` : 'None',
      timestamp: new Date().toISOString()
    }));
    
    if (token) {
      console.log('✅ Token found in localStorage');
      setIsAuthenticated(true);
    } else {
      console.warn('⚠️ No token found - user needs to login');
      setError('Please login to view your transactions');
    }
    
    setAuthChecked(true);
  }, []);

  // Fetch transactions only after authentication is confirmed
  useEffect(() => {
    if (authChecked && isAuthenticated) {
      fetchAllTransactions();
    }
  }, [authChecked, isAuthenticated]);

  const getAllCategories = (type) => {
    return [...defaultCategories[type], ...customCategories[type]];
  };

  const getAllUniqueCategories = useMemo(() => {
    const allCategories = new Set();
    allTransactions.forEach(transaction => {
      if (transaction.category) {
        allCategories.add(transaction.category);
      }
    });
    return Array.from(allCategories).sort();
  }, [allTransactions]);

  // Helper function to properly format date strings
  const normalizeDate = useCallback((dateString) => {
    if (!dateString) return new Date().toISOString().split('T')[0];
    
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    
    if (typeof dateString === 'string' && dateString.includes('T')) {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Enhanced fetchAllTransactions with comprehensive debugging
  const fetchAllTransactions = useCallback(async () => {
    console.log('🚀 Starting fetchAllTransactions...');
    setLoading(true);
    setError('');

    try {
      // Pre-fetch checks
      const token = localStorage.getItem('token');
      console.log('Pre-fetch token check:', !!token);
      
      if (!token) {
        throw new Error('No authentication token found. Please login.');
      }

      setDebugInfo(prev => ({
        ...prev,
        fetchStartTime: new Date().toISOString(),
        fetchStatus: 'Starting...'
      }));

      console.log('📡 Calling transactionsAPI.getAll()...');
      const response = await transactionsAPI.getAll();
      
      console.log('📦 Raw API response received:', {
        hasResponse: !!response,
        hasData: !!response?.data,
        dataType: typeof response?.data,
        isArray: Array.isArray(response?.data),
        dataLength: response?.data?.length || 0
      });

      // Validate response structure
      if (!response) {
        throw new Error('No response received from API');
      }

      if (!response.data) {
        throw new Error('Response does not contain data field');
      }

      const transactionsData = Array.isArray(response.data.data) ? response.data.data : [];
      console.log(`📊 Processing ${transactionsData.length} transactions...`);

      // Process and normalize transactions
      const normalizedTransactions = transactionsData.map((transaction, index) => {
        const normalized = {
          ...transaction,
          amount: parseFloat(transaction.amount) || 0,
          date: normalizeDate(transaction.date),
          type: (transaction.type || 'expense').toLowerCase().trim(),
          category: transaction.category || 'Other',
          notes: transaction.notes || ''
        };
        
        console.log(`Transaction ${index}:`, {
          id: normalized.id,
          type: normalized.type,
          amount: normalized.amount,
          category: normalized.category,
          date: normalized.date
        });
        
        return normalized;
      });
      
      setAllTransactions(normalizedTransactions);
      setDisplayTransactions(normalizedTransactions);
      
      setDebugInfo(prev => ({
        ...prev,
        fetchEndTime: new Date().toISOString(),
        fetchStatus: 'Success',
        transactionCount: normalizedTransactions.length,
        lastFetch: new Date().toISOString()
      }));
      
      console.log('✅ Transactions loaded successfully:', {
        total: normalizedTransactions.length,
        income: normalizedTransactions.filter(t => t.type === 'income').length,
        expense: normalizedTransactions.filter(t => t.type === 'expense').length
      });
      
    } catch (error) {
      console.error('💥 Error in fetchAllTransactions:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      setError(error.message || 'Failed to load transactions. Please try again.');
      setAllTransactions([]);
      setDisplayTransactions([]);
      
      setDebugInfo(prev => ({
        ...prev,
        fetchEndTime: new Date().toISOString(),
        fetchStatus: 'Error',
        lastError: error.message,
        errorTime: new Date().toISOString()
      }));
      
    } finally {
      setLoading(false);
    }
  }, [normalizeDate]);

  // Client-side filtering function
  const applyFilters = useCallback((transactions, filters) => {
    console.log('🔍 Applying filters:', filters);
    return transactions.filter(transaction => {
      if (filters.categories && filters.categories.length > 0) {
        if (!filters.categories.includes(transaction.category)) {
          return false;
        }
      }

      if (filters.type && filters.type !== transaction.type) {
        return false;
      }

      if (filters.minAmount && parseFloat(filters.minAmount) > 0) {
        if (transaction.amount < parseFloat(filters.minAmount)) {
          return false;
        }
      }
      if (filters.maxAmount && parseFloat(filters.maxAmount) > 0) {
        if (transaction.amount > parseFloat(filters.maxAmount)) {
          return false;
        }
      }

      if (filters.startDate) {
        if (transaction.date < filters.startDate) {
          return false;
        }
      }
      if (filters.endDate) {
        if (transaction.date > filters.endDate) {
          return false;
        }
      }

      if (filters.searchText && filters.searchText.trim()) {
        const searchTerm = filters.searchText.toLowerCase().trim();
        const searchableText = [
          transaction.category,
          transaction.notes,
          transaction.amount.toString()
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback(async (newFilters) => {
    setActiveFilters(newFilters);
    setIsFiltering(true);

    const hasActiveFilters = Object.values(newFilters).some(value => 
      value !== undefined && value !== null && value !== '' && 
      (!Array.isArray(value) || value.length > 0)
    );

    try {
      if (hasActiveFilters) {
        const filteredTransactions = applyFilters(allTransactions, newFilters);
        setDisplayTransactions(filteredTransactions);
      } else {
        setDisplayTransactions(allTransactions);
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      setError('Error applying filters. Please try again.');
    } finally {
      setIsFiltering(false);
    }
  }, [allTransactions, applyFilters]);

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    fetchAllTransactions();
  }, [fetchAllTransactions]);

  // Rest of your existing methods (handleDelete, handleEdit, etc.)
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionsAPI.delete(id);
        await fetchAllTransactions();
        if (Object.keys(activeFilters).length > 0) {
          handleFilterChange(activeFilters);
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setError('Failed to delete transaction. Please try again.');
      }
    }
  };

  const handleEdit = useCallback((transaction) => {
    setEditingTransaction(transaction.id);
    setEditFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      date: normalizeDate(transaction.date),
      notes: transaction.notes || ''
    });
  }, [normalizeDate]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const dataToUpdate = {
        ...editFormData,
        amount: parseFloat(editFormData.amount) || 0,
        type: editFormData.type.toLowerCase().trim(),
        date: editFormData.date
      };
      
      await transactionsAPI.update(editingTransaction, dataToUpdate);
      await fetchAllTransactions();
      
      if (Object.keys(activeFilters).length > 0) {
        handleFilterChange(activeFilters);
      }

      setEditingTransaction(null);
      setEditFormData({});
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Failed to update transaction. Please try again.');
    }
  };

  const handleEditCancel = useCallback(() => {
    setEditingTransaction(null);
    setEditFormData({});
  }, []);

  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    
    if (name === 'type') {
      setEditFormData(prev => ({
        ...prev,
        [name]: value,
        category: getAllCategories(value)[0] || 'Other'
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  }, []);

  // Calculate totals from displayed transactions
  const calculateTotals = useMemo(() => {
    const validTransactions = displayTransactions.filter(t => 
      t && typeof t.amount === 'number' && !isNaN(t.amount) && t.type
    );

    const incomeTransactions = validTransactions.filter(t => t.type === 'income');
    const expenseTransactions = validTransactions.filter(t => t.type === 'expense');
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const balance = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, balance, totalTransactions: validTransactions.length };
  }, [displayTransactions]);

  const formatCurrency = useCallback((amount) => {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  }, []);

  const formatDate = useCallback((dateString) => {
    try {
      if (!dateString) return 'Invalid Date';
      
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }, []);

  // Show authentication error if not logged in
  if (authChecked && !isAuthenticated) {
    return (
      <div className="container">
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          margin: '2rem auto',
          maxWidth: '500px'
        }}>
          <AlertCircle size={48} style={{ color: '#dc3545', marginBottom: '1rem' }} />
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Authentication Required</h2>
          <p style={{ color: '#666', marginBottom: '2rem' }}>
            Please log in to view your financial dashboard and transactions.
          </p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="btn btn-primary"
            style={{
              background: '#007bff',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <RefreshCw size={48} style={{ animation: 'spin 1s linear infinite', color: '#007bff', marginBottom: '1rem' }} />
          <div>Loading transactions...</div>
          <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
            {debugInfo.fetchStatus && `Status: ${debugInfo.fetchStatus}`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard">
        <div className="dashboard-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Financial Dashboard</h1>
            <button 
              onClick={handleRefresh}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#6c757d',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {/* Debug Information Panel (only show if there are issues) */}
          {(error || Object.keys(debugInfo).length > 0) && (
            <details style={{ 
              marginTop: '1rem', 
              padding: '1rem', 
              background: '#f8f9fa', 
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                🔍 Debug Information
              </summary>
              <div style={{ marginTop: '0.5rem' }}>
                <div><strong>Authentication:</strong> {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</div>
                <div><strong>Token Present:</strong> {debugInfo.tokenExists ? '✅ Yes' : '❌ No'}</div>
                <div><strong>Total Transactions:</strong> {allTransactions.length}</div>
                <div><strong>Displayed Transactions:</strong> {displayTransactions.length}</div>
                <div><strong>Last Fetch:</strong> {debugInfo.lastFetch || 'Never'}</div>
                <div><strong>Fetch Status:</strong> {debugInfo.fetchStatus || 'Unknown'}</div>
                {debugInfo.lastError && (
                  <div><strong>Last Error:</strong> <span style={{ color: '#dc3545' }}>{debugInfo.lastError}</span></div>
                )}
              </div>
            </details>
          )}

          {error && (
            <div className="alert alert-danger" style={{ 
              marginTop: '1rem',
              padding: '1rem',
              background: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '6px',
              color: '#721c24'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={20} />
                <strong>Error:</strong> {error}
              </div>
              <button 
                onClick={handleRefresh}
                style={{
                  marginTop: '0.5rem',
                  background: '#721c24',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Filter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            {isFiltering && (
              <span style={{ color: '#666', fontSize: '0.9rem' }}>
                Applying filters...
              </span>
            )}
            
            {Object.keys(activeFilters).some(key => activeFilters[key] && (Array.isArray(activeFilters[key]) ? activeFilters[key].length > 0 : activeFilters[key] !== '')) && (
              <span style={{ color: '#007bff', fontSize: '0.9rem' }}>
                Showing {displayTransactions.length} of {allTransactions.length} transactions
              </span>
            )}
          </div>
          
          <button 
            className="btn btn-primary" 
            onClick={onAddTransaction}
            style={{
              background: '#007bff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Add Transaction
          </button>
        </div>

        {/* Filter Component */}
        {showFilters && (
          <FilterComponent
            onFilterChange={handleFilterChange}
            availableCategories={getAllUniqueCategories}
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Stats Cards */}
        <div className="dashboard-stats" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div className="stat-card" style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
            textAlign: 'center',
            borderLeft: `4px solid ${calculateTotals.balance >= 0 ? '#28a745' : '#dc3545'}`
          }}>
            <div className="stat-value" style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: calculateTotals.balance >= 0 ? '#28a745' : '#dc3545',
              marginBottom: '0.5rem'
            }}>
              {formatCurrency(calculateTotals.balance)}
            </div>
            <div className="stat-label" style={{ color: '#666', fontSize: '0.9rem' }}>
              Current Balance
            </div>
          </div>
          
          <div className="stat-card" style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
            textAlign: 'center',
            borderLeft: '4px solid #28a745'
          }}>
            <div className="stat-value" style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: '#28a745',
              marginBottom: '0.5rem'
            }}>
              {formatCurrency(calculateTotals.totalIncome)}
            </div>
            <div className="stat-label" style={{ color: '#666', fontSize: '0.9rem' }}>
              Total Income
            </div>
          </div>
          
          <div className="stat-card" style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
            textAlign: 'center',
            borderLeft: '4px solid #dc3545'
          }}>
            <div className="stat-value" style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: '#dc3545',
              marginBottom: '0.5rem'
            }}>
              {formatCurrency(calculateTotals.totalExpenses)}
            </div>
            <div className="stat-label" style={{ color: '#666', fontSize: '0.9rem' }}>
              Total Expenses
            </div>
          </div>
          
          <div className="stat-card" style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
            textAlign: 'center',
            borderLeft: '4px solid #007bff'
          }}>
            <div className="stat-value" style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: '#007bff',
              marginBottom: '0.5rem'
            }}>
              {calculateTotals.totalTransactions}
            </div>
            <div className="stat-label" style={{ color: '#666', fontSize: '0.9rem' }}>
              Total Transactions
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="transactions-section" style={{ 
          background: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
        }}>
          <div className="transactions-header" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '1.5rem' 
          }}>
            <h3 style={{ margin: 0, color: '#333' }}>
              {Object.keys(activeFilters).some(key => activeFilters[key] && (Array.isArray(activeFilters[key]) ? activeFilters[key].length > 0 : activeFilters[key] !== '')) 
                ? `Filtered Transactions (${displayTransactions.length})` 
                : 'Recent Transactions'
              }
            </h3>
            <button 
              className="btn btn-primary" 
              onClick={onAddTransaction}
              style={{
                background: '#007bff',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Add Transaction
            </button>
          </div>
          
          <div className="transactions-list">
            {displayTransactions.length === 0 ? (
              <div style={{ 
                padding: '3rem', 
                textAlign: 'center', 
                color: '#666',
                fontSize: '1.1rem'
              }}>
                {allTransactions.length === 0 
                  ? 'No transactions found. Add your first transaction to get started!'
                  : 'No transactions match your current filters. Try adjusting your filter criteria.'
                }
              </div>
            ) : (
              displayTransactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10)
                .map(transaction => (
                  <div 
                    key={transaction.id} 
                    className="transaction-item"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '8px',
                      marginBottom: '0.75rem',
                      background: '#fafafa',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {editingTransaction === transaction.id ? (
                      <form onSubmit={handleEditSubmit} style={{ width: '100%' }}>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Type</label>
                            <select
                              name="type"
                              value={editFormData.type}
                              onChange={handleEditChange}
                              className="form-control"
                              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                              required
                            >
                              <option value="income">Income</option>
                              <option value="expense">Expense</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Category</label>
                            <select
                              name="category"
                              value={editFormData.category}
                              onChange={handleEditChange}
                              className="form-control"
                              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                              required
                            >
                              {getAllCategories(editFormData.type).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Amount</label>
                            <input
                              type="number"
                              name="amount"
                              value={editFormData.amount}
                              onChange={handleEditChange}
                              className="form-control"
                              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                              placeholder="Amount"
                              step="0.01"
                              min="0"
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Date</label>
                            <input
                              type="date"
                              name="date"
                              value={editFormData.date}
                              onChange={handleEditChange}
                              className="form-control"
                              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                              required
                            />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Notes</label>
                          <input
                            type="text"
                            name="notes"
                            value={editFormData.notes}
                            onChange={handleEditChange}
                            className="form-control"
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                            placeholder="Notes (optional)"
                          />
                        </div>
                        <div className="form-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            type="submit" 
                            className="btn btn-success btn-small"
                            style={{ 
                              background: '#28a745', 
                              border: 'none', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '4px', 
                              color: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-small" 
                            onClick={handleEditCancel}
                            style={{ 
                              background: '#6c757d', 
                              border: 'none', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '4px', 
                              color: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="transaction-details" style={{ flex: 1 }}>
                          <div className="transaction-category" style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.75rem', 
                            marginBottom: '0.5rem' 
                          }}>
                            <span 
                              className={`transaction-type-badge ${transaction.type}`}
                              style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                background: transaction.type === 'income' ? '#d4edda' : '#f8d7da',
                                color: transaction.type === 'income' ? '#155724' : '#721c24',
                                border: `1px solid ${transaction.type === 'income' ? '#c3e6cb' : '#f5c6cb'}`
                              }}
                            >
                              {transaction.type === 'income' ? 'INCOME' : 'EXPENSE'}
                            </span>
                            <span className="category-name" style={{ fontWeight: '500', color: '#333' }}>
                              {transaction.category}
                            </span>
                          </div>
                          <div className="transaction-date" style={{ fontSize: '0.9rem', color: '#666' }}>
                            {formatDate(transaction.date)}
                            {transaction.notes && (
                              <span className="transaction-notes" style={{ 
                                fontStyle: 'italic', 
                                color: '#888' 
                              }}>
                                • {transaction.notes}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="transaction-amount-actions" style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '1rem' 
                        }}>
                          <div 
                            className={`transaction-amount ${transaction.type}`}
                            style={{
                              fontSize: '1.25rem',
                              fontWeight: 'bold',
                              color: transaction.type === 'income' ? '#28a745' : '#dc3545'
                            }}
                          >
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                          </div>
                          <div className="transaction-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-secondary btn-small"
                              onClick={() => handleEdit(transaction)}
                              style={{
                                background: '#6c757d',
                                border: 'none',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => handleDelete(transaction.id)}
                              style={{
                                background: '#dc3545',
                                border: 'none',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
            )}
          </div>
          
          {displayTransactions.length > 10 && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '1rem', 
              color: '#666',
              fontSize: '0.9rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '6px'
            }}>
              Showing 10 most recent transactions out of {displayTransactions.length} filtered transactions
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;




