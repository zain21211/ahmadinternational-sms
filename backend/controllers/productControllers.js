const mssql = require("mssql");
const dbConnection = require('../database/connection');

const productControllers = {
getProducts: async (req, res) => {
    // const { company = '', category = '', name = '' } = req.query;
    try {
      pool = await dbConnection();

      const result = await pool.request()
        // .input('company', sql.NVarChar, `%${company}%`)
        // .input('category', sql.NVarChar, `%${category}%`)
        // .input('name', sql.NVarChar, `%${name}%`)
        .query(`
SELECT *
FROM Products
ORDER BY Name;

        `);
      res.json(result.recordset);

    } catch (error) {
      console.log("eror in the product api")
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Failed to fetch products.', error });
    } finally {
      if (pool) await pool.close();
    }
  },
}
  
module.exports = productControllers;