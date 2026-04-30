const os = require('os');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8000;

// --- 1. KONFIGURASI DATABASE ---
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_garage', // Sesuaikan dengan nama database Anda
    waitForConnections: true,
    connectionLimit: 10
}).promise();

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Melayani file HTML, CSS, JS di folder public

// --- 3. KONFIGURASI SESSION (Auto-Logout 10 Menit) ---
app.use(session({
    store: new FileStore({ 
        path: os.tmpdir() + '/smart-garage-sessions', // Simpan di folder temp Windows
        logFn: function() {} 
    }),
    secret: 'smartgarage_stikom_bali_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000 }
}));

// Middleware Proteksi Halaman & Auto-Logout Logic
const checkAuth = (req, res, next) => {
    if (!req.session.status || req.session.status !== "login") {
        return res.status(401).json({ redirect: '/index.html' });
    }
    
    // Logika Auto-Logout berdasarkan aktivitas terakhir
    const now = Math.floor(Date.now() / 1000);
    const timeout = 600; // 10 menit
    if (req.session.last_activity && (now - req.session.last_activity > timeout)) {
        req.session.destroy();
        return res.status(401).json({ redirect: '/index.html?pesan=expired' });
    }
    
    req.session.last_activity = now;
    next();
};

// --- 4. ROUTES: AUTHENTICATION ---
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
        if (rows.length > 0) {
            req.session.status = "login";
            req.session.username = rows[0].username;
            req.session.last_activity = Math.floor(Date.now() / 1000);
            res.json({ success: true, redirect: '/dashboard.html' });
        } else {
            res.json({ success: false, message: 'gagal' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// --- 5. ROUTES: API MONITORING & LOGS ---

// Ambil Status Gerbang (get_status.php)
app.get('/status/gate-status', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT gate_status, lock_status FROM settings WHERE id = 1");
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ambil History Logs untuk Dashboard
app.get('/api/logs', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM garage_logs ORDER BY waktu DESC LIMIT 15");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Simpan Log dari AI (simpan_ai.php)
app.get('/api/ai-access', async (req, res) => {
    const { access } = req.query;
    if (access === 'granted') {
        try {
            await db.query("UPDATE settings SET gate_status = 'OPEN' WHERE id = 1");
            await db.query("INSERT INTO garage_logs (username, aktivitas, waktu) VALUES (?, ?, NOW())", 
                ["AI_CAMERA", "ACCESS GRANTED - FACE RECOGNIZED"]);
            res.send("Success");
        } catch (err) {
            res.status(500).send("DB Error");
        }
    }
});

// Simpan Log dari RFID ESP32 (simpan_log.php)
app.get('/api/rfid-access', async (req, res) => {
    const uid = req.query.uid;
    if (!uid) return res.send("READY");

    try {
        const [cards] = await db.query("SELECT pemilik FROM rfid_cards WHERE uid_tag = ?", [uid.trim()]);
        let user = cards.length > 0 ? cards[0].pemilik : "STRANGER";
        let aksi = cards.length > 0 ? "AKSES GRANTED" : `AKSES DENIED (UID: ${uid})`;
        
        await db.query("INSERT INTO garage_logs (username, aktivitas, foto) VALUES (?, ?, ?)", 
            [user, aksi, "capture_live.jpg"]);
        res.send(`OK: ${user}`);
    } catch (err) {
        res.status(500).send("DB Error");
    }
});

// --- 6. JALANKAN SERVER ---
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  SMART GARAGE SERVER RUNNING ON PORT ${PORT}`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`========================================`);
});