import React, { useState } from 'react';
import { transactionsAPI } from '../services/api';

const AddTransaction = ({ onBack }) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    category: 'Food',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'type') {
      // Reset category when transaction type changes
      setFormData({
        ...formData,
        [name]: value,
        category: getAllCategories(value)[0] || 'Other'
      });
      setShowCustomCategory(false);
      setCustomCategory('');
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === 'add_custom') {
      setShowCustomCategory(true);
      setCustomCategory('');
    } else {
      setFormData({
        ...formData,
        category: value
      });
      setShowCustomCategory(false);
    }
  };

  const handleAddCustomCategory = () => {
    if (customCategory.trim() && !getAllCategories(formData.type).includes(customCategory.trim())) {
      const newCustomCategories = {
        ...customCategories,
        [formData.type]: [...customCategories[formData.type], customCategory.trim()]
      };
      setCustomCategories(newCustomCategories);
      setFormData({
        ...formData,
        category: customCategory.trim()
      });
      setShowCustomCategory(false);
      setCustomCategory('');
    }
  };

  const handleCancelCustomCategory = () => {
    setShowCustomCategory(false);
    setCustomCategory('');
    setFormData({
      ...formData,
      category: getAllCategories(formData.type)[0] || 'Other'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Debug log - what we're sending to API
    console.log('Sending to API:', formData);

    try {
      const response = await transactionsAPI.create(formData);
      console.log('API Response:', response); // Debug log
      
      setSuccess(true);
      setFormData({
        type: 'expense',
        category: 'Food',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Transaction creation error:', error); // Debug log
      console.error('Error response:', error.response); // Debug log
      setError(error.response?.data?.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="transaction-form">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Add Transaction</h2>
        
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            Transaction added successfully!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="type">Transaction Type</label>
            <select
              id="type"
              name="type"
              className="form-control"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              {!showCustomCategory ? (
                <select
                  id="category"
                  name="category"
                  className="form-control"
                  value={formData.category}
                  onChange={handleCategoryChange}
                  required
                >
                  {getAllCategories(formData.type).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                  <option value="add_custom">+ Add Custom Category</option>
                </select>
              ) : (
                <div className="custom-category-input">
                  <input
                    type="text"
                    className="form-control"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder={`Enter new ${formData.type} category...`}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <div className="custom-category-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={handleAddCustomCategory}
                      disabled={!customCategory.trim()}
                      style={{ marginRight: '0.5rem' }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={handleCancelCustomCategory}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount</label>
              <input
                type="number"
                id="amount"
                name="amount"
                className="form-control"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              className="form-control"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <input
              type="text"
              id="notes"
              name="notes"
              className="form-control"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              Back to Dashboard
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransaction;