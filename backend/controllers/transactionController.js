const db = require('../config/database');

const getTransactions = async (req, res) => {
  try {
    const [transactions] = await db.execute(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY dateToday DESC, created_at DESC',
      [req.user.userId]
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addTransaction = async (req, res) => {
  try {
    const { type, category, amount, date, notes } = req.body;
    
    const [result] = await db.execute(
      'INSERT INTO transactions (user_id, type1, category, amount, dateToday, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, type, category, amount, date, notes || '']
    );

    const [newTransaction] = await db.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newTransaction[0]);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, category, amount, date, notes } = req.body;

    await db.execute(
      'UPDATE transactions SET type1 = ?, category = ?, amount = ?, dateToday = ?, notes = ? WHERE id = ? AND user_id = ?',
      [type, category, amount, date, notes || '', id, req.user.userId]
    );

    const [updatedTransaction] = await db.execute(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    res.json(updatedTransaction[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.execute(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction
};