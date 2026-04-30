module.exports = (req, res, next) => {
    const timeout_duration = 600; // 10 menit dalam detik

    // 1. Cek apakah sudah login
    if (!req.session.status || req.session.status !== "login") {
        return res.status(401).json({ redirect: '/index.html', pesan: 'belum_login' });
    }

    // 2. Logika Auto-Logout
    if (req.session.last_activity) {
        const currentTime = Math.floor(Date.now() / 1000);
        const elapsed_time = currentTime - req.session.last_activity;

        if (elapsed_time > timeout_duration) {
            req.session.destroy();
            return res.status(401).json({ redirect: '/index.html', pesan: 'expired' });
        }
    }

    // 3. Update waktu aktivitas terakhir
    req.session.last_activity = Math.floor(Date.now() / 1000);
    
    // Lanjut ke proses berikutnya
    next();
};