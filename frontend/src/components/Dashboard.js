import React, { useState, useEffect } from 'react';
import { transactionsAPI } from '../services/api';

const Dashboard = ({ onAddTransaction }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [customCategories, setCustomCategories] = useState({
    income: [],
    expense: []
  });

  const defaultCategories = {
    expense: ['Food', 'Rent', 'Bills', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare', 'Utilities', 'Other'],
    income: ['Salary', 'Scholarship', 'Freelance', 'Investment', 'Business', 'Gift', 'Bonus', 'Other']
  };

  const getAllCategories = (type) => {
    return [...defaultCategories[type], ...customCategories[type]];
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await transactionsAPI.getAll();
      console.log('Fetched transactions:', response.data); // Debug log
      
      // Ensure we have an array and normalize the data
      const transactionsData = Array.isArray(response.data) ? response.data : [];
      
      // Normalize transaction data
      const normalizedTransactions = transactionsData.map(transaction => ({
        ...transaction,
        amount: parseFloat(transaction.amount) || 0,
        date: transaction.date ? transaction.date.split('T')[0] : new Date().toISOString().split('T')[0],
        type: (transaction.type || 'expense').toLowerCase().trim(), // Ensure lowercase and trimmed
        category: transaction.category || 'Other',
        notes: transaction.notes || ''
      }));
      
      console.log('Normalized transactions:', normalizedTransactions); // Debug log
      setTransactions(normalizedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions. Please try again.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionsAPI.delete(id);
        setTransactions(transactions.filter(t => t.id !== id));
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setError('Failed to delete transaction. Please try again.');
      }
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction.id);
    setEditFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      date: transaction.date,
      notes: transaction.notes || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToUpdate = {
        ...editFormData,
        amount: parseFloat(editFormData.amount) || 0,
        type: editFormData.type.toLowerCase().trim() // Ensure consistent format
      };
      
      const response = await transactionsAPI.update(editingTransaction, dataToUpdate);
      
      // Normalize the updated transaction
      const updatedTransaction = {
        ...response.data,
        amount: parseFloat(response.data.amount) || 0,
        date: response.data.date ? response.data.date.split('T')[0] : response.data.date,
        type: (response.data.type || 'expense').toLowerCase().trim()
      };
      
      setTransactions(transactions.map(t => 
        t.id === editingTransaction ? updatedTransaction : t
      ));
      setEditingTransaction(null);
      setEditFormData({});
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError('Failed to update transaction. Please try again.');
    }
  };

  const handleEditCancel = () => {
    setEditingTransaction(null);
    setEditFormData({});
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'type') {
      // Reset category when transaction type changes
      setEditFormData({
        ...editFormData,
        [name]: value,
        category: getAllCategories(value)[0] || 'Other'
      });
    } else {
      setEditFormData({
        ...editFormData,
        [name]: value
      });
    }
  };

  // Calculate totals with better error handling and debugging
  const calculateTotals = () => {
    const validTransactions = transactions.filter(t => 
      t && typeof t.amount === 'number' && !isNaN(t.amount) && t.type
    );

    console.log('Valid transactions for calculation:', validTransactions); // Debug log
    console.log('Transaction types found:', [...new Set(validTransactions.map(t => t.type))]); // Debug log

    const incomeTransactions = validTransactions.filter(t => t.type === 'income');
    const expenseTransactions = validTransactions.filter(t => t.type === 'expense');
    
    console.log('Income transactions:', incomeTransactions); // Debug log
    console.log('Expense transactions:', expenseTransactions); // Debug log

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const balance = totalIncome - totalExpenses;

    console.log('Calculated totals:', { totalIncome, totalExpenses, balance }); // Debug log

    return { totalIncome, totalExpenses, balance, totalTransactions: validTransactions.length };
  };

  const { totalIncome, totalExpenses, balance, totalTransactions } = calculateTotals();

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    maximumFractionDigits: 0
    }).format(numAmount);
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Invalid Date';
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
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>Loading transactions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard">
        <div className="dashboard-header">
          <h1> Financial Dashboard</h1>
          {error && (
            <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
              {error}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="stat-card" style={{ 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
            textAlign: 'center',
            borderLeft: `4px solid ${balance >= 0 ? '#28a745' : '#dc3545'}`
          }}>
            <div className="stat-value" style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: balance >= 0 ? '#28a745' : '#dc3545',
              marginBottom: '0.5rem'
            }}>
              {formatCurrency(balance)}
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
              {formatCurrency(totalIncome)}
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
              {formatCurrency(totalExpenses)}
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
              {totalTransactions}
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
            <h3 style={{ margin: 0, color: '#333' }}>Recent Transactions</h3>
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
            {transactions.length === 0 ? (
              <div style={{ 
                padding: '3rem', 
                textAlign: 'center', 
                color: '#666',
                fontSize: '1.1rem'
              }}>
                 No transactions found. Add your first transaction to get started!
              </div>
            ) : (
              transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort by date, newest first
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
                      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.boxShadow = 'none';
                      e.target.style.transform = 'translateY(0)';
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
                              {transaction.type === 'income' ? ' INCOME' : ' EXPENSE'}
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
                                {' '} • {transaction.notes}
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
                              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
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
                              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
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
          
          {transactions.length > 10 && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '1rem', 
              color: '#666',
              fontSize: '0.9rem',
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '6px'
            }}>
               Showing 10 most recent transactions out of {transactions.length} total
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;