const express = require('express')
const orderControllers = require("../controllers/orderControllers");

const router = express.Router();


router.post('/', orderControllers.postOrder);
router.get('/doc', orderControllers.getNextDoc);
router.get('/cost', orderControllers.getCost);

module.exports = router;