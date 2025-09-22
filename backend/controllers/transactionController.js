const db = require('../config/database');

const getTransactions = async (req, res) => {
  try {
    const [transactions] = await db.execute(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY dateToday DESC, created_at DESC',
      [req.user.userId]
    );
    
    // Debug log to see what's in the database
    console.log('Raw transactions from database:', transactions);
    
    // Map database fields to what frontend expects
    const mappedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type1, // Map type1 to type for frontend
      category: transaction.category,
      amount: parseFloat(transaction.amount), // Ensure it's a number
      date: transaction.dateToday, // Map dateToday to date for frontend
      notes: transaction.notes || '',
      created_at: transaction.created_at,
      updated_at: transaction.updated_at
    }));
    
    console.log('Mapped transactions being sent to frontend:', mappedTransactions);
    res.json(mappedTransactions);
  } catch (error) {
    console.error('Error in getTransactions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addTransaction = async (req, res) => {
  try {
    const { type, category, amount, date, notes } = req.body;
    
    // Debug log to see what frontend is sending
    console.log('Received transaction data from frontend:', { type, category, amount, date, notes });
    
    // Validation
    if (!type || !category || !amount || !date) {
      return res.status(400).json({
        message: 'Missing required fields: type, category, amount, date'
      });
    }
    
    // Ensure type is either 'income' or 'expense'
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        message: 'Transaction type must be either "income" or "expense"'
      });
    }
    
    // Ensure amount is positive
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a positive number'
      });
    }
    
    console.log('Inserting into database with type1 =', type, 'and dateToday =', date);
    
    // Insert using your database schema (type1, dateToday)
    const [result] = await db.execute(
      'INSERT INTO transactions (user_id, type1, category, amount, dateToday, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, type, category, numericAmount, date, notes || '']
    );

    const [newTransaction] = await db.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [result.insertId]
    );
    
    console.log('New transaction from database:', newTransaction[0]);
    
    // Map database fields back to what frontend expects
    const mappedTransaction = {
      id: newTransaction[0].id,
      type: newTransaction[0].type1, // Map type1 back to type
      category: newTransaction[0].category,
      amount: parseFloat(newTransaction[0].amount),
      date: newTransaction[0].dateToday, // Map dateToday back to date
      notes: newTransaction[0].notes || '',
      created_at: newTransaction[0].created_at
    };
    
    console.log('Mapped transaction being sent to frontend:', mappedTransaction);
    res.status(201).json(mappedTransaction);
  } catch (error) {
    console.error('Error in addTransaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, category, amount, date, notes } = req.body;
    
    // Debug log
    console.log('Updating transaction:', { id, type, category, amount, date, notes });
    
    // Validation
    if (!type || !category || !amount || !date) {
      return res.status(400).json({
        message: 'Missing required fields: type, category, amount, date'
      });
    }
    
    // Ensure type is either 'income' or 'expense'
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        message: 'Transaction type must be either "income" or "expense"'
      });
    }
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: 'Amount must be a positive number'
      });
    }

    // Update using your database schema (type1, dateToday)
    await db.execute(
      'UPDATE transactions SET type1 = ?, category = ?, amount = ?, dateToday = ?, notes = ? WHERE id = ? AND user_id = ?',
      [type, category, numericAmount, date, notes || '', id, req.user.userId]
    );

    const [updatedTransaction] = await db.execute(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );
    
    if (updatedTransaction.length === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Map database fields back to what frontend expects
    const mappedTransaction = {
      id: updatedTransaction[0].id,
      type: updatedTransaction[0].type1, // Map type1 back to type
      category: updatedTransaction[0].category,
      amount: parseFloat(updatedTransaction[0].amount),
      date: updatedTransaction[0].dateToday, // Map dateToday back to date
      notes: updatedTransaction[0].notes || '',
      updated_at: updatedTransaction[0].updated_at
    };
    
    console.log('Updated transaction being sent to frontend:', mappedTransaction);
    res.json(mappedTransaction);
  } catch (error) {
    console.error('Error in updateTransaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Deleting transaction with id:', id);
    
    const [result] = await db.execute(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    console.log('Successfully deleted transaction with id:', id);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error in deleteTransaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction
};