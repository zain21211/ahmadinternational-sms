// routes.js or app.js
const express = require('express');
const BalanceController = require('../controllers/balanceControllers');

const router = express.Router();

router.get('/', BalanceController.getBalance);
router.get('/overdue', BalanceController.getOverDue);

module.exports = router;