const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Personal Finance Manager API with MongoDB' });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});