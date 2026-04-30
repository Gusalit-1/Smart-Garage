const express = require('express');
const router = express.Router();
const db = require('../includes/config'); // Fixed import path

// Logika Login (Pengganti auth.php)
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(query, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            const user = results[0];

            // Simpan data ke session (Sama dengan $_SESSION di PHP)
            req.session.status = "login";
            req.session.username = user.username;
            req.session.last_activity = Math.floor(Date.now() / 1000);

            // Redirect ke dashboard (Client-side redirect lebih disarankan untuk API)
            res.json({ success: true, redirect: '/dashboard.html' });
        } else {
            res.json({ success: false, message: 'gagal' });
        }
    });
});

// Logika Logout (Pengganti logout.php)
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).send("Gagal logout");
        res.json({ success: true, message: 'logout' });
    });
});

module.exports = router;