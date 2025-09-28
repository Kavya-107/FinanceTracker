import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
});

// Enhanced request interceptor with better debugging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Enhanced debug logging
    console.group(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`);
    console.log('Full URL:', `${config.baseURL}${config.url}`);
    console.log('Headers:', config.headers);
    console.log('Data:', config.data);
    console.log('Token present:', !!token);
    console.groupEnd();
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    console.group(`✅ API Response: ${response.status} ${response.config.method.toUpperCase()} ${response.config.url}`);
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    console.log('Data type:', typeof response.data);
    console.log('Is Array:', Array.isArray(response.data));
    console.groupEnd();
    
    return response;
  },
  (error) => {
    console.group(`❌ API Error: ${error.response?.status || 'Network Error'}`);
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Message:', error.response?.data?.message || error.message);
    console.log('Full Error Data:', error.response?.data);
    console.log('Request URL:', error.config?.url);
    console.log('Request Method:', error.config?.method);
    
    // Check for common issues
    if (error.response?.status === 401) {
      console.warn('🔐 Authentication issue - token may be invalid or expired');
      // Optionally redirect to login
      // window.location.href = '/login';
    } else if (error.response?.status === 404) {
      console.warn('🔍 Endpoint not found - check backend routes');
    } else if (!error.response) {
      console.warn('🌐 Network error - check if backend is running');
    }
    
    console.groupEnd();
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      console.log('✅ Registration successful');
      return response;
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data || error.message);
      throw error;
    }
  },
  
  login: async (credentials) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      console.log('✅ Login successful');
      
      // Store token
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        console.log('🔑 Token stored in localStorage');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    console.log('🚪 User logged out, token removed');
  },
  
  checkAuth: () => {
    const token = localStorage.getItem('token');
    console.log('🔍 Checking authentication:', !!token);
    return !!token;
  }
};

// Enhanced Transactions API with better error handling
export const transactionsAPI = {
  // Get all transactions with enhanced debugging
 // Fixed getAll method
getAll: async () => {
  try {
    console.log('📊 Fetching all transactions...');
    
    // Check authentication first
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found. Please login.');
    }
    
    const response = await api.get('/api/transactions');
    
    // Validate response structure
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response structure');
    }
    
    if (!response.data) {
      throw new Error('No data in response');
    }
    
    // The backend already returns { success: true, data: [...] }
    // So we should return the response directly, not wrap it again
    console.log(`📈 Successfully fetched ${response.data.data?.length || 0} transactions`);
    
    return response; // ✅ Return backend response directly
    
  } catch (error) {
    console.error('💥 Failed to fetch transactions:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      isNetworkError: !error.response
    });
    
    // Re-throw with more context
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    } else if (error.response?.status === 404) {
      throw new Error('Transactions endpoint not found. Check backend configuration.');
    } else if (!error.response) {
      throw new Error('Network error. Please check if the backend server is running.');
    } else {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch transactions');
    }
  }
},
  
  // Create new transaction
  create: async (data) => {
    try {
      console.log('💾 Creating transaction with data:', data);
      
      // Validate required fields
      if (!data.amount || !data.type || !data.category) {
        throw new Error('Missing required fields: amount, type, or category');
      }
      
      const response = await api.post('/api/transactions', data);
      console.log('✅ Transaction created successfully');
      
      return { data: response.data };
      
    } catch (error) {
      console.error('❌ Failed to create transaction:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Failed to create transaction');
    }
  },
  
  // Update transaction
  update: async (id, data) => {
    try {
      console.log(`📝 Updating transaction ${id} with data:`, data);
      
      if (!id) {
        throw new Error('Transaction ID is required for update');
      }
      
      const response = await api.put(`/api/transactions/${id}`, data);
      console.log('✅ Transaction updated successfully');
      
      return { data: response.data };
      
    } catch (error) {
      console.error('❌ Failed to update transaction:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update transaction');
    }
  },
  
  // Delete transaction
  delete: async (id) => {
    try {
      console.log(`🗑️ Deleting transaction ${id}`);
      
      if (!id) {
        throw new Error('Transaction ID is required for deletion');
      }
      
      const response = await api.delete(`/api/transactions/${id}`);
      console.log('✅ Transaction deleted successfully');
      
      return { data: response.data };
      
    } catch (error) {
      console.error('❌ Failed to delete transaction:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Failed to delete transaction');
    }
  }
};

// Reports API
export const reportsAPI = {
  getReports: async () => {
    try {
      console.log('📊 Fetching reports...');
      const response = await api.get('/api/reports');
      return response;
    } catch (error) {
      console.error(' Failed to fetch reports:', error.response?.data || error.message);
      throw error;
    }
  }
};

// Utility function to test API connection
export const testConnection = async () => {
  try {
    console.log(' Testing API connection...');
    const response = await api.get('/api/health'); // Add a health check endpoint in your backend
    console.log(' API connection successful');
    return true;
  } catch (error) {
    console.error(' API connection failed:', error.message);
    return false;
  }
};

export default api;