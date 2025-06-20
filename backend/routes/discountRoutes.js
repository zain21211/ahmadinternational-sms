const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

router.get('/', discountController.getDiscount);

module.exports = router;
