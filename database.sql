CREATE DATABASE IF NOT EXISTS smart_garage;
USE smart_garage;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    nama_lengkap VARCHAR(100)
);

CREATE TABLE rfid_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid_tag VARCHAR(50) UNIQUE,
    pemilik VARCHAR(100)
);

CREATE TABLE garage_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100),
    aktivitas VARCHAR(100),
    waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
    id INT PRIMARY KEY,
    gate_status VARCHAR(20),
    lock_status VARCHAR(20)
);

-- User admin (password: admin123)
INSERT INTO users (username, password, nama_lengkap) 
VALUES ('admin', 'admin123', 'Administrator');

INSERT INTO rfid_cards (uid_tag, pemilik) 
VALUES ('77 97 35 02', 'Wayan Giri'), ('04 87 60 4A 9B 19 90', 'Gusalit');

INSERT INTO settings (id, gate_status, lock_status) VALUES (1, 'CLOSE', 'UNLOCKED');