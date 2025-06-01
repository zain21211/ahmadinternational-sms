const sql = require('mssql');
const dbConnection = require('../database/connection');

const getApplicableScheme = {
  getOne: async (req, res) => {
  const { productCode, orderQty, date } = req.query;
  console.log("params: ", productCode, orderQty, date)

//   if (!productCode || !orderQty || !date) {
//     return res.status(400).json({
//       error: 'Missing required parameters: productCode, orderQty, and date are required.',
//     });
//   }

  try {
    const pool = await dbConnection();
    const request = pool.request();

    // Add inputs safely to avoid SQL injection
    request.input('productCode', sql.NVarChar, productCode);
    request.input('orderQty', sql.Int, parseInt(orderQty));
    request.input('date', sql.Date, new Date(date));

    const query = `
      SELECT TOP 1
        ISNULL(schon, 0) AS SchOn,
        ISNULL(SchPcs, 0) AS SchPc,
        ISNULL(List, 'A') AS SaleList,
        ISNULL(Rate, 0) AS SaleRate
      FROM SchQTYSlabs
      WHERE
        prid = (SELECT id FROM Products WHERE code = @productCode)
        AND schon <= @orderQty
        AND date <= @date
      ORDER BY
        date DESC,
        schon DESC
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(200).json({"SchOn":0,"SchPc":0,"SaleList":"A         ","SaleRate":0});
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching scheme:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
},

getAll:async (req, res) => {
  const { productCode, date } = req.query;
  console.log("params: ", productCode, date)

//   if (!productCode || !orderQty || !date) {
//     return res.status(400).json({
//       error: 'Missing required parameters: productCode, orderQty, and date are required.',
//     });
//   }

  try {
    const pool = await dbConnection();
    const request = pool.request();

    // Add inputs safely to avoid SQL injection
    request.input('productCode', sql.NVarChar, productCode);
    request.input('date', sql.Date, new Date(date));

    const query = `
    SELECT TOP 1
        ISNULL(schon, 0) AS SchOn,
        ISNULL(SchPcs, 0) AS SchPc,
        ISNULL(List, 'A') AS SaleList,
        ISNULL(Rate, 0) AS SaleRate
      FROM SchQTYSlabs
      WHERE
        prid = (SELECT id FROM Products WHERE code = @productCode)
        AND date <= @date
      ORDER BY
        schon ASC
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(200).json({"SchOn":0,"SchPc":0,"SaleList":"A         ","SaleRate":0});
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error fetching scheme:', err);
    res.status(500).json({ error: 'Internal server error' });
  }}
}

module.exports = getApplicableScheme;
