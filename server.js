const os = require('os');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const cors = require('cors');
const mqtt = require('mqtt'); 


const authRoutes = require('./routes/auth');
const logsRoutes = require('./routes/logs');
const statusRoutes = require('./routes/status');

const app = express();
const PORT = 8000;


const mqttClient = mqtt.connect('mqtt://broker.emqx.io');

mqttClient.on('connect', () => {
    console.log(" Terhubung ke MQTT Broker: broker.emqx.io");
});


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

-
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


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
        secure: false 
    }
}));

const checkAuth = (req, res, next) => {
    if (!req.session.status || req.session.status !== "login") {
        return res.status(401).json({ redirect: '/index.html' });
    }
    next();
};
app.set('checkAuth', checkAuth);


app.use('/auth', authRoutes);
app.use('/logs', logsRoutes);
app.use('/status', statusRoutes);


app.post('/api/detection', (req, res) => {
    const detectedObject = req.body.object;
    const mqttClient = app.get('mqttClient');

    if (mqttClient && mqttClient.connected) {
        mqttClient.publish('gusalit/gate/ai_detection', detectedObject);
    }
    
    
    res.sendStatus(200); 
});


app.get('/status/gate-status', async (req, res) => {
    try {
        const db = app.get('db');
        const [rows] = await db.query("SELECT gate_status, lock_status FROM settings WHERE id = 1");
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: "Data settings tidak ditemukan" });
        }
    } catch (err) {
        console.error("Database Sync Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/logs', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM garage_logs ORDER BY waktu DESC LIMIT 15");
        res.json(rows);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});


app.listen(PORT, () => {
    console.log(`   SMART GARAGE SERVER RUNNING ON PORT ${PORT}`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   AI ENDPOINT: http://localhost:${PORT}/api/detection`);
});