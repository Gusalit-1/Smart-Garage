
const mysql = require('mysql2');
require('dotenv').config();

// Re-export db config (for backup/compatibility)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_garage',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const createDbPool = () => mysql.createPool(dbConfig).promise();

module.exports = { createDbPool, dbConfig };
