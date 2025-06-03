const sql = require("mssql");
const dbConnection = require("../database/connection"); // Import your database connection

const BalanceController = {
  getBalance: async (req, res) => {
    const { acid, date } = req.query; // get from query parameters

    if (!acid || !date) {
      return res.status(400).json({ error: "acid and date are required" });
    }

    try {
      // Assume you have a connected pool
      const pool = await dbConnection();

      const result = await pool
        .request()
        .input("acid", sql.VarChar, acid) // adjust type accordingly
        .input("date", sql.Date, date) // adjust type accordingly
        .query(`
        SELECT 
          SUM(ISNULL(debit, 0)) - SUM(ISNULL(credit, 0)) AS balance
        FROM ledgers
        WHERE acid = @acid AND date <= @date
      `);

      const balance = result.recordset[0]?.balance ?? 0;

      res.json({ balance });
    } catch (error) {
      console.error("DB error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    }
  },

  getOverDue: async (req, res) => {
    const { acid, date } = req.query; // get from query parameters

    if (!acid || !date) {
      return res.status(400).json({ error: "acid and date are required" });
    }

    try {
      // Assume you have a connected pool
      const pool = await dbConnection();

      const result = await pool
        .request()
        .input("acid", sql.VarChar, acid) // adjust type accordingly
        .input("date", sql.Date, date) // adjust type accordingly
        .query(`
SELECT 
  ISNULL(ROUND(SUM(debit) - SUM(credit), 0), 0) AS OverDue
FROM ledgers
WHERE acid = @acid
  AND date < DATEADD(DAY, -30, @date);


      `);

      const overDue = result.recordset[0]?.OverDue ?? null;

      res.json({ overDue });
    } catch (error) {
      console.error("DB error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    }
  },
};

module.exports = BalanceController;
