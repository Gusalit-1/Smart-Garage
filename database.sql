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

-- 5. Tabel System Config (IP Kamera, Status Lock, dll)
CREATE TABLE IF NOT EXISTS system_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Tabel Failed RFID Attempts (Untuk auto-lock)
CREATE TABLE IF NOT EXISTS failed_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(50),
    ip_address VARCHAR(50),
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Data Awal
INSERT INTO users (username, password, nama_lengkap) 
VALUES ('admin', 'admin123', 'admin');

INSERT INTO rfid_cards (uid_tag, pemilik) 
VALUES ('77 97 35 02', 'Wayan Giri'),
       ('04 87 60 4A 9B 19 90', 'Gusalit'),
       ('05 81 25 1D', 'Gung Rama');

INSERT INTO system_config (config_key, config_value) 
VALUES ('camera_ip', ''),
       ('lock_status', 'UNLOCKED'),
       ('gate_status', 'CLOSE')
ON DUPLICATE KEY UPDATE config_value = config_value;
