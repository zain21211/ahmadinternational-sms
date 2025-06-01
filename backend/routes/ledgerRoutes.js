const express = require('express');
const ledgerControllers = require('../controllers/ledgerContollers'); // Import your controller

const router = express.Router();

// Login route
router.get('/', ledgerControllers.getData);

module.exports = router;