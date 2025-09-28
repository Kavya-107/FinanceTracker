const express = require('express');
const {
  getTransactions,
  filterTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction
} = require('../controllers/transactionController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Get all transactions
router.get('/', getTransactions);

// Filter transactions - NEW ENDPOINT
router.get('/filter', filterTransactions);

// Get single transaction
router.get('/:id', getTransaction);

// Create new transaction
router.post('/', createTransaction);

// Update transaction
router.put('/:id', updateTransaction);

// Delete transaction
router.delete('/:id', deleteTransaction);

module.exports = router;