const mssql = require("mssql");
const dbConnection = require('../database/connection');

// Fetch distinct companies for filtering
router.get('/companies', async (req, res) => {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .query('SELECT DISTINCT Company FROM Products ORDER BY Company');
      res.json(result.recordset.map(row => row.Company));
    } catch (error) {
      console.error('Error fetching companies:', error);
      res.status(500).json({ message: 'Failed to fetch companies.' });
    } finally {
      if (pool) await pool.close();
    }
  });