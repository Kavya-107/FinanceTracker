import React, { useState } from 'react';
import { debtsAPI } from '../services/api';

const AddDebt = ({ onBack }) => {
  const [formData, setFormData] = useState({
    creditorName: '',
    debtType: 'credit_card',
    originalAmount: '',
    currentBalance: '',
    interestRate: '',
    minimumPayment: '',
    dueDate: '1',
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const debtTypes = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'personal_loan', label: 'Personal Loan' },
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'auto_loan', label: 'Auto Loan' },
    { value: 'student_loan', label: 'Student Loan' },
    { value: 'medical', label: 'Medical Debt' },
    { value: 'other', label: 'Other' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fill current balance when original amount changes
    if (name === 'originalAmount' && !formData.currentBalance) {
      setFormData(prev => ({
        ...prev,
        currentBalance: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate form data
      const originalAmount = parseFloat(formData.originalAmount);
      const currentBalance = parseFloat(formData.currentBalance);
      const interestRate = parseFloat(formData.interestRate);
      const minimumPayment = parseFloat(formData.minimumPayment);

      if (originalAmount <= 0) {
        throw new Error('Original amount must be greater than 0');
      }

      if (currentBalance < 0) {
        throw new Error('Current balance cannot be negative');
      }

      if (currentBalance > originalAmount) {
        throw new Error('Current balance cannot exceed original amount');
      }

      if (interestRate < 0 || interestRate > 100) {
        throw new Error('Interest rate must be between 0 and 100');
      }

      if (minimumPayment <= 0) {
        throw new Error('Minimum payment must be greater than 0');
      }

      const response = await debtsAPI.create(formData);
      console.log('Debt creation response:', response);
      
      setSuccess(true);
      setFormData({
        creditorName: '',
        debtType: 'credit_card',
        originalAmount: '',
        currentBalance: '',
        interestRate: '',
        minimumPayment: '',
        dueDate: '1',
        notes: ''
      });
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Debt creation error:', error);
      setError(error.message || 'Failed to add debt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="transaction-form">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Add New Debt</h2>
        
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            Debt added successfully!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="creditorName">Creditor Name</label>
              <input
                type="text"
                id="creditorName"
                name="creditorName"
                className="form-control"
                value={formData.creditorName}
                onChange={handleChange}
                placeholder="e.g., Chase Credit Card"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="debtType">Debt Type</label>
              <select
                id="debtType"
                name="debtType"
                className="form-control"
                value={formData.debtType}
                onChange={handleChange}
                required
              >
                {debtTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="originalAmount">Original Amount</label>
              <input
                type="number"
                id="originalAmount"
                name="originalAmount"
                className="form-control"
                value={formData.originalAmount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="currentBalance">Current Balance</label>
              <input
                type="number"
                id="currentBalance"
                name="currentBalance"
                className="form-control"
                value={formData.currentBalance}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="interestRate">Interest Rate (%)</label>
              <input
                type="number"
                id="interestRate"
                name="interestRate"
                className="form-control"
                value={formData.interestRate}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="minimumPayment">Minimum Payment</label>
              <input
                type="number"
                id="minimumPayment"
                name="minimumPayment"
                className="form-control"
                value={formData.minimumPayment}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">Payment Due Date (Day of Month)</label>
            <select
              id="dueDate"
              name="dueDate"
              className="form-control"
              value={formData.dueDate}
              onChange={handleChange}
              required
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              className="form-control"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any additional notes about this debt..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              Back to Debt Dashboard
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebt;