const express = require('express');
const router = express.Router();
const  getApplicableScheme  = require('../controllers/schemeController');

// Route: GET /api/scheme
router.get('/', getApplicableScheme.getOne);
router.get('/all', getApplicableScheme.getAll);

module.exports = router;
