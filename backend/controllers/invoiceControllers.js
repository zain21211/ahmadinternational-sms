// controllers/invoiceController.js
// const dbConnection = require('../database/dbConnection');
const sql = require('mssql');
const dbConnection = require('../database/connection'); // Import your database connection


const invoiceControllers = {
    getInvoice: async (req, res) => {
  const inv = "133030";


  const query = `
    SELECT TOP 20
      ROW_NUMBER() OVER (ORDER BY p.id) rn,
      p.id rec,
      (
        SELECT SUM(debit) - SUM(credit)
        FROM ledgers l 
        WHERE acid = (SELECT acid FROM psdetail WHERE type='sale' AND doc = @DocNumber)
          AND l.date <= (SELECT date FROM PSDetail WHERE type='sale' AND doc = @DocNumber)
          AND l.doc <> @DocNumber
      ) AS PreBal,
      Ac.id, AC.ROUTE, Ac.Subsidary, P.DoC, AC.CreditLimit, Ac.Terms, Ac.CreditDays, 
      Ac.Urduname AS UrduParty, ac.ledgerno, ISNULL(pr.runs, 0) AS Runs, Ac.OAddress, 
      Ac.Area, Ac.City, Ac.OCell, Ac.SPO, Pr.company, Pr.Name, Pr.Urduname, 
      Pr.Size, Pr.Packing, Pr.company, Pr.category, Pr.code AS ProductCode, Pr.Batch, 
      P.SchPc, P.id AS PSProductID, P.Packet, P.Qty, P.Rate, P.VEST, P.Discp, 
      P.Discount, P.DiscP2, P.Discount2, P.VIST, P.SchPc, D.Date, D.Discount AS TotalDisc, 
      D.ExtraDiscount, D.Freight, ROUND(D.Amount, 2) AS amount, D.PBalance, D.Term, 
      D.Description, D.Vehicle, D.SalesMan, D.Goods, D.Builty, D.CreditDays, 
      D.Received, D.REMARKS
    FROM PSProduct P 
    JOIN PSDetail D ON P.DOC = D.DOC AND P.TYPE = D.TYPE 
    JOIN COA AC ON D.ACID = AC.ID 
    JOIN Products PR ON PR.ID = P.Prid
   WHERE P.Type = 'Sale' 
      AND D.Type = 'Sale'
      AND P.Doc = @DocNumber
    ORDER BY p.id;
  `;

  try {
    const pool = await dbConnection();
    const request = pool.request();
    request.input('DocNumber', sql.VarChar, inv);

    const result = await request.query(query);
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json({ message: 'Error fetching invoice', error: err.message });
  } finally {
    sql.close(); // Always close the connection
  }
},

 getInvoiceByID: async (req, res) => {
  const inv = req.params.id;
const user = req.query.user;
const type = req.query.type;


const isAdmin = type && type.toLowerCase() === "admin";


  console.log("Invoice ID:", inv); // Log the invoice ID for debugging

  const queryCustomer = `
  SELECT 
  P.Doc AS InvoiceNumber,
  AC.Subsidary AS CustomerName,
  AC.CreditLimit,
  AC.Terms,
  AC.CreditDays,
  D.Date AS InvoiceDate,
  D.Freight,
  D.ExtraDiscount,
  D.Amount AS InvoiceAmount,
  D.SalesMan AS Vehicle,
  D.Vehicle AS SPO,
  D.Description
FROM PSProduct P 
JOIN PSDetail D ON P.DOC = D.DOC AND P.TYPE = D.TYPE 
JOIN COA AC ON D.ACID = AC.ID 
WHERE P.Doc = @DocNumber
  AND P.Type = 'Sale' 
  AND D.Type = 'Sale'
GROUP BY P.Doc, AC.Subsidary, AC.CreditLimit, AC.Terms, AC.CreditDays, 
         D.Date, D.Freight, D.ExtraDiscount, D.Amount, D.SalesMan, 
         D.Vehicle, D.Description;

`;

const queryProducts = `
SELECT 
  PR.Name AS Product,
  PR.Company AS Company,
  P.QTY AS BQ,
  P.SchPc AS FOC,
  (ISNULL(P.QTY, 0) + ISNULL(P.SchPc, 0)) AS TQ,
  P.Rate AS Price,
  ISNULL(P.Discp, 0) AS Disc1,
  ROUND(
    CASE 
      WHEN ISNULL(P.QTY, 0) * ISNULL(P.Rate, 0) = 0 THEN 0
      ELSE (ISNULL(P.Discount2, 0) * 100.0) / (ISNULL(P.QTY, 0) * ISNULL(P.Rate, 0))
    END
  , 2) AS Disc2,
  ROUND((ISNULL(P.QTY, 0) * ISNULL(P.Rate, 0)) 
        - ISNULL(P.Discp, 0) 
        - ISNULL(P.Discount, 0) 
        - ISNULL(P.DiscP2, 0) 
        - ISNULL(P.Discount2, 0), 0) AS Amount
FROM PSProduct P 
JOIN Products PR ON PR.ID = P.Prid
WHERE P.Doc = @DocNumber
  AND P.Type = 'Sale' and P.QTY<>0
ORDER BY P.ID;


`

  try {
    const pool = await dbConnection();
    const request = pool.request();
    request.input('DocNumber', sql.VarChar, inv);

const customerRequest = pool.request();
customerRequest.input('DocNumber', sql.VarChar, inv);
const customerResult = await customerRequest.query(queryCustomer);

const productRequest = pool.request();
productRequest.input('DocNumber', sql.VarChar, inv);
const productResult = await productRequest.query(queryProducts);

    const response = {
      Customer: customerResult.recordset[0] || {},
      Products: productResult.recordset || []
    };

    const isZainOrAdmin = user?.toLowerCase() === "zain" || isAdmin === true;

  //   if (!isZainOrAdmin) {
  //   if(response.Customer.SPO === user){
  //     res.status(200).json(response);
  //   } else {
  //     console.log("restricted for", type)
  //     console.log("restricted for", user)
  //     res.status(403).json({massege: "restricted" })
  //   }
  // }else{
  //   res.status(200).json(response);

  // }
    res.status(200).json(response);

  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json({ message: 'Error fetching invoice', error: err.message });
  } finally {
    sql.close(); // Always close the connection
  }
}
};

module.exports = invoiceControllers ;
