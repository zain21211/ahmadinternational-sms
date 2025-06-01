const sql = require("mssql");
const dbConnection = require('../database/connection');
const jwt = require('jsonwebtoken');

const orderControllers = {
  postOrder: async (req, res) => {
    const { products } = req.body;

     const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  const decoded = jwt.verify(token, process.env.JWT_SECRET); // This decodes and verifies

    // Use decoded info as needed
    const {username} = decoded;

    let nextDoc;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products provided" });
    }

     // Assume all products have the same acid & date for this order:
    const acid = products[0].acid;

    try {
      const pool = await dbConnection(); // ✅ Correct usage
      
      const docResult = await pool
        .request()
        .input("acid", sql.VarChar, acid)
        .query(`
          SELECT ISNULL(
            (SELECT MAX(doc) FROM psproduct WHERE acid=@acid AND type='sale' AND printStatus IS NULL),
            (SELECT MAX(doc)+1 FROM psproduct WHERE type='sale')
          )  AS nextDoc
        `);

       nextDoc = docResult.recordset[0].nextDoc || 1;

      for (const item of products) {
        const {
          date,
          acid,
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
        } = item;

        console.log("products: ", products)

        const discount1 = (discP1 / 100) * rate * qty;
        const discount2 = (discP2 / 100) * rate * qty;

        await pool.request()
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
          .input("department", sql.VarChar, "A1")
          .input("isclaim", sql.Bit, isClaim ? 1 : 0)
          .input("SPO", sql.VarChar, username)
          .query(`
            INSERT INTO PsProduct (
              [Date], [Type], [Doc], [Type2], [Prid], [Acid], [Packet], [Qty2],
              [AQTY], [Qty], [Rate], [SuggestedRate], [VEST], [DiscP], [Discount],
              [DiscP2], [Discount2], [VIST], [SellingType], [SchPc], [Sch],
              [department], [isclaim], [SPO]
            )
            VALUES (
              @Date, @Type, @Doc, @Type2, @Prid, @Acid, @Packet, @Qty2,
              @AQTY, @Qty, @Rate, @SuggestedRate, @VEST, @DiscP, @Discount,
              @DiscP2, @Discount2, @VIST, @SellingType, @SchPc, @Sch,
              @department, @isclaim, @SPO
            )
          `);
      }

      const invoiceDataResult = await pool
      .request()
      .input("doc", sql.Int, nextDoc)
      .input("acid", sql.VarChar, acid)
      .query(`
        SELECT * FROM PsProduct
        WHERE Doc = @doc AND Acid = @acid
      `);

    const invoiceData = invoiceDataResult.recordset;

    res.status(200).json({
      message: "Order created successfully!",
      invoiceNumber: nextDoc,
      invoiceData: invoiceData,
    });
    } catch (err) {
      console.error("Error inserting order:", err);
      return res.status(500).json({ error: "Internal server error", msg: err});
    }
  },
};

module.exports = orderControllers;
