// reportRoutes.js
const express = require('express');

const { generateReport } = require('./ReportController');

const router = express.Router();

router.post('/generate-report', generateReport);

module.exports = router;


