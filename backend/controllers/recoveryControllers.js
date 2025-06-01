const sql = require("mssql");
const dbConnection = require("../database/connection");

const paymentModes = {
  cash: { type: 'CRV', debitAcid: 1, narrationPrefix: 'Cash Recd. by' },
  jazzcash: { type: 'BRV', debitAcid: 1983, narrationPrefix: 'JazzCash Recd. by' },
  easypaisa: { type: 'BRV', debitAcid: 1982, narrationPrefix: 'EasyPaisa Recd. by' },
  mbl: { type: 'BRV', debitAcid: 326, narrationPrefix: 'OnLine Recd. by' },
  crownone: { type: 'BRV', debitAcid: 1946, narrationPrefix: 'Lifan Wallet Amount Recd. by' },
};

const CashEntryController = {
  insertEntry: async (req, res) => {
    const { paymentMethod, custId, receivedAmount, date, userName } = req.body;

    if (!paymentMethod || !custId || !receivedAmount || !date || !userName) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const method = paymentModes[paymentMethod.toLowerCase()];
    if (!method) {
      return res.status(400).json({ error: "Invalid payment method." });
    }

    const narration = `${method.narrationPrefix} ${userName}`;

    try {
      const pool = await dbConnection();
      const transaction = new sql.Transaction(pool);

      await transaction.begin();

      const request = new sql.Request(transaction);

      // Get max(doc) for this type
      const docResult = await request
        .input("type", sql.VarChar, method.type)
        .query("SELECT ISNULL(MAX(doc), 0) + 1 AS nextDoc FROM ledgers WHERE type = @type");

      const nextDoc = docResult.recordset[0].nextDoc;

      // Insert credit entry (customer)
      await request
        .input("date1", sql.Date, date)
        .input("type1", sql.VarChar, method.type)
        .input("doc1", sql.Int, nextDoc)
        .input("acid1", sql.Int, custId)
        .input("credit", sql.Decimal(18, 2), receivedAmount)
        .input("narration1", sql.VarChar, narration)
        .input("entryBy1", sql.VarChar, userName)
        .input("entryDateTime1", sql.DateTime, new Date())
        .query(`
          INSERT INTO ledgers (date, type, doc, acid, credit, NARRATION, EntryBy, EntryDateTime)
          VALUES (@date1, @type1, @doc1, @acid1, @credit, @narration1, @entryBy1, @entryDateTime1)
        `);

      // Insert debit entry (cash/bank/etc.)
      await request
        .input("acid2", sql.Int, method.debitAcid)
        .input("debit", sql.Decimal(18, 2), receivedAmount)
        .input("narration2", sql.VarChar, narration)
        .input("entryBy2", sql.VarChar, userName)
        .input("entryDateTime2", sql.DateTime, new Date())
        .query(`
          INSERT INTO ledgers (date, type, doc, acid, debit, NARRATION, EntryBy, EntryDateTime)
          VALUES (@date1, @type1, @doc1, @acid2, @debit, @narration2, @entryBy2, @entryDateTime2)
        `);

      await transaction.commit();
      res.json({ success: true, doc: nextDoc });
    } catch (error) {
      console.error("Insert Entry Error:", error);
      res.status(500).json({ error: "Internal server error", message: error.message });
    }
  },
};

module.exports = CashEntryController;
