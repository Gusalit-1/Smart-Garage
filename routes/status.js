const express = require('express');
const router = express.Router();
const db = require('../includes/config');

// Pengganti get_status.php
router.get('/gate-status', (req, res) => {
    const query = "SELECT gate_status, lock_status FROM settings WHERE id = 1";
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length > 0) {
            // Mengembalikan format JSON yang sama persis dengan PHP Anda
            res.json({
                gate_status: results[0].gate_status,
                lock_status: results[0].lock_status
            });
        } else {
            res.status(404).json({ message: "Settings not found" });
        }
    });
});

module.exports = router;