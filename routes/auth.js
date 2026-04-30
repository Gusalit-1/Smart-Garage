const express = require('express');
const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = req.app.get('db');

    try {
        const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);

        if (rows.length === 0) return res.json({ success: false, message: 'gagal' });

        const user = rows[0];
        const passwordMatch = (password === user.password);

        if (passwordMatch) {
            req.session.status = "login";
            req.session.username = user.username;
            res.json({ success: true, redirect: '/dashboard.html' });
        } else {
            res.json({ success: false, message: 'gagal' });
        }
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

module.exports = router;