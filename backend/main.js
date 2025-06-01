const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const orderRoutes = require('./routes/orderRoutes'); // Import your invoice route
const loginRouter = require('./routes/loginRoutes'); // Import your login route
const ledgerRoutes = require('./routes/ledgerRoutes'); // Import your ledger route
const invoiceRoutes = require('./routes/invoiceRoutes'); // Import your invoice route
const customerRoutes = require('./routes/customerRoutes'); // Import your customer route
const productRoutes = require('./routes/productRoutes'); // Import your customer route
const discountRoutes = require('./routes/discountRoutes'); // Import your customer route
const schemeRoutes = require('./routes/schemeRoutes'); // Import your customer route
const balanceRoutes = require('./routes/balanceRoutes'); // Import your customer route
const CashEntryRoutes = require('./routes/CashEntryRoutes'); // Import your customer route
const reportRoutes = require('./routes/reportRoutes'); // Import your customer route
const app = express();
const port = 3001;

// Middleware
app.use(cors());


app.use(bodyParser.json());
app.use(express.static(__dirname)); // For serving frontend


// Login route
app.use('/api/login', loginRouter);

// GET route to fetch customers for Autocomplete - with SPO restriction
app.use('/api/customers', customerRoutes );

app.use('/api/invoices', invoiceRoutes); // Invoice route);
app.use('/api/create-order', orderRoutes); // Invoice route);
app.use('/api/products', productRoutes); // Invoice route);
app.use('/api/products', productRoutes); // Invoice route);
app.use('/api/discount', discountRoutes); // Invoice route);
app.use('/api/scheme', schemeRoutes); // Invoice route);
app.use('/api/balance', balanceRoutes); // Invoice route);
app.use('/api/cash-entry', CashEntryRoutes); // Invoice route);
app.use('/api', reportRoutes);

// Ledger route with SPO restriction
app.use('/ledger', ledgerRoutes); 
 

app.use((req, res) => {
  console.log("404 - Not Found:", req.originalUrl);
  res.status(404).send("Page not found");
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});