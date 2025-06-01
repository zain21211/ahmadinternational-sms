const express = require('express')
const dbConnection = require('../database/connection');
const orderControllers = require("../controllers/orderControllers");

const router = express.Router();


router.post('/', orderControllers.postOrder);

module.exports = router;