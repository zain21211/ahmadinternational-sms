const express = require('express')
const productControllers = require('../controllers/productControllers')
const router = express.Router();


router.get('/', productControllers.getProducts);

module.exports = router;