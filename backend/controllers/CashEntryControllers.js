
// const sql = require("mssql");
const dbConnection = require("../database/connection");

// Moved to top level
const paymentModes = {
  cash: { type: "CRV", debitAcid: 1, narrationPrefix: "Pending - Cash Recd. by" },
  jazzcash: {
    type: "BRV",
    debitAcid: 1983,
    narrationPrefix: "Pending - JazzCash Recd. by",
  },
  easypaisa: {
    type: "BRV",
    debitAcid: 1982,
    narrationPrefix: "Pending - EasyPaisa Recd. by",
  },
  mbl: {
    type: "BRV",
    debitAcid: 326,
    narrationPrefix: "Pending - OnLine Recd. by",
  },
  crownone: {
    type: "BRV",
    debitAcid: 1946,
    narrationPrefix: "Pending -  Lifan Wallet Amount Recd. by",
  },
};

// Moved to top level
// For dynamic debitAcid based on userType, debitAcid can be a function
const expenseMethods = {
  petrol: {
    type: "CPV",
    getDebitAcid: (userTypeString) => {
      const typeLower = userTypeString ? userTypeString.toLowerCase() : "";
      return typeLower.includes("sr") ? 685 : 845;
    },
    narrationPrefix: "PETROL: CASH RECED. BY",
  },
  entertainment: {
    type: "CPV",
    getDebitAcid: () => 696, // No userType dependency
    narrationPrefix: "ENTERTAINMENT: CASH RECED. BY",
  },
  bilty: {
    type: "CPV",
    getDebitAcid: () => 641,
    narrationPrefix: "BILTY: CASH RECED. BY",
  },
  toll: {
    type: "CPV",
    getDebitAcid: (userTypeString) => {
      const typeLower = userTypeString ? userTypeString.toLowerCase() : "";
      return typeLower.includes("sr") ? 685 : typeLower.includes("kr") ? 845 : "";
    },
    narrationPrefix: "TOLL: CASH RECED. BY",
  },
  repair: {
    type: "CPV",
    getDebitAcid: (userTypeString) => {
      const typeLower = userTypeString ? userTypeString.toLowerCase() : "";
      if (typeLower.includes("sr")) return 686;
      if (typeLower.includes("operator")) return 695;
      return 2123;
    },
    narrationPrefix: "REPAIR: CASH RECED. BY",
  },
};

function getPakistanISODateString() {
  const now = new Date();
  const options = {
    timeZone: "Asia/Karachi",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  };
  
  const formatter = new Intl.DateTimeFormat("en-GB", options);
  const parts = formatter.formatToParts(now);
  const get = (type) => parts.find(p => p.type === type)?.value;
  
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");
  
  // No timezone offset for DATETIME2
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`; // Pakistan Standard Time (PKT) is UTC+5
}

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
    const effectiveDate = getPakistanISODateString();
    // Timestamp for when the entry is recorded in the system
    const systemTimestamp =getPakistanISODateString();

    console.log(`cash entry from ${userName} of ${custId} at `, effectiveDate, )

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

    console.log(`time`, effectiveDate, )
    console.log("this is narration : ", narration)

      // Insert credit entry (customer or entity being credited)
      const dateOnly = new Date().toISOString().split('T')[0]
      await request
        .input("effDate1", sql.VarChar, dateOnly) // Use effectiveDate
        .input("type1", sql.VarChar, selectedMethodConfig.type)
        .input("doc1", sql.Int, nextDoc)
        .input("acid1", sql.Int, custId)
        .input("credit", sql.Decimal(18, 2), receivedAmount)
        .input("narration1", sql.VarChar, narration)
        .input("entryBy1", sql.VarChar, userName)
        .input("entryDateTime1", sql.VarChar, systemTimestamp) // Use systemTimestamp and DateTime2
        .query(`
          INSERT INTO ledgers (date, type, doc, acid, credit, NARRATION, EntryBy, EntryDateTime)
          VALUES (@effDate1, @type1, @doc1, @acid1, @credit, @narration1, @entryBy1, @entryDateTime1)
        `);

      // Insert debit entry (cash/bank/expense account)
      await request // request object is already bound to the transaction
        .input("acid2", sql.Int, selectedMethodConfig.debitAcid)
        .input("debit", sql.Decimal(18, 2), receivedAmount)
        .query(`
    IF NOT EXISTS (
      SELECT TOP 1 * FROM ledgers
      WHERE 
        type = @type1 AND
        acid = @acid2 AND
        debit = @debit AND
        NARRATION = @narration1 AND
        ABS(DATEDIFF(SECOND, EntryDateTime, @entryDateTime1)) < 10
    )
    BEGIN
      INSERT INTO ledgers 
      (date, type, doc, acid, debit, NARRATION, EntryBy, EntryDateTime)
      VALUES 
      (@effDate1, @type1, @doc1, @acid2, @debit, @narration1, @entryBy1, @entryDateTime1)
    END
  `);


        
const entryResult = await request
  
  .query(`
    SELECT date, type, doc, acid, credit, NARRATION, EntryBy, EntryDateTime 
    FROM ledgers
    WHERE type = @type1 AND doc = @doc1
  `);

  const entry = entryResult.recordset[0];


      await transaction.commit();

      res.json({ success: true, doc: nextDoc, entry });
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