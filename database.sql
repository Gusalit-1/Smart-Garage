-- 1. Buat Database
CREATE DATABASE IF NOT EXISTS smart_garage;
USE smart_garage;

-- 2. Tabel Users (Untuk akun login ke web dashboard)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nama_lengkap VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel RFID Cards (Daftar kartu yang diizinkan akses garasi)
CREATE TABLE IF NOT EXISTS rfid_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid_tag VARCHAR(50) NOT NULL UNIQUE,
    pemilik VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Garage Logs (Riwayat akses: Web, RFID, dan Foto)
CREATE TABLE IF NOT EXISTS garage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) DEFAULT 'System',
    aktivitas VARCHAR(100) NOT NULL,
    foto VARCHAR(255) DEFAULT NULL,
    waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Settings (Fixed table name consistency)
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gate_status VARCHAR(20) DEFAULT 'CLOSE',
    lock_status VARCHAR(20) DEFAULT 'UNLOCKED',
    camera_ip VARCHAR(50) DEFAULT '',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Add indexes for performance
CREATE INDEX idx_logs_waktu ON garage_logs(waktu);
CREATE INDEX idx_rfid_uid ON rfid_cards(uid_tag);

-- 6. Data Awal - Updated with bcrypt hash for admin (bcrypt.hashSync('admin123', 10))
INSERT IGNORE INTO users (username, password, nama_lengkap) 
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator');

-- RFID cards
INSERT IGNORE INTO rfid_cards (uid_tag, pemilik) 
VALUES ('77 97 35 02', 'Wayan Giri'),
       ('04 87 60 4A 9B 19 90', 'Gusalit'),
       ('05 81 25 1D', 'Gung Rama');

-- Settings data
INSERT INTO settings (id, gate_status, lock_status, camera_ip) 
VALUES (1, 'CLOSE', 'UNLOCKED', '192.168.0.226')
ON DUPLICATE KEY UPDATE 
    gate_status = 'CLOSE', 
    lock_status = 'UNLOCKED',
    camera_ip = '192.168.0.226',
    updated_at = CURRENT_TIMESTAMP;
