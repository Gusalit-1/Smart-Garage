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
    uid_tag VARCHAR(50) NOT NULL UNIQUE, -- Kode unik kartu (misal: 83 A2 1F 0D)
    pemilik VARCHAR(100) NOT NULL,       -- Nama pemilik (misal: Wayan Giri)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Garage Logs (Riwayat akses: Web, RFID, dan Foto)
CREATE TABLE IF NOT EXISTS garage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) DEFAULT 'System', -- Nama user web atau pemilik RFID
    aktivitas VARCHAR(100) NOT NULL,        -- Contoh: 'Akses RFID', 'Buka via Web'
    foto VARCHAR(255) DEFAULT NULL,         -- Nama file gambar dari ESP32-CAM
    waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Data Awal (Dummy Data)
-- Password Login: admin123
INSERT INTO users (username, password, nama_lengkap) 
VALUES ('admin', 'admin123', 'admin');

-- Daftar kartu RFID (Sesuai dengan kode di ESP32 & JavaScript)
INSERT INTO rfid_cards (uid_tag, pemilik) 
VALUES ('77 97 35 02', 'Wayan Giri'),
       ('04 0E 45 EA', 'Gusalit'),
       ('05 81 25 1D', 'Gung Rama');
