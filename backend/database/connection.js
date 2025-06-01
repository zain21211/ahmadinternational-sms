const dbConfig = require('./config')
const mssql = require('mssql')

const dbConnection = async () => {
    try {
        const pool = await mssql.connect(dbConfig);
        console.log('✅ Database connection successful');
        return pool; // Return the pool for further use
       
    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    }
}

module.exports = dbConnection;