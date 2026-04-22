# Smart Garage Monitoring & Security System 🚗🔒

Proyek sistem monitoring garasi pintar berbasis **IoT** yang mengintegrasikan kendali pintu (gate), pemantauan kamera secara *real-time*, dan sistem log akses menggunakan **RFID** dan **Database**.

## 📌 Fitur Utama
* **Live Streaming:** Pantauan kamera garasi secara langsung menggunakan ESP32-CAM.
* **Remote Control:** Buka dan tutup pintu garasi melalui dashboard web.
* **Security Lock:** Mode penguncian total yang menolak semua akses masuk.
* **Access History:** Pencatatan setiap akses (UID, Nama, Waktu, dan Status) ke database MySQL.
* **Image Capture:** Pengambilan foto otomatis oleh ESP32-CAM setiap kali ada aktivitas di RFID Reader.

## 📂 Struktur Folder
```text
ROBOTIKA/
├── src/                # Web Dashboard (HTML, CSS, JS)
├── firmware/           # Kode Mikrokontroler
│   ├── espcam/        # Firmware untuk ESP32-CAM (Kamera & Upload)
│   └── esputama/      # Firmware untuk ESP32 Utama (RFID & Servo)
├── docs/               # Dokumentasi skema dan database (.sql)
└── README.md
```

## 🛠️ Teknologi yang Digunakan
* **Hardware:** ESP32, ESP32-CAM, RFID RC522, Servo Motor.
* **Communication:** MQTT Protocol (Paho MQTT), HTTP POST.
* **Frontend:** Bootstrap 5, FontAwesome, JavaScript (Vanilla).
* **Backend:** PHP & MySQL.

## 🚀 Cara Instalasi

### 1. Persiapan Database
1.  Buka phpMyAdmin.
2.  Buat database baru bernama `db_smart_garage`.
3.  Impor file SQL yang ada di folder `docs/` atau buat tabel `rfid_logs` sesuai skema.

### 2. Konfigurasi Web Dashboard
1.  Pindahkan isi folder `src/` ke folder `htdocs` (XAMPP).
2.  Sesuaikan alamat Broker MQTT pada file `assets/js/config.js`.

### 3. Flash Firmware
1.  Buka folder `firmware/` menggunakan Arduino IDE.
2.  Install library yang dibutuhkan: `PubSubClient`, `ESP32-CAM`, `MFRC522`.
3.  Sesuaikan SSID, Password WiFi, dan IP Server pada masing-masing file `.ino`.
4.  Upload ke perangkat ESP32 dan ESP32-CAM.

## 📝 Penggunaan
1.  Akses dashboard melalui browser (contoh: `localhost/ROBOTIKA/src/`).
2.  Tempelkan kartu RFID pada reader.
3.  Jika akses diterima, kamera akan mengambil foto dan gate akan terbuka.
4.  Gunakan tombol **LOCK** pada dashboard untuk mengamankan garasi secara total.

---
