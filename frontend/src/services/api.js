import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
});

// Add token to requests with better error handling
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token found and added to request');
    } else {
      console.warn('⚠️ No authentication token found in localStorage');
    }
    console.log('🚀 API Request:', config.method.toUpperCase(), config.url);
    console.log('📤 Request data:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    console.log('📥 Response data:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.config?.url);
    console.error('📥 Error response:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.error('🔒 Authentication failed - redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // You might want to redirect to login page here
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (userData) => {
    try {
      console.log('📝 Attempting registration...');
      return await api.post('/auth/register', userData);
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  },
  
  login: async (credentials) => {
    try {
      console.log('🔐 Attempting login...');
      return await api.post('/auth/login', credentials);
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  },
};

// Transactions API with enhanced error handling
export const transactionsAPI = {
  // Get all transactions
  getAll: async () => {
    try {
      console.log('📊 Fetching all transactions...');
      const response = await api.get('/transactions');
      console.log('✅ Transactions fetched successfully:', response.data.length, 'transactions');
      return { data: response.data };
    } catch (error) {
      console.error('❌ Failed to fetch transactions:', error);
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to server. Make sure the backend is running on http://localhost:5000');
      }
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please login again.');
      }
      if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      }
      throw new Error(error.response?.data?.message || 'Failed to load transactions');
    }
  },
  
  // Create new transaction
  create: async (data) => {
    try {
      console.log('➕ Creating new transaction:', data);
      const response = await api.post('/transactions', data);
      console.log('✅ Transaction created successfully');
      return { data: response.data };
    } catch (error) {
      console.error('❌ Failed to create transaction:', error);
      throw new Error(error.response?.data?.message || 'Failed to create transaction');
    }
  },
  
  // Update transaction
  update: async (id, data) => {
    try {
      console.log('✏️ Updating transaction:', id, data);
      const response = await api.put(`/transactions/${id}`, data);
      console.log('✅ Transaction updated successfully');
      return { data: response.data };
    } catch (error) {
      console.error('❌ Failed to update transaction:', error);
      throw new Error(error.response?.data?.message || 'Failed to update transaction');
    }
  },
  
  // Delete transaction
  delete: async (id) => {
    try {
      console.log('🗑️ Deleting transaction:', id);
      const response = await api.delete(`/transactions/${id}`);
      console.log('✅ Transaction deleted successfully');
      return { data: response.data };
    } catch (error) {
      console.error('❌ Failed to delete transaction:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete transaction');
    }
  }
};

// Enhanced Reports API
export const reportsAPI = {
  // Original monthly report (specific month)
  getReports: async (month) => {
    try {
      console.log('📈 Fetching monthly report for:', month);
      const response = await api.get(`/reports?month=${month}`);
      console.log('✅ Monthly report fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch monthly report:', error);
      throw new Error(error.response?.data?.message || 'Failed to load monthly report');
    }
  },
  
  // Weekly reports
  getWeeklyReports: async (week) => {
    try {
      console.log('📊 Fetching weekly report for:', week);
      const response = await api.get(`/reports/weekly?week=${week}`);
      console.log('✅ Weekly report fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch weekly report:', error);
      throw new Error(error.response?.data?.message || 'Failed to load weekly report');
    }
  },
  
  // Monthly reports (yearly overview with monthly breakdown)
  getMonthlyReports: async (year) => {
    try {
      console.log('📅 Fetching yearly report for:', year);
      const response = await api.get(`/reports/monthly?year=${year}`);
      console.log('✅ Yearly report fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch yearly report:', error);
      throw new Error(error.response?.data?.message || 'Failed to load yearly report');
    }
  },
  
  // General overview
  getReportsOverview: async () => {
    try {
      console.log('📋 Fetching reports overview...');
      const response = await api.get('/reports/overview');
      console.log('✅ Reports overview fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch reports overview:', error);
      throw new Error(error.response?.data?.message || 'Failed to load reports overview');
    }
  },
};

export default api;

// Test function to check backend connectivity
export const testBackendConnection = async () => {
  try {
    console.log('🔍 Testing backend connection...');
    const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
    console.log('✅ Backend connection test result:', response.status);
    return response.ok;
  } catch (error) {
    console.error('❌ Backend connection test failed:', error);
    return false;
  }
};