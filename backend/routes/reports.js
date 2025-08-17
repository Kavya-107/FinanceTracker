const express = require('express');
const { getReports } = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, getReports);


module.exports = router;