const express = require('express');
const router = express.Router();

// Get dependencies from app settings
const getDb = (req) => req.app.get('db');
const getMqttClient = (req) => req.app.get('mqttClient');

// In-memory failed attempts counter (for auto-lock feature)
let failedAttempts = 0;
const MAX_FAILED_ATTEMPTS = 3;

// --- 1. ENDPOINT AI MONITORING ---
router.get('/ai-access', async (req, res) => {
    const { access, object } = req.query;

    if (access === 'granted') {
        const db = getDb(req);
        if (!db) return res.status(500).send("Database Error");

        const username = "AI_SYSTEM";
        const label = object || "OBJECT";
        const aktivitas = `DETECTED: ${label.toUpperCase()}`;

        try {
            // Simpan hanya ke logs (Tanpa buka pintu otomatis)
            await db.query("INSERT INTO garage_logs (username, aktivitas, waktu) VALUES (?, ?, NOW())", 
                [username, aktivitas]);
            res.send("Log AI Tersimpan");
        } catch (err) {
            console.error('AI access error:', err);
            res.status(500).send("Database Error");
        }
    } else {
        res.status(400).send("Invalid Access");
    }
});

// --- 2. ENDPOINT RFID ACCESS (dengan Auto-Lock) ---
// Dipanggil oleh ESP32 saat kartu di-tap
router.all('/rfid-access', async (req, res) => {
    const uid = req.query.uid || req.body.uid;
    const db = getDb(req);
    const mqttClient = getMqttClient(req);

    if (!uid) return res.send("WAITING_FOR_UID");
    if (!db) return res.status(500).send("DATABASE_ERROR");

    const trimmedUid = uid.trim();
    const nama_foto = "capture_live.jpg";

    try {
        // Cek pemilik kartu di database (parameterized query)
        const [results] = await db.query("SELECT pemilik FROM rfid_cards WHERE uid_tag = ? LIMIT 1", 
            [trimmedUid]);

        let user, aksi, isAllowed;

        if (results.length > 0) {
            // Access granted
            user = results[0].pemilik;
            aksi = "ACCESS GRANTED";
            isAllowed = true;
            failedAttempts = 0; // Reset failed attempts on success

            // Update gate status
            await db.query("UPDATE settings SET gate_status = 'OPEN' WHERE id = 1");

            // Publish to MQTT
            if (mqttClient && mqttClient.connected) {
                mqttClient.publish('gusalit/gate/status', 'OPEN');
            }
        } else {
            // Access denied
            user = "STRANGER";
            aksi = `ACCESS DENIED (UID: ${trimmedUid})`;
            isAllowed = false;
            failedAttempts++;

            // Auto-lock after 3 failed attempts
            if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
                await db.query("UPDATE settings SET lock_status = 'LOCKED' WHERE id = 1");
                aksi = `LOCK MODE ACTIVATED - ${MAX_FAILED_ATTEMPTS}x FAILED`;
                
                if (mqttClient && mqttClient.connected) {
                    mqttClient.publish('gusalit/gate/lock', 'LOCKED');
                }
            }
        }

        // Simpan log ke database (parameterized query)
        await db.query("INSERT INTO garage_logs (username, aktivitas, foto, waktu) VALUES (?, ?, ?, NOW())", 
            [user, aksi, nama_foto]);

        // Response to ESP32
        if (isAllowed) {
            res.send(`GRANTED:${user}`);
        } else {
            res.send("DENIED");
        }
    } catch (err) {
        console.error('RFID access error:', err);
        res.status(500).send("DATABASE_ERROR");
    }
});

module.exports = router;
