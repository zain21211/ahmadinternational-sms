const express = require('express');
const invoiceControllers = require('../controllers/invoiceControllers');

const router = express.Router();

// Route to get all invoices
router.get('/', invoiceControllers.getInvoice);

// Route to get a single invoice by ID
router.get('/:id', invoiceControllers.getInvoiceByID);

module.exports = router;