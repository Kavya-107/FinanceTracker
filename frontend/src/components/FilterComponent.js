import React, { useState } from 'react';
import { Filter, X, Calendar, Tag, DollarSign, Search, Clock } from 'lucide-react';

const FilterComponent = ({ 
  onFilterChange, 
  availableCategories = [],
  isOpen = false,
  onClose,
  showPeriodSelector = false // New prop to enable period selector
}) => {
  const [filters, setFilters] = useState({
    categories: [],
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    searchText: '',
    type: '',
    period: '' // New field for predefined periods
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Predefined periods for the selector
  const predefinedPeriods = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7days', label: 'Last 7 Days' },
    { value: 'last30days', label: 'Last 30 Days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'lastYear', label: 'Last Year' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    
    // If predefined period is selected, clear custom date range
    if (key === 'period' && value) {
      newFilters.startDate = '';
      newFilters.endDate = '';
    }
    
    // If custom date is set, clear predefined period
    if ((key === 'startDate' || key === 'endDate') && value) {
      newFilters.period = '';
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleCategoryToggle = (category) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    handleFilterChange('categories', newCategories);
  };

  const handlePeriodSelect = (period) => {
    handleFilterChange('period', period);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      categories: [],
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      searchText: '',
      type: '',
      period: ''
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (filters.minAmount) count++;
    if (filters.maxAmount) count++;
    if (filters.searchText) count++;
    if (filters.type) count++;
    if (filters.period) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  if (!isOpen) return null;

  return (
    <div className="filter-panel" style={{
      background: 'white',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      border: '1px solid #e9ecef'
    }}>
      {/* Filter Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={20} color="#666" />
          <h4 style={{ margin: 0, color: '#333' }}>Filter Transactions</h4>
          {activeFilterCount > 0 && (
            <span style={{
              background: '#007bff',
              color: 'white',
              borderRadius: '12px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={clearAllFilters}
            className="btn btn-secondary btn-small"
            disabled={activeFilterCount === 0}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              opacity: activeFilterCount === 0 ? 0.5 : 1,
              background: '#6c757d',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: activeFilterCount === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-small"
            style={{ 
              padding: '0.5rem',
              background: '#6c757d',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Period Selector (if enabled) */}
      {showPeriodSelector && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            <Clock size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Quick Period Selection
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            {predefinedPeriods.map(period => (
              <button
                key={period.value}
                type="button"
                onClick={() => handlePeriodSelect(period.value)}
                className={`btn btn-small ${filters.period === period.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '0.75rem 0.5rem',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  background: filters.period === period.value ? '#007bff' : '#f8f9fa',
                  color: filters.period === period.value ? 'white' : '#333',
                  border: `1px solid ${filters.period === period.value ? '#007bff' : '#dee2e6'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (filters.period !== period.value) {
                    e.target.style.background = '#e9ecef';
                  }
                }}
                onMouseOut={(e) => {
                  if (filters.period !== period.value) {
                    e.target.style.background = '#f8f9fa';
                  }
                }}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Basic Filters */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {/* Search Text */}
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            <Search size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Search
          </label>
          <input
            type="text"
            placeholder="Search in category/notes..."
            value={filters.searchText}
            onChange={(e) => handleFilterChange('searchText', e.target.value)}
            className="form-control"
            style={{ 
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>

        {/* Transaction Type */}
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="form-control"
            style={{ 
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* Amount Range */}
        <div className="form-group">
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            <DollarSign size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Amount Range
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              placeholder="Min"
              value={filters.minAmount}
              onChange={(e) => handleFilterChange('minAmount', e.target.value)}
              className="form-control"
              style={{ 
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxAmount}
              onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
              className="form-control"
              style={{ 
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Custom Date Range (only show if no period selected) */}
      {!filters.period && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            <Calendar size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Custom Date Range
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="form-control"
              style={{ 
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="form-control"
              style={{ 
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      )}

      {/* Expandable Advanced Filters */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="btn btn-secondary btn-small"
          style={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <span>Advanced Filters</span>
          <span>{isExpanded ? '▲' : '▼'}</span>
        </button>

        {isExpanded && (
          <div style={{ 
            marginTop: '1rem',
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            {/* Categories */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                <Tag size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Categories
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '0.5rem',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {availableCategories.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    className={`btn btn-small ${filters.categories.includes(category) ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      padding: '0.5rem',
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      background: filters.categories.includes(category) ? '#007bff' : '#f8f9fa',
                      color: filters.categories.includes(category) ? 'white' : '#333',
                      border: `1px solid ${filters.categories.includes(category) ? '#007bff' : '#dee2e6'}`,
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div style={{ 
          padding: '0.75rem',
          background: '#e7f3ff',
          borderRadius: '6px',
          fontSize: '0.85rem'
        }}>
          <strong>Active Filters:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {filters.period && (
              <span style={{ 
                background: '#17a2b8', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                Period: {predefinedPeriods.find(p => p.value === filters.period)?.label}
              </span>
            )}
            {filters.categories.length > 0 && (
              <span style={{ 
                background: '#007bff', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                Categories: {filters.categories.join(', ')}
              </span>
            )}
            {filters.type && (
              <span style={{ 
                background: '#28a745', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                Type: {filters.type}
              </span>
            )}
            {(filters.minAmount || filters.maxAmount) && (
              <span style={{ 
                background: '#ffc107', 
                color: 'black', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                Amount: {filters.minAmount || '0'} - {filters.maxAmount || '∞'}
              </span>
            )}
            {(filters.startDate || filters.endDate) && (
              <span style={{ 
                background: '#6f42c1', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                Date: {filters.startDate || 'Start'} to {filters.endDate || 'End'}
              </span>
            )}
            {filters.searchText && (
              <span style={{ 
                background: '#fd7e14', 
                color: 'white', 
                padding: '0.25rem 0.5rem', 
                borderRadius: '12px',
                fontSize: '0.75rem'
              }}>
                Search: "{filters.searchText}"
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterComponent;