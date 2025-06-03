// reportController.js
const axios = require('axios');

// Replace with your ASP.NET Crystal Report API base URL
const REPORT_API_URL = 'http//localhost:44307/api/report/generate'; // Change port if needed

/**
 * Sends data to the .NET API to generate a PDF Crystal Report and returns it to the frontend
 */
const generateReport = async (req, res) => {
  // let { reportName, parameters } = req.body;
  // let { reportName, parameters } = req.body;

    // if (!reportName || !parameters) {
        const reportName = 'invoiceReport'; // Fallback report name
        const parameters = {
            doc: 132000, // Fallback parameters
        }; // Fallback parameters
    // }



    
  try {
    const response = await axios.post(
      REPORT_API_URL,
      { reportName, parameters },
      { responseType: 'stream' }
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=${reportName}.pdf`,
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('Error in generateReport controller:', error.message);
    res.status(500).json({ error: 'Failed to generate report.', err: error });
  }
};
module.exports = { generateReport };
