const express = require('express');
const { 
  getReports, 
  getWeeklyReports, 
  getMonthlyReports, 
  getReportsOverview 
} = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Existing monthly report (for specific month)
router.get('/', authMiddleware, getReports);

// Weekly reports
router.get('/weekly', authMiddleware, getWeeklyReports);

// Monthly reports (yearly overview with monthly breakdown)
router.get('/monthly', authMiddleware, getMonthlyReports);

// General overview (existing functionality)
router.get('/overview', authMiddleware, getReportsOverview);

module.exports = router;