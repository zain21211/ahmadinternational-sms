const sql = require("mssql");
const dbConnection = require("../database/connection");
const jwt = require("jsonwebtoken");

const orderControllers = {
  postOrder: async (req, res) => {
    const { products, totalAmount, doc } = req.body;

    console.log("the doc # ", doc);

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authorization token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET); // This decodes and verifies
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const { username } = decoded; // User performing the action

    let nextDoc;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products provided" });
    }

    // Assume all products have the same acid & date for this order:
    const customerAcid = products[0].acid; // Customer's account ID
    const orderDate = products[0].date; // Date of the order

    try {
      const pool = await dbConnection(); // ✅ Correct usage
      if (doc === '' || doc === null) {
        const docResult = await pool
          .request()
          .input("acid", sql.VarChar, customerAcid).query(`
          SELECT ISNULL(
            (SELECT MAX(doc)+1 FROM psproduct WHERE type='sale'),
            0
          )  AS nextDoc
        `);

        nextDoc = docResult.recordset[0].nextDoc || 1;
      } else {
        nextDoc = doc;
      }

      const maxDoc = await pool.request().query(`
          SELECT DOC FROM DocNumber WHERE TYPE='SALE'
        `);

if (nextDoc === maxDoc) {
  const newDocValue = nextDoc + 1;

  await pool.request()
    .input("newDoc", sql.Int, newDocValue)
    .query(`
      UPDATE docnumber
      SET doc = @newDoc
      WHERE type = 'sale'
    `);
console.log("the new doc = ", newDocValue)
}

      for (const item of products) {
        const {
          date, // Note: item.date is used here, consider using orderDate for consistency if all items must share date
          acid, // Note: item.acid is used here, should be customerAcid for consistency
          qty,
          aQty,
          bQty,
          rate,
          suggestedPrice,
          vest,
          discP1,
          discP2,
          vist,
          SchPc,
          sch,
          isClaim,
          prid,
          profit
        } = item;

        const discount1 = (discP1 / 100) * rate * qty;
        const discount2 = (discP2 / 100) * rate * qty;

        await pool
          .request()
          .input("Date", sql.VarChar, date) // Using item.date
          .input("Type", sql.VarChar, "Sale")
          .input("Doc", sql.Int, nextDoc)
          .input("Type2", sql.VarChar, "OUT")
          .input("Prid", sql.VarChar, prid)
          .input("Acid", sql.VarChar, acid) // Using item.acid, typically this should be customerAcid
          .input("Packet", sql.Int, 0)
          .input("Qty2", sql.Int, qty)
          .input("AQTY", sql.Int, aQty)
          .input("Qty", sql.Int, bQty)
          .input("Rate", sql.Decimal(18, 2), rate)
          .input("SuggestedRate", sql.Decimal(18, 2), suggestedPrice)
          .input("VEST", sql.Decimal(18, 2), vest)
          .input("DiscP", sql.Decimal(18, 2), discP1)
          .input("Discount", sql.Decimal(18, 2), discount1)
          .input("DiscP2", sql.Decimal(18, 2), discP2)
          .input("Discount2", sql.Decimal(18, 2), discount2)
          .input("VIST", sql.Decimal(18, 2), vist)
          .input("SellingType", sql.VarChar, "DEFAULT")
          .input("SchPc", sql.Int, SchPc)
          .input("Sch", sql.Int, sch)
          .input("profit", sql.Int, profit)
          .input("department", sql.VarChar, "A1")
          .input("isclaim", sql.Bit, isClaim ? 1 : 0)
          .input("SPO", sql.VarChar, username).query(`
            INSERT INTO PsProduct (
              [Date], [Type], [Doc], [Type2], [Prid], [Acid], [Packet], [Qty2],
              [AQTY], [Qty], [Rate], [SuggestedRate], [VEST], [DiscP], [Discount],
              [DiscP2], [Discount2], [VIST], [SellingType], [SchPc], [Sch],
              [department], [isclaim], [SPO],[profit]
            )
            VALUES (
              @Date, @Type, @Doc, @Type2, @Prid, @Acid, @Packet, @Qty2,
              @AQTY, @Qty, @Rate, @SuggestedRate, @VEST, @DiscP, @Discount,
              @DiscP2, @Discount2, @VIST, @SellingType, @SchPc, @Sch,
              @department, @isclaim, @SPO, @profit
            )
          `);
      }

      // 3. Delete any existing PSDetail entry for this doc & type
      await pool
        .request()
        .input("doc", sql.Int, nextDoc)
        .input("type", sql.VarChar, "SALE") // Added type to make it more specific
        .query(`
          DELETE FROM PSDetail WHERE TYPE = @type AND DOC = @doc
        `);

      // 4. Insert into PSDetail
      // const { date } = products[0]; // Use orderDate defined at the top
      let totalOrderAmount = totalAmount;

      await pool
        .request()
        .input("Doc", sql.Int, nextDoc)
        .input("Date", sql.VarChar, orderDate)
        .input("Type", sql.VarChar, "SALE")
        .input("Acid", sql.VarChar, customerAcid)
        .input("Description", sql.VarChar, "ESTIMATE") // Or generate based on order
        .input("ExtraDiscountP", sql.Decimal(18, 2), 0)
        .input("ExtraDiscount", sql.Decimal(18, 2), 0)
        .input("Freight", sql.Decimal(18, 2), 0)
        .input("Received", sql.Decimal(18, 2), 0)
        .input("Amount", sql.Decimal(18, 2), totalOrderAmount)
        .input("DueDate", sql.VarChar, orderDate) // Or calculate based on credit terms
        .input("PBalance", sql.Decimal(18, 2), 0)
        .input("Term", sql.VarChar, "")
        .input("Vehicle", sql.VarChar, "")
        .input("SalesMan", sql.VarChar, username) // Or a specific salesman ID
        .input("goods", sql.VarChar, "")
        .input("builty", sql.VarChar, "")
        .input("CreditDays", sql.Int, 0)
        .input("PriceList", sql.VarChar, "A")
        .input("BuiltyPath", sql.VarChar, "")
        .input("remarks", sql.VarChar, "") // Could add order remarks here
        .input("GrossProfit", sql.Decimal(18, 2), 0) // This might need calculation
        .input("Status", sql.VarChar, "ESTIMATE")
        .input("CTN", sql.VarChar, "P")
        .input("Shopper", sql.VarChar, "P").query(`
          INSERT INTO PSDetail (
            [Doc], [Date], [Type], [Acid], [Description], [ExtraDiscountP],
            [ExtraDiscount], [Freight], [Received], [Amount], [DueDate], [PBalance],
            [Term], [Vehicle], [SalesMan], [goods], [builty], [CreditDays],
            [PriceList], [BuiltyPath], [remarks], [GrossProfit], [Status],
            [CTN], [Shopper]
          )
          VALUES (
            @Doc, @Date, @Type, @Acid, @Description, @ExtraDiscountP,
            @ExtraDiscount, @Freight, @Received, @Amount, @DueDate, @PBalance,
            @Term, @Vehicle, @SalesMan, @goods, @builty, @CreditDays,
            @PriceList, @BuiltyPath, @remarks, @GrossProfit, @Status,
            @CTN, @Shopper
          )
        `);

      // --- START: ADDED LEDGER QUERIES ---

      // 5. Delete existing ledger entries for this sale document to prevent duplicates
      await pool
        .request()
        .input("type", sql.VarChar, "sale")
        .input("doc", sql.Int, nextDoc).query(`
          DELETE FROM ledgers WHERE type = @type AND doc = @doc
        `);

      // 6. Insert Debit entry into ledgers (Customer Account is Debited)
      // The amount debited should be the final net amount payable by the customer.
      // For simplicity, using totalOrderAmount. Adjust if there are further discounts/charges.
      const debitNarration = `ESTIMATE`;
      await pool.request()
        .input("acid", sql.VarChar, customerAcid)       // Customer's account ID
        .input("date", sql.VarChar, orderDate)          // Date of the sale
        .input("type", sql.VarChar, 'sale')
        .input("doc", sql.Int, nextDoc)                 // Document number
        .input("narration", sql.VarChar(255), debitNarration)
        .input("debit", sql.Decimal(18, 2), totalOrderAmount) // Total sale amount
        .query(`
          INSERT INTO ledgers (acid, date, type, doc, NARRATION, Debit) 
          VALUES (@acid, @date, @type, @doc, @narration, @debit)
        `);

      // 7. Insert Credit entry into ledgers (Sales Revenue Account is Credited)
      // IMPORTANT: Replace 'YOUR_SALES_REVENUE_ACCOUNT_ID' with your actual Sales Revenue Account ID from your Chart of Accounts.
      const salesRevenueAcid = '4'; 
      const creditNarration = `ESTIMATE`;
      await pool.request()
        .input("acid", sql.VarChar, salesRevenueAcid)   // Sales revenue account ID
        .input("date", sql.VarChar, orderDate)          // Date of the sale
        .input("type", sql.VarChar, 'sale')
        .input("doc", sql.Int, nextDoc)                 // Document number
        .input("narration", sql.VarChar(255), creditNarration)
        .input("credit", sql.Decimal(18, 2), totalOrderAmount) // Total sale amount
        .query(`
          INSERT INTO ledgers (acid, date, type, doc, NARRATION, credit) 
          VALUES (@acid, @date, @type, @doc, @narration, @credit)
        `);

      // --- END: ADDED LEDGER QUERIES ---

      // 8. Return response with invoice data (original step 5)
      const invoiceDataResult = await pool
        .request()
        .input("doc", sql.Int, nextDoc)
        .input("acid", sql.VarChar, customerAcid) // Fetching based on customerAcid for overall order
        .query(`
          SELECT * FROM PsProduct
          WHERE Doc = @doc AND Acid = @acid AND Type = 'Sale' 
        `); // Added Type='Sale' for specificity

      const invoiceData = invoiceDataResult.recordset;

      res.status(200).json({
        message: "Order created successfully and ledger entries posted!",
        invoiceNumber: nextDoc,
        invoiceData: invoiceData,
      });
    } catch (err) {
      console.error("Error inserting order:", err);
      // Check if it's an SQL error and provide more details if possible
      let errorMessage = "Internal server error";
      if (err.originalError && err.originalError.info) {
        errorMessage = err.originalError.info.message || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      return res.status(500).json({
        error: "Failed to create order.",
        msg: errorMessage,
        details: err,
      });
    }
  },

 getNextDoc: async (req, res) => {
  const { acid } = req.query;

  try {
    const pool = await dbConnection();

    const docResult = await pool
      .request()
      .input("acid", sql.VarChar, acid)
      .query(`
       SELECT MAX(doc) AS nextDoc
FROM psproduct
WHERE acid = @acid AND type = 'sale' AND printStatus IS NULL

      `);

    const nextDoc = docResult.recordset[0]?.nextDoc || null;
    let date = null;

if (nextDoc !== 0) {
  const result = await pool
    .request()
    .input("nextDoc", sql.Int, nextDoc)
    .query(`
      SELECT D.Date
      FROM PSDetail D 
      WHERE D.doc = @nextDoc
    `);

  const resultTotal = await pool
    .request()
    .input("nextDoc", sql.Int, nextDoc)
    .query(`
      SELECT SUM(ISNULL(VIST, 0)) AS TotalBillAmount 
      FROM PsProduct 
      WHERE TYPE = 'SALE' AND Doc = @nextDoc
    `);

  const rawDate = result.recordset[0]?.Date;
  const date = rawDate ? rawDate.toLocaleDateString() : null;

  const total = resultTotal.recordset[0]?.TotalBillAmount || 0;

  console.log("Fetched date:", date);
  res.json({ nextDoc, date, total });
}

  } catch (err) {
    console.error("Error in getNextDoc:", err);
    res.status(500).json({ error: "Failed to fetch nextDoc", msg:err });
  }
},

getCost:async (req, res) => {
  const { ItemCode } = req.query;

  const SearchDate = new Date();

  if (!ItemCode) {
    return res.status(400).json({ error: "ItemCode are required" });
  }

  try {
    const pool = await dbConnection();

    const result = await pool.request()
      .input("ItemCode", sql.VarChar, ItemCode)
      .input("SearchDate", sql.Date, SearchDate)
      .query(`
        SELECT ISNULL((
          SELECT 
            CASE 
              WHEN qty = 0 THEN 0 
              ELSE amt / qty 
            END AS Cost
          FROM (
            SELECT 
              ISNULL(SUM(vist), 0) * ((100 - AVG(pd.ExtraDiscountP)) / 100) AS amt,
              ISNULL(SUM(qty), 0) + ISNULL(SUM(SchPc), 0) AS qty,
              AVG(pd.ExtraDiscountP) AS ExDisc
            FROM PSProduct p
            JOIN PSDetail pd ON p.doc = pd.doc AND p.type = pd.type
            WHERE 
              p.type = 'purchase' 
              AND prid = (SELECT id FROM Products WHERE code = @ItemCode)
              AND p.date = (
                SELECT MAX(date)
                FROM PSProduct ps
                WHERE 
                  ps.prid = (SELECT id FROM Products WHERE code = @ItemCode)
                  AND ps.date <= @SearchDate
                  AND ps.type = 'purchase'
              )
          ) x
        ), 0) AS Cost
        FROM Products
        WHERE code = @ItemCode
      `);

    const cost = result.recordset[0]?.Cost || 0;
    console.log("this si the cost ", cost)
    res.json({ cost, SearchDate});

  } catch (err) {
    console.error("Error fetching cost:", err);
    res.status(500).json({ error: "Internal server error" });
  }
},
};

module.exports = orderControllers;
