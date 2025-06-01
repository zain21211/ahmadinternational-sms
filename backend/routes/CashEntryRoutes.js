const express = require("express");
const CashEntryController = require("../controllers/CashEntryControllers");


const router = express.Router();

router.post("/", CashEntryController.insertEntry);

module.exports = router;
