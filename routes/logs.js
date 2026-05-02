const express = require('express');
const router = express.Router();

const getDb = (req) => req.app.get('db');
const getMqttClient = (req) => req.app.get('mqttClient');

router.all('/rfid-access', async (req, res) => {
    const uid = req.query.uid || req.body.uid;
    const db = getDb(req);
    const mqttClient = getMqttClient(req);

    if (!uid) return res.send("WAITING_FOR_UID");
    if (!db) return res.status(500).send("DATABASE_ERROR");

    const trimmedUid = uid.trim().toUpperCase();

    try {

        const [results] = await db.query("SELECT pemilik FROM rfid_cards WHERE uid_tag = ? LIMIT 1", [trimmedUid]);

        let user, aksi, isAllowed;

        if (results.length > 0) {
            user = results[0].pemilik;
            aksi = "GRANTED"; 
            isAllowed = true;


            await db.query("UPDATE settings SET gate_status = 'OPEN' WHERE id = 1");
            

            if (mqttClient && mqttClient.connected) {
                mqttClient.publish('gusalit/gate/rfid', trimmedUid);
                mqttClient.publish('gusalit/gate/status', 'OPEN'); 
                mqttClient.publish('gusalit/gate/access', aksi);
            }
        } else {
            user = "STRANGER";
            aksi = `DENIED (UID: ${trimmedUid})`;
            isAllowed = false;
            
            if (mqttClient && mqttClient.connected) {
                mqttClient.publish('gusalit/gate/rfid', trimmedUid);
                mqttClient.publish('gusalit/gate/access', aksi);
            }
        }


        try {
            console.log(`[LOG] Menyimpan riwayat: ${user} - ${aksi}`);
            await db.query(
                "INSERT INTO garage_logs (username, aktivitas, waktu) VALUES (?, ?, NOW())", 
                [user, aksi]
            );
        } catch (dbErr) {
            console.error("Gagal simpan ke garage_logs:", dbErr.message);
        }


        res.send(isAllowed ? `GRANTED:${user}` : "DENIED");

    } catch (err) {
        console.error('RFID Error:', err.message);
        res.status(500).send("DATABASE_ERROR");
    }
});

module.exports = router;