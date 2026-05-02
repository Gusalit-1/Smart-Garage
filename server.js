const os = require('os');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const cors = require('cors');
const mqtt = require('mqtt'); 

// Import routes
const authRoutes = require('./routes/auth');
const logsRoutes = require('./routes/logs');
const statusRoutes = require('./routes/status');

const app = express();
const PORT = 8000;

// --- 1. KONEKSI MQTT BROKER ---
// Memastikan semua komponen (ESP Utama, ESP-CAM, Dashboard, AI) terhubung
const mqttClient = mqtt.connect('mqtt://broker.emqx.io');

mqttClient.on('connect', () => {
    console.log(" Terhubung ke MQTT Broker: broker.emqx.io");
});

// --- 2. KONFIGURASI DATABASE ---
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_garage',
    waitForConnections: true,
    connectionLimit: 10
}).promise();

app.set('db', db);
app.set('mqttClient', mqttClient);

// --- 3. MIDDLEWARE (DISEMPURNAKAN) ---
// Mengizinkan Python (AI Service) mengakses API ini tanpa diblokir
app.use(cors({
    origin: '*', // Izinkan semua akses (penting untuk testing AI)
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- 4. KONFIGURASI SESSION ---
app.use(session({
    store: new FileStore({ 
        path: os.tmpdir() + '/smart-garage-sessions',
        logFn: function() {} 
    }),
    secret: 'smartgarage_stikom_bali_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 600000,
        secure: false // Set true jika menggunakan HTTPS
    }
}));

const checkAuth = (req, res, next) => {
    if (!req.session.status || req.session.status !== "login") {
        return res.status(401).json({ redirect: '/index.html' });
    }
    next();
};
app.set('checkAuth', checkAuth);

// --- 5. ROUTES ---
app.use('/auth', authRoutes);
app.use('/logs', logsRoutes);
app.use('/status', statusRoutes);

// --- 6. API DETECTION (BRIDGE PYTHON TO DASHBOARD) ---
// Jalur masuk data dari Python main.py
app.post('/api/detection', (req, res) => {
    const detectedObject = req.body.object;
    
    console.log(` AI Mendeteksi: ${detectedObject}`);

    if (mqttClient.connected) {
        // Teruskan data ke MQTT agar Dashboard (JavaScript) bisa langsung update UI
        mqttClient.publish('gusalit/gate/ai_detection', detectedObject, { qos: 0 }, (err) => {
            if (err) console.error(" Gagal publish ke MQTT:", err);
        });
        res.status(200).json({ message: "Data forwarded to MQTT" });
    } else {
        console.error(" MQTT Client tidak terhubung!");
        res.status(503).json({ error: "MQTT Broker Disconnected" });
    }
});

// Sync Status untuk UI (Dipanggil Dashboard via script.js)
app.get('/status/gate-status', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT gate_status, lock_status FROM settings WHERE id = 1");
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: "Settings not found" });
        }
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// API Logs untuk Riwayat Tabel
app.get('/api/logs', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM garage_logs ORDER BY waktu DESC LIMIT 15");
        res.json(rows);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// --- 7. JALANKAN SERVER ---
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`   SMART GARAGE SERVER RUNNING ON PORT ${PORT}`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   AI ENDPOINT: http://localhost:${PORT}/api/detection`);
    console.log(`========================================`);
});