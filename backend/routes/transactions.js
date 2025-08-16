const express = require('express');
const {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction
} = require('../controllers/transactionController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getTransactions);
router.post('/', addTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;