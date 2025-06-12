const sql = require("mssql");
const dbConnection = require("../database/connection");
const jwt = require("jsonwebtoken");

const orderControllers = {
  postOrder: async (req, res) => {
    const { products, totalAmount, doc } = req.body;

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authorization token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const { username } = decoded;

    let nextDoc ;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products provided" });
    }

    const customerAcid = products[0].acid;
    const orderDate = products[0].date;

    try {
      const pool = await dbConnection();

      if (doc === '' || doc === null) {
        const docResult = await pool
          .request()
          .input("acid", sql.VarChar, customerAcid).query(`
          SELECT ISNULL(
            (SELECT MAX(doc)+1 FROM psproduct WHERE type='sale'),
            0
          ) AS nextDoc
        `);

        nextDoc = docResult.recordset[0].nextDoc || 1;
      } else {
        nextDoc = doc;
      }

      const maxDocR = await pool.request().query(`
        SELECT DOC FROM DocNumber WHERE TYPE='SALE'
      `);

      console.log(maxDocR)

      let maxDoc = maxDocR.recordset[0].DOC || 1;
      

      console.log(maxDoc)


      if (nextDoc === maxDoc) {
        const newDocValue = nextDoc + 1;

        await pool.request()
          .input("newDoc", sql.Int, newDocValue)
          .query(`
            UPDATE docnumber
            SET doc = @newDoc
            WHERE type = 'sale'
          `);

        console.log("the new doc = ", newDocValue);
      }

      for (const item of products) {
        const {
          date, acid, qty, aQty, bQty, rate, suggestedPrice,
          vest, discP1, discP2, vist, SchPc, sch, isClaim,
          prid, profit
        } = item;

        const discount1 = (discP1 / 100) * rate * qty;
        const discount2 = (discP2 / 100) * rate * qty;

        await pool
          .request()
          .input("Date", sql.VarChar, date)
          .input("Type", sql.VarChar, "Sale")
          .input("Doc", sql.Int, nextDoc)
          .input("Type2", sql.VarChar, "OUT")
          .input("Prid", sql.VarChar, prid)
          .input("Acid", sql.VarChar, acid)
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
          .input("SPO", sql.VarChar, username)
          .query(`
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

      await pool
        .request()
        .input("doc", sql.Int, nextDoc)
        .input("type", sql.VarChar, "SALE")
        .query(`
          DELETE FROM PSDetail WHERE TYPE = @type AND DOC = @doc
        `);

      // 4. Insert into PSDetail
      // const { date } = products[0]; // Use orderDate defined at the top
      let totalOrderAmount = totalAmount;


       const result = await pool.request()
      .input("doc", sql.Int, nextDoc)
      .query(`SELECT ISNULL(SUM(profit), 0) AS GrossProfit FROM PsProduct WHERE type = 'sale' AND doc = @doc`);

    const GrossProfit = result.recordset[0].GrossProfit;
    console.log("profit: ", GrossProfit)


      await pool
        .request()
        .input("Doc", sql.Int, nextDoc)
        .input("Date", sql.VarChar, orderDate)
        .input("Type", sql.VarChar, "SALE")
        .input("Acid", sql.VarChar, customerAcid)
        .input("Description", sql.VarChar, "ESTIMATE")
        .input("ExtraDiscountP", sql.Decimal(18, 2), 0)
        .input("ExtraDiscount", sql.Decimal(18, 2), 0)
        .input("Freight", sql.Decimal(18, 2), 0)
        .input("Received", sql.Decimal(18, 2), 0)
        .input("Amount", sql.Decimal(18, 2), totalAmount)
        .input("DueDate", sql.VarChar, orderDate)
        .input("PBalance", sql.Decimal(18, 2), 0)
        .input("Term", sql.VarChar, "")
        .input("Vehicle", sql.VarChar, "")
        .input("SalesMan", sql.VarChar, username)
        .input("goods", sql.VarChar, "")
        .input("builty", sql.VarChar, "")
        .input("CreditDays", sql.Int, 0)
        .input("PriceList", sql.VarChar, "A")
        .input("BuiltyPath", sql.VarChar, "")
        .input("remarks", sql.VarChar, "") // Could add order remarks here
        .input("GrossProfit", sql.Decimal(18, 2), GrossProfit) // This might need calculation
        .input("Status", sql.VarChar, "ESTIMATE")
        .input("CTN", sql.VarChar, "P")
        .input("Shopper", sql.VarChar, "P")
        .query(`
          
  INSERT INTO PSDetail (
    [Doc], [Date], [Type], [Acid], [Description], [ExtraDiscountP],
    [ExtraDiscount], [Freight], [Received], [Amount], [DueDate],
    [PBalance], [Term], [Vehicle], [SalesMan], [goods], [builty],
    [CreditDays], [PriceList], [BuiltyPath], [remarks], [GrossProfit],
    [Status], [CTN], [Shopper]
  ) VALUES (
    @Doc, @Date, @Type, @Acid, @Description, @ExtraDiscountP,
    @ExtraDiscount, @Freight, @Received, @Amount, @DueDate,
    @PBalance, @Term, @Vehicle, @SalesMan, @goods, @builty,
    @CreditDays, @PriceList, @BuiltyPath, @remarks, @GrossProfit,
    @Status, @CTN, @Shopper
  )


        

       --- START: ADDED LEDGER QUERIES ---


       `); // use actual field names here for clarity

      await pool
        .request()
        .input("type", sql.VarChar, "sale")
        .input("doc", sql.Int, nextDoc)
        .query(`
          DELETE FROM ledgers WHERE type = @type AND doc = @doc
        `);

      await pool.request()
        .input("acid", sql.VarChar, customerAcid)
        .input("date", sql.VarChar, orderDate)
        .input("type", sql.VarChar, 'sale')
        .input("doc", sql.Int, nextDoc)
        .input("narration", sql.VarChar(255), "ESTIMATE")
        .input("debit", sql.Decimal(18, 2), totalAmount)
        .query(`
          INSERT INTO ledgers (acid, date, type, doc, NARRATION, Debit) 
          VALUES (@acid, @date, @type, @doc, @narration, @debit)
        `);

      await pool.request()
        .input("acid", sql.VarChar, '4')
        .input("date", sql.VarChar, orderDate)
        .input("type", sql.VarChar, 'sale')
        .input("doc", sql.Int, nextDoc)
        .input("narration", sql.VarChar(255), "ESTIMATE")
        .input("credit", sql.Decimal(18, 2), totalAmount)
        .query(`
          INSERT INTO ledgers (acid, date, type, doc, NARRATION, credit) 
          VALUES (@acid, @date, @type, @doc, @narration, @credit)
        `);

      const invoiceDataResult = await pool
        .request()
        .input("doc", sql.Int, nextDoc)
        .input("acid", sql.VarChar, customerAcid)
        .query(`
          SELECT * FROM PsProduct
          WHERE Doc = @doc AND Acid = @acid AND Type = 'Sale' 
        `);

      const invoiceData = invoiceDataResult.recordset;

      res.status(200).json({
        message: "Order created successfully and ledger entries posted!",
        invoiceNumber: nextDoc,
        invoiceData,
        totalAmount,
      });
    } catch (err) {
      console.error("Error inserting order:", err);
      const errorMessage =
        err.originalError?.info?.message || err.message || "Internal server error";
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
        date = rawDate ? rawDate.toLocaleDateString() : null;
        const total = resultTotal.recordset[0]?.TotalBillAmount || 0;

        console.log("Fetched date:", date);
        res.json({ nextDoc, date, total });
      }
    } catch (err) {
      console.error("Error in getNextDoc:", err);
      res.status(500).json({ error: "Failed to fetch nextDoc", msg: err });
    }
  },

  getCost: async (req, res) => {
    const { ItemCode } = req.query;
    const SearchDate = new Date();

    if (!ItemCode) {
      return res.status(400).json({ error: "ItemCode is required" });
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
                ISNULL(SUM(qty), 0) + ISNULL(SUM(SchPc), 0) AS qty
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
      console.log("Calculated cost:", cost);
      res.json({ cost, SearchDate });

    } catch (err) {
      console.error("Error fetching cost:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = orderControllers;

