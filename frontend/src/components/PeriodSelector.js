import React, { useState, useEffect } from 'react';
import { Calendar, Filter } from 'lucide-react';

const PeriodSelector = ({ onPeriodChange, onFiltersChange }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    type: 'all'
  });
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const periodOptions = [
    { value: 'today', label: 'Today', type: 'predefined' },
    { value: 'yesterday', label: 'Yesterday', type: 'predefined' },
    { value: 'last7days', label: 'Last 7 Days', type: 'predefined' },
    { value: 'last30days', label: 'Last 30 Days', type: 'predefined' },
    { value: 'thisMonth', label: 'This Month', type: 'predefined' },
    { value: 'lastMonth', label: 'Last Month', type: 'predefined' },
    { value: 'thisYear', label: 'This Year', type: 'predefined' },
    { value: 'lastYear', label: 'Last Year', type: 'predefined' },
    { value: 'custom', label: 'Custom Date Range', type: 'custom' }
  ];

  // Fetch available categories for filtering
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/reports/categories', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAvailableCategories(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Initialize with default period ONLY ONCE
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      handlePeriodSubmit('thisMonth');
    }
  }, [hasInitialized]);

  const handlePeriodSubmit = (periodValue = selectedPeriod) => {
    const selectedOption = periodOptions.find(option => option.value === periodValue);
    
    if (selectedOption?.type === 'predefined') {
      onPeriodChange({
        type: 'predefined',
        period: periodValue,
        filters: filters
      });
    } else if (selectedOption?.type === 'custom') {
      if (!customStartDate || !customEndDate) {
        alert('Please select both start and end dates for custom period');
        return;
      }

      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      
      if (start > end) {
        alert('Start date must be before or equal to end date');
        return;
      }

      onPeriodChange({
        type: 'custom',
        startDate: customStartDate,
        endDate: customEndDate,
        filters: filters
      });
    }
  };

  const handlePeriodChange = (e) => {
    const newPeriod = e.target.value;
    setSelectedPeriod(newPeriod);
    
    // If it's not custom, submit immediately
    if (newPeriod !== 'custom') {
      handlePeriodSubmit(newPeriod);
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
    
    // Re-apply current period with new filters
    setTimeout(() => {
      handlePeriodSubmit();
    }, 100);
  };

  const setLast30Days = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    setCustomStartDate(start.toISOString().split('T')[0]);
    setCustomEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className="period-selector-container">
      <div className="stat-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} />
            Report Period
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary btn-small"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Filter size={16} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Period Selection Dropdown */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Select Period:
          </label>
          <select
            value={selectedPeriod}
            onChange={handlePeriodChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Range Inputs */}
        {selectedPeriod === 'custom' && (
          <div style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px', 
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#f9fafb'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Start Date:
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  End Date:
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={setLast30Days}
                className="btn btn-secondary btn-small"
              >
                Set Last 30 Days
              </button>
              <button 
                onClick={() => handlePeriodSubmit()}
                className="btn btn-primary btn-small"
                disabled={!customStartDate || !customEndDate}
              >
                Apply Custom Period
              </button>
            </div>
          </div>
        )}

        {/* Filters Section */}
        {showFilters && (
          <div style={{ 
            borderTop: '1px solid #e5e7eb', 
            paddingTop: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            padding: '1rem'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600' }}>
              Filter Options
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Transaction Type:
                </label>
                <select 
                  value={filters.type} 
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="income">Income Only</option>
                  <option value="expense">Expenses Only</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Category:
                </label>
                <select 
                  value={filters.category} 
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button 
                onClick={() => {
                  setFilters({ category: 'all', type: 'all' });
                  setSelectedPeriod('thisMonth');
                  handlePeriodSubmit('thisMonth');
                }}
                className="btn btn-secondary btn-small"
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PeriodSelector;