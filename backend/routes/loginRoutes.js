const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const loginController = require('../controllers/loginControllers'); // Import your controller
const authenticateToken = require('../middleware/tokenAuthentication');

const router = express.Router();

// Login route
router.post('/', loginController);

module.exports = router;