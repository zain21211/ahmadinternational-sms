const mssql = require("mssql");
const dbConnection = require('../database/connection');

const productControllers = {
getProducts: async (req, res) => {
  console.log("ENTERED IN THE PRODUCTS")
    // const { company = '', category = '', name = '' } = req.query;
    try {
      pool = await dbConnection();
  console.log("QUEYING IN THE PRODUCTS")

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
      // console.log("kick: ", result.recordset.filter(p => p.Company === "FIT-O" && p.Name.toLowerCase() === "kick" && p.Category.toLowerCase() === "euro"))

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