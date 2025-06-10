const sql = require("mssql");
const dbConnection = require("../database/connection");

// Moved to top level
const paymentModes = {
  cash: { type: "CRV", debitAcid: 1, narrationPrefix: "pending:Cash Recd. by" },
  jazzcash: {
    type: "BRV",
    debitAcid: 1983,
    narrationPrefix: "pending: JazzCash Recd. by",
  },
  easypaisa: {
    type: "BRV",
    debitAcid: 1982,
    narrationPrefix: "pending: EasyPaisa Recd. by",
  },
  mbl: {
    type: "BRV",
    debitAcid: 326,
    narrationPrefix: "pending: OnLine Recd. by",
  },
  crownone: {
    type: "BRV",
    debitAcid: 1946,
    narrationPrefix: "pending: Lifan Wallet Amount Recd. by",
  },
};

// Moved to top level
// For dynamic debitAcid based on userType, debitAcid can be a function
const expenseMethods = {
  petrol: {
    type: "CRV",
    getDebitAcid: (userTypeString) => {
      const typeLower = userTypeString ? userTypeString.toLowerCase() : "";
      return typeLower.includes("sr") ? 685 : 845;
    },
    narrationPrefix: "pending:  PETROL",
  },
  entertainment: {
    type: "CRV",
    getDebitAcid: () => 696, // No userType dependency
    narrationPrefix: "pending: ENTERTAINMENT",
  },
  bilty: {
    type: "CRV",
    getDebitAcid: () => 641,
    narrationPrefix: "pending: BILTY",
  },
  toll: {
    type: "CRV",
    getDebitAcid: (userTypeString) => {
      const typeLower = userTypeString ? userTypeString.toLowerCase() : "";
      return typeLower.includes("sr") ? 685 : typeLower.includes("kr") ? 845 : "";
    },
    narrationPrefix: "pending: TOLL",
  },
  repair: {
    type: "CRV",
    getDebitAcid: (userTypeString) => {
      const typeLower = userTypeString ? userTypeString.toLowerCase() : "";
      if (typeLower.includes("sr")) return 686;
      if (typeLower.includes("operator")) return 695;
      return 2123;
    },
    narrationPrefix: "pending: REPAIR",
  },
};

const CashEntryController = {
  insertEntry: async (req, res) => {
    const {
      paymentMethod = {},
      custId,
      receivedAmount,
      userName,
      userType, // Make sure this is provided if expense methods need it
      expenseMethod,
    } = req.body;

    // Effective date of the transaction
    const effectiveDate = req.body.date ? new Date(req.body.date) : new Date();
    // Timestamp for when the entry is recorded in the system
    const systemTimestamp = new Date();

    if (!paymentMethod || !custId || !receivedAmount || !userName) {
      return res.status(400).json({ error: "PaymentMethod, custId, receivedAmount, and userName are required.", paymentMethod, custId, receivedAmount, userName });
    }

    let selectedMethodConfig;
    let narration;

    const lowerExpenseMethod = expenseMethod ? expenseMethod.toLowerCase() : null;
    const expenseConfig = lowerExpenseMethod ? expenseMethods[lowerExpenseMethod] : null;

    if (expenseConfig) {
      if (typeof expenseConfig.getDebitAcid !== 'function') {
        console.error(`Configuration error: getDebitAcid is not a function for expenseMethod ${expenseMethod}`);
        return res.status(500).json({ error: "Server configuration error for expense method." });
      }
      // Check if userType is required for this expense method
      // This check might be more complex depending on how getDebitAcid is defined for all methods
      if (expenseMethod === "petrol" || expenseMethod === "toll" || expenseMethod === "repair") {
        if (!userType) {
            return res.status(400).json({ error: `UserType is required for expense method: ${expenseMethod}` });
        }
      }
      selectedMethodConfig = {
        type: expenseConfig.type,
        debitAcid: expenseConfig.getDebitAcid(userType),
        narrationPrefix: expenseConfig.narrationPrefix,
      };
      narration = `${selectedMethodConfig.narrationPrefix} ${userName}`;
    } else if (paymentMethod) {
      const lowerPaymentMethod = paymentMethod.toLowerCase();
      const paymentConfig = paymentModes[lowerPaymentMethod];
      if (!paymentConfig) {
        return res.status(400).json({ error: "Invalid payment method." });
      }
      selectedMethodConfig = paymentConfig; // debitAcid is directly available
      narration = `${selectedMethodConfig.narrationPrefix} ${userName}`;
    } else {
        // This case should ideally not be reached if the first check for paymentMethod is robust
        // and expenseMethod path is handled. Or, if expenseMethod is given, paymentMethod might be optional.
        return res.status(400).json({ error: "Either a valid payment method or expense method must be provided." });
    }
    
    if (!selectedMethodConfig) { // Should be caught by earlier checks, but as a safeguard
        return res.status(400).json({ error: "Invalid payment or expense method configuration." });
    }


    let pool; // Declare pool outside try to ensure it's available in finally if needed
    let transaction; // Declare transaction here to access in catch/finally

    try {
      pool = await dbConnection();
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      const request = new sql.Request(transaction);

      const docResult = await request
        .input("type", sql.VarChar, selectedMethodConfig.type)
        .query(
          "SELECT ISNULL(MAX(doc), 0) + 1 AS nextDoc FROM ledgers WHERE type = @type"
        );
      const nextDoc = docResult.recordset[0].nextDoc;

      // Insert credit entry (customer or entity being credited)
      await request
        .input("effDate1", sql.Date, effectiveDate) // Use effectiveDate
        .input("type1", sql.VarChar, selectedMethodConfig.type)
        .input("doc1", sql.Int, nextDoc)
        .input("acid1", sql.Int, custId)
        .input("credit", sql.Decimal(18, 2), receivedAmount)
        .input("narration1", sql.VarChar, narration)
        .input("entryBy1", sql.VarChar, userName)
        .input("entryDateTime1", sql.DateTime2, systemTimestamp) // Use systemTimestamp and DateTime2
        .query(`
          INSERT INTO ledgers (date, type, doc, acid, credit, NARRATION, EntryBy, EntryDateTime)
          VALUES (@effDate1, @type1, @doc1, @acid1, @credit, @narration1, @entryBy1, @entryDateTime1)
        `);

      // Insert debit entry (cash/bank/expense account)
      // Re-use parameters for date, type, doc, narration, entryBy, entryDateTime if they are the same.
      // Only acid and debit/credit amount change for the second leg.
      await request // request object is already bound to the transaction
        // .input("effDate2", sql.Date, effectiveDate) // Already set as effDate1, SQL Server will use it
        // .input("type2", sql.VarChar, selectedMethodConfig.type) // Already set as type1
        // .input("doc2", sql.Int, nextDoc) // Already set as doc1
        .input("acid2", sql.Int, selectedMethodConfig.debitAcid)
        .input("debit", sql.Decimal(18, 2), receivedAmount)
        // .input("narration2", sql.VarChar, narration) // Already set as narration1
        // .input("entryBy2", sql.VarChar, userName) // Already set as entryBy1
        // .input("entryDateTime2", sql.DateTime2, systemTimestamp) // Already set as entryDateTime1
        .query(`
          INSERT INTO ledgers (date, type, doc, acid, debit, NARRATION, EntryBy, EntryDateTime)
          VALUES (@effDate1, @type1, @doc1, @acid2, @debit, @narration1, @entryBy1, @entryDateTime1) 
        `);
        // Note: Reused @effDate1, @type1, @doc1, @narration1, @entryBy1, @entryDateTime1 from previous inputs.
        // This is fine as long as the request object is reused and those inputs are still in its parameters collection.
        // To be explicit, you can re-input them if desired.

      await transaction.commit();
      res.json({ success: true, doc: nextDoc });
    } catch (error) {
      console.error("Insert Entry Error:", error);
      if (transaction && transaction.rolledBack === false) { // Check if transaction exists and not already rolled back
        try {
          await transaction.rollback();
          console.log("Transaction rolled back.");
        } catch (rollbackError) {
          console.error("Rollback Error:", rollbackError);
          // Potentially log this error to a more persistent store
        }
      }
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    }
    // Removed the trailing 'd'
  },
};

module.exports = CashEntryController;