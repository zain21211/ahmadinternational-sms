const dbConnection = require('../database/connection');
const mssql = require('mssql');

const ledgerControllers = {
  getData: async (req, res) => {
    try {
      const pool = await dbConnection();
      if (!pool || !pool.connected) {
        await dbConnection();
        console.log('Reconnected to the database');
      }

      const {
        acid = "",
        narration = "",
        type = "",
        doc = "",
        startDate = "",
        endDate = "",
        credit = "",
        statusMatch = "",
      } = req.query;

      // Validate required parameters
      if (!acid || !startDate || !endDate) {
        console.warn('Missing required fields: acid, startDate, or endDate');
        return res.status(400).send('Missing required fields: acid, startDate, or endDate');
      }

      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        console.warn('Invalid startDate provided:', startDate);
        return res.status(400).send('Invalid startDate provided');
      }
      const openingDate = new Date(start);
      openingDate.setDate(openingDate.getDate() - 1);

      // Log request parameters
      console.log('Ledger request params:', { acid, startDate, endDate, narration, type, doc, credit, statusMatch });

      const sql = `
        SELECT *,
          SUM(ISNULL(x.Debit, 0)) OVER (ORDER BY Date, ID) 
          - SUM(ISNULL(x.Credit, 0)) OVER (ORDER BY Date, ID) AS Total
        FROM (
          SELECT 
            id,
            Date,
            Type,
            Doc,
            ISNULL(Narration, '') AS Narration,
            ISNULL(Debit, 0) AS Debit,
            ISNULL(Credit, 0) AS Credit,
            ISNULL(Status, 0) AS Status
          FROM ledgers l
          WHERE acid = @acid
            AND narration LIKE '%' + @narration + '%'
            AND type LIKE @type + '%'
            AND doc LIKE @doc + '%'
            AND date >= @startDate
            AND date <= @endDate
            AND ISNULL(credit, '') LIKE @credit + '%'
            AND ISNULL(status, 0) LIKE '%' + @statusMatch + '%'
          
          UNION
      
          SELECT 
            0 AS id,
            DATEADD(DAY, -1, @startDate) AS Date,
            'OE' AS Type,
            0 AS Doc,
            'Opening Balance' AS Narration,
            (
              SELECT ISNULL(SUM(Debit), 0) - ISNULL(SUM(Credit), 0)
              FROM Ledgers l2
              WHERE l2.acid = @acid
                AND date < @startDate
            ) AS Debit,
            0 AS Credit,
            0 AS Status
        ) x
      `;

      const request = pool.request();
      request.input('acid', mssql.NVarChar, acid);
      request.input('narration', mssql.NVarChar, narration);
      request.input('type', mssql.NVarChar, type);
      request.input('doc', mssql.NVarChar, doc); // Fixed: 'doc' instead of 'type' (was a typo in your code)
      request.input('startDate', mssql.DateTime, startDate);
      request.input('endDate', mssql.DateTime, endDate);
      request.input('openingDate', mssql.DateTime, openingDate);
      request.input('credit', mssql.NVarChar, credit);
      request.input('statusMatch', mssql.NVarChar, statusMatch);

      console.log('Executing SQL query:', sql);

      const result = await request.query(sql);

      if (!result.recordset || result.recordset.length === 0) {
        console.log('No ledger data found for the given criteria');
        return res.status(200).json([]);
      }

      console.log('Ledger data retrieved (first 2 rows):', result.recordset.slice(0, 2));

      res.status(200).json(result.recordset);
    } catch (err) {
      console.error('Error retrieving ledger data:', err.message, err.stack);
      res.status(500).send('Error retrieving data: ' + err.message);
    }
  },
};

module.exports = ledgerControllers;