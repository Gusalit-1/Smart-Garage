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
// Digunakan agar AI Service (Python) bisa mengirim data langsung ke Dashboard
const mqttClient = mqtt.connect('mqtt://broker.emqx.io');

mqttClient.on('connect', () => {
    console.log("Connected to MQTT Broker: broker.emqx.io");
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

// Make db accessible to routes
app.set('db', db);
app.set('mqttClient', mqttClient);

// --- 3. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- 4. KONFIGURASI SESSION (Auto-Logout 10 Menit) ---
app.use(session({
    store: new FileStore({ 
        path: os.tmpdir() + '/smart-garage-sessions',
        logFn: function() {} 
    }),
    secret: 'smartgarage_stikom_bali_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000 } // 10 Menit
}));

const checkAuth = (req, res, next) => {
    if (!req.session.status || req.session.status !== "login") {
        return res.status(401).json({ redirect: '/index.html' });
    }
    next();
};

// Make checkAuth available to routes
app.set('checkAuth', checkAuth);

// --- 5. ROUTES ---
app.use('/auth', authRoutes);
app.use('/logs', logsRoutes);
app.use('/status', statusRoutes);

// --- 6. ROUTES: API ACCESS & RFID ---
// NOTE: RFID logic moved to routes/logs.js for centralized management

// Hasil deteksi AI ke Dashboard (Python main.py -> Node.js -> MQTT)
app.post('/api/detection', (req, res) => {
    const detectedObject = req.body.object;
    if (mqttClient.connected) {
        mqttClient.publish('gusalit/gate/ai_detection', detectedObject);
    }
    res.sendStatus(200);
});

// Sync Status untuk UI
app.get('/status/gate-status', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT gate_status, lock_status FROM settings WHERE id = 1");
        res.json(rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/logs', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM garage_logs ORDER BY waktu DESC LIMIT 15");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 7. JALANKAN SERVER ---
app.listen(PORT, () => {

    console.log(`========================================`);

    console.log(`  SMART GARAGE SERVER RUNNING ON PORT ${PORT}`);

    console.log(`  URL: http://localhost:${PORT}`);

    console.log(`========================================`);

});