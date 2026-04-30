const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_garage',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test koneksi
db.getConnection((err, connection) => {
    if (err) {
        console.error("Koneksi Database Gagal: " + err.message);
    } else {
        console.log("Database Smart Garage Terhubung!");
        connection.release();
    }
});

module.exports = db.promise(); // Menggunakan promise agar bisa pakai async/await
