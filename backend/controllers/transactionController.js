const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Get all transactions for a user
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const transactions = await Transaction.find({ 
      userId: new mongoose.Types.ObjectId(userId) 
    }).sort({ date: -1 });
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transactions',
      error: error.message
    });
  }
};

// Filter transactions based on criteria
const filterTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      categories,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      searchText,
      type
    } = req.query;

    console.log('Filter request:', req.query);

    // Build the query object
    let query = { userId: new mongoose.Types.ObjectId(userId) };

    // Category filter
    if (categories) {
      const categoryArray = Array.isArray(categories) ? categories : categories.split(',');
      if (categoryArray.length > 0) {
        query.category = { $in: categoryArray };
      }
    }

    // Type filter
    if (type && type !== '') {
      query.type = type.toLowerCase();
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount && parseFloat(minAmount) >= 0) {
        query.amount.$gte = parseFloat(minAmount);
      }
      if (maxAmount && parseFloat(maxAmount) >= 0) {
        query.amount.$lte = parseFloat(maxAmount);
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day and set to start of day to include the entire end date
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        endDateTime.setHours(0, 0, 0, 0);
        query.date.$lt = endDateTime;
      }
    }

    // Search text filter (search in category and notes)
    if (searchText && searchText.trim() !== '') {
      const searchRegex = new RegExp(searchText.trim(), 'i');
      query.$or = [
        { category: searchRegex },
        { notes: searchRegex }
      ];
    }

    console.log('MongoDB Query:', JSON.stringify(query, null, 2));

    const transactions = await Transaction.find(query).sort({ date: -1 });

    console.log(`Found ${transactions.length} transactions matching filters`);

    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Error filtering transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while filtering transactions',
      error: error.message
    });
  }
};

// Get a single transaction
const getTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.id;

    const transaction = await Transaction.findOne({ 
      _id: new mongoose.Types.ObjectId(transactionId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching transaction',
      error: error.message
    });
  }
};

// Create a new transaction
const createTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, category, amount, date, notes } = req.body;

    // Validate required fields
    if (!type || !category || !amount || !date) {
      return res.status(400).json({
        success: false,
        message: 'Type, category, amount, and date are required'
      });
    }

    // Validate type
    if (!['income', 'expense'].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "income" or "expense"'
      });
    }

    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // Validate date
    const transactionDate = new Date(date);
    if (isNaN(transactionDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const transaction = new Transaction({
      userId: new mongoose.Types.ObjectId(userId),
      type: type.toLowerCase().trim(),
      category: category.trim(),
      amount: numAmount,
      date: transactionDate,
      notes: notes ? notes.trim() : ''
    });

    const savedTransaction = await transaction.save();

    res.status(201).json({
      success: true,
      data: savedTransaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating transaction',
      error: error.message
    });
  }
};

// Update a transaction
const updateTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.id;
    const { type, category, amount, date, notes } = req.body;

    // Find the transaction first
    const existingTransaction = await Transaction.findOne({
      _id: new mongoose.Types.ObjectId(transactionId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Validate updates
    const updates = {};

    if (type !== undefined) {
      if (!['income', 'expense'].includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Type must be either "income" or "expense"'
        });
      }
      updates.type = type.toLowerCase().trim();
    }

    if (category !== undefined) {
      if (!category.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be empty'
        });
      }
      updates.category = category.trim();
    }

    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }
      updates.amount = numAmount;
    }

    if (date !== undefined) {
      const transactionDate = new Date(date);
      if (isNaN(transactionDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
      updates.date = transactionDate;
    }

    if (notes !== undefined) {
      updates.notes = notes.trim();
    }

    const updatedTransaction = await Transaction.findOneAndUpdate(
      { 
        _id: new mongoose.Types.ObjectId(transactionId),
        userId: new mongoose.Types.ObjectId(userId)
      },
      updates,
      { new: true }
    );

    res.json({
      success: true,
      data: updatedTransaction,
      message: 'Transaction updated successfully'
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating transaction',
      error: error.message
    });
  }
};

// Delete a transaction
const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.id;

    const deletedTransaction = await Transaction.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(transactionId),
      userId: new mongoose.Types.ObjectId(userId)
    });

    if (!deletedTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      data: deletedTransaction
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting transaction',
      error: error.message
    });
  }
};

module.exports = {
  getTransactions,
  filterTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction
};