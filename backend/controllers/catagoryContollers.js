// Fetch distinct categories for filtering
router.get('/categories', async (req, res) => {
    let pool;
    try {
      pool = await sql.connect(dbConfig);
      const result = await pool.request()
        .query('SELECT DISTINCT Category FROM Products ORDER BY Category');
      res.json(result.recordset.map(row => row.Category));
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories.' });
    } finally {
      if (pool) await pool.close();
    }
  });