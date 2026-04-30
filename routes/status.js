const express = require('express');
const router = express.Router();

// Get db from app settings
const getDb = (req) => req.app.get('db');

// Get gate status
router.get('/gate-status', async (req, res) => {
    const db = getDb(req);
    
    if (!db) {
        return res.status(500).json({ error: 'Database tidak terhubung' });
    }
    
    try {
        const [results] = await db.query("SELECT gate_status, lock_status FROM settings WHERE id = 1");
        
        if (results.length > 0) {
            res.json({
                gate_status: results[0].gate_status,
                lock_status: results[0].lock_status
            });
        } else {
            res.status(404).json({ message: "Settings not found" });
        }
    } catch (err) {
        console.error('Status error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
