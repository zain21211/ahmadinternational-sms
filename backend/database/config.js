require('dotenv').config();


// DB connection config
 const dbConfig = {
    server: process.env.DB_SERVER,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT),
    connectionTimeout: 30000,
  requestTimeout: 30000,
    options: {
        trustServerCertificate: true,
        trustedConnection: true,
        enableArithAbort: true
    }
};

module.exports = dbConfig;