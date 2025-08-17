import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('API Request:', config.method.toUpperCase(), config.url, config.data); // Debug log
  return config;
});

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
};

// Transactions API

export const transactionsAPI = {
  // Get all transactions
  getAll: () => {
    return api.get('/transactions').then(response => {
      console.log('getAll response:', response.data);
      return { data: response.data }; // Your backend returns array directly
    });
  },
  
  // Create new transaction
  create: (data) => {
    console.log('Creating transaction with data:', data);
    return api.post('/transactions', data).then(response => {
      console.log('create response:', response.data);
      return { data: response.data }; // Your backend returns single object
    });
  },
  
  // Update transaction
  update: (id, data) => {
    console.log('Updating transaction', id, 'with data:', data);
    return api.put(`/transactions/${id}`, data).then(response => {
      console.log('update response:', response.data);
      return { data: response.data };
    });
  },
  
  // Delete transaction
  delete: (id) => {
    console.log('Deleting transaction', id);
    return api.delete(`/transactions/${id}`).then(response => {
      console.log('delete response:', response.data);
      return { data: response.data };
    });
  }
};

// Reports API
export const reportsAPI = {
  getReports: () => api.get('/reports'),
};

export default api








