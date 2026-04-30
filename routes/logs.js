const express = require('express');
const router = express.Router();
const db = require('../includes/config'); // Fixed import path

// --- PENGGANTI simpan_ai.php (Akses Kamera AI) ---
router.get('/ai-access', (req, res) => {
    const { access } = req.query;

    if (access === 'granted') {
        const username = "AI_CAMERA";
        const aktivitas = "ACCESS GRANTED - FACE RECOGNIZED";

        // 1. Update status gate
        const updateGate = "UPDATE settings SET gate_status = 'OPEN' WHERE id = 1";
        // 2. Simpan ke logs
        const insertLog = "INSERT INTO garage_logs (username, aktivitas, waktu) VALUES (?, ?, NOW())";

        db.query(updateGate, (err) => {
            if (err) return res.status(500).send("Database Error");
            
            db.query(insertLog, [username, aktivitas], (err) => {
                if (err) return res.status(500).send("Database Error");
                res.send("Success");
            });
        });
    } else {
        res.status(400).send("Invalid Access");
    }
});

// --- PENGGANTI simpan_log.php (Akses RFID ESP32) ---
router.all('/rfid-access', (req, res) => {
    // Node.js bisa menerima UID dari query string (?uid=...)
    const uid = req.query.uid || req.body.uid;

    if (!uid) {
        return res.send("READY: Menunggu data UID dari ESP32.");
    }

    const trimmedUid = uid.trim();
    const nama_foto = "capture_live.jpg";

    // Cek pemilik kartu
    const checkUser = "SELECT pemilik FROM rfid_cards WHERE uid_tag = ?";
    db.query(checkUser, [trimmedUid], (err, results) => {
        if (err) return res.status(500).send("DATABASE_ERROR");

        let user, aksi;
        if (results.length > 0) {
            user = results[0].pemilik;
            aksi = "AKSES GRANTED";
        } else {
            user = "STRANGER";
            aksi = `AKSES DENIED (UID: ${trimmedUid})`;
        }

        // Insert ke garage_logs
        const insertLog = "INSERT INTO garage_logs (username, aktivitas, foto) VALUES (?, ?, ?)";
        db.query(insertLog, [user, aksi, nama_foto], (err) => {
            if (err) return res.status(500).send("DATABASE_ERROR: " + err.message);
            res.send(`OK: Berhasil simpan log dan referensi foto untuk ${user}`);
        });
    });
});

module.exports = router;