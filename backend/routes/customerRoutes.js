const express = require('express');
const authenticateToken = require('../middleware/tokenAuthentication');
const customerController = require('../controllers/customerControllers');

const router = express.Router();

// Route to get all customers
router.get('/', authenticateToken, customerController.getCustomers);


module.exports = router;