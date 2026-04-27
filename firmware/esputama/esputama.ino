#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <HTTPClient.h>
#include <WiFiManager.h> 
#include <ESP32Servo.h>

// --- 1. KONFIGURASI MQTT & SERVER ---
// Menggunakan broker EMQX (sesuaikan jika kamu menggunakan IP publik sendiri)
const char *mqtt_broker = "broker.emqx.io"; 
const int mqtt_port = 1883;

// UPDATE: Pastikan IP ini sesuai dengan IPv4 Laptop kamu (Hasil ipconfig)
const char *server_url = "http://192.168.1.17/ROBOTIKA/simpan_log.php"; 

// --- 2. KONFIGURASI PIN ---
#define SS_PIN 5
#define RST_PIN 22
#define BUZZER_PIN 25
#define SERVO_1_PIN 13 
#define SERVO_2_PIN 12 

// --- 3. STATUS & SUDUT SERVO ---
const int SUDUT_BUKA = 20;
const int SUDUT_TUTUP = 130;
int posisiSekarang = 130;
bool pintuTerbuka = false;
bool sistemTerkunci = false;
int kartuSalahCounter = 0;

// --- 4. DAFTAR USER RFID (Source: User Summary) ---
struct User {
    const char *uid;
    const char *nama;
};
User allowedUsers[] = {
    {"77 97 35 02", "Wayan Giri"},
    {"04 87 60 4A 9B 19 90", "Gusalit"},
    {"05 81 25 1D", "Gung Rama"}
};
const int TOTAL_USER = sizeof(allowedUsers) / sizeof(allowedUsers[0]);

MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient client(espClient);

// --- 5. FUNGSI SERVO BERHADAPAN ---
void dualServoWrite(int angle) {
    int us1 = 600 + (angle * (2400 - 600) / 180);
    uint32_t duty1 = (uint32_t)((us1 * 65535) / 20000);
    
    int reverseAngle = 180 - angle; 
    int us2 = 600 + (reverseAngle * (2400 - 600) / 180);
    uint32_t duty2 = (uint32_t)((us2 * 65535) / 20000);
    
    ledcWrite(SERVO_1_PIN, duty1);
    ledcWrite(SERVO_2_PIN, duty2);
}

void servoMoveSmooth(int target, int speed) {
    while (posisiSekarang != target) {
        if (posisiSekarang < target) posisiSekarang++;
        else posisiSekarang--;
        dualServoWrite(posisiSekarang);
        delay(speed);
    }
}

void beep(int ms) {
    ledcWriteTone(BUZZER_PIN, 2000);
    delay(ms);
    ledcWriteTone(BUZZER_PIN, 0);
}

// --- 6. FUNGSI UPDATE STATUS (DENGAN RETAINED) ---
void updateStatusWeb() {
    // Flag 'true' di akhir memerintahkan broker untuk menyimpan status terakhir
    client.publish("gusalit/gate/status", pintuTerbuka ? "OPEN" : "CLOSE", true);
    client.publish("gusalit/gate/lock", sistemTerkunci ? "LOCKED" : "UNLOCKED", true);
    client.publish("gusalit/gate/main_ip", WiFi.localIP().toString().c_str(), true);
}

void sendLogToDB(String uid) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(server_url);
        http.setTimeout(2000);
        http.addHeader("Content-Type", "application/x-www-form-urlencoded");
        String postData = "uid=" + uid;
        int httpResponseCode = http.POST(postData);
        Serial.printf("HTTP Response: %d\n", httpResponseCode);
        http.end();
    }
}

void eksekusiPintu(bool buka, String trigger) {
    // PROTEKSI: Jika sistem LOCKED, tombol fisik/RFID tidak bisa jalan
    if (sistemTerkunci) {
        Serial.println("AKSES DITOLAK: Sistem dalam mode LOCKED. Unlock via Web!");
        beep(1000); 
        return;
    }

    if (buka) {
        pintuTerbuka = true; 
        updateStatusWeb();
        beep(100); delay(100); beep(100);
        servoMoveSmooth(SUDUT_BUKA, 15);
    } else {
        pintuTerbuka = false; 
        updateStatusWeb();
        beep(300);
        servoMoveSmooth(SUDUT_TUTUP, 15);
    }
}

// --- 7. MQTT CALLBACK (Terima Perintah dari Dashboard) ---
void callback(char *topic, byte *payload, unsigned int length) {
    String msg = "";
    for (int i = 0; i < (int)length; i++) msg += (char)payload[i];
    
    Serial.println("Dashboard Command: " + msg);

    if (String(topic) == "gusalit/gate/command") {
        if (msg == "LOCK") { 
            sistemTerkunci = true; 
            updateStatusWeb(); 
            beep(600); 
        }
        else if (msg == "UNLOCK") { 
            sistemTerkunci = false; 
            kartuSalahCounter = 0; // Reset counter saat di-unlock manual dari web
            updateStatusWeb(); 
            beep(100); 
        }
        // Tombol OPEN/CLOSE hanya berfungsi jika TIDAK terkunci
        else if (msg == "OPEN" && !pintuTerbuka && !sistemTerkunci) { 
            eksekusiPintu(true, "Dashboard"); 
        }
        else if (msg == "CLOSE" && pintuTerbuka && !sistemTerkunci) { 
            eksekusiPintu(false, "Dashboard"); 
        }
        else if ((msg == "OPEN" || msg == "CLOSE") && sistemTerkunci) {
            Serial.println("Perintah diabaikan: Sistem Terkunci!");
        }
    }
}

void setup() {
    Serial.begin(115200);
    SPI.begin();
    rfid.PCD_Init();
    
    // Inisialisasi PWM untuk Buzzer dan Servo
    ledcAttach(BUZZER_PIN, 2000, 8);
    ledcAttach(SERVO_1_PIN, 50, 16);
    ledcAttach(SERVO_2_PIN, 50, 16);
    dualServoWrite(SUDUT_TUTUP);

    // WiFi Manager: Jika tidak konek, buka HP dan cari WiFi "Gerbang_Gusalit_AP"
    WiFiManager wm;
    if(!wm.autoConnect("Gerbang_Gusalit_AP", "12345678")) {
        Serial.println("Gagal konek, restart...");
        delay(3000);
        ESP.restart();
    }

    client.setServer(mqtt_broker, mqtt_port);
    client.setCallback(callback);
}

void loop() {
    if (!client.connected()) {
        Serial.print("Menghubungkan ke MQTT...");
        if (client.connect("ESP32_Gusalit_Main_Unit")) {
            Serial.println("Terhubung!");
            client.subscribe("gusalit/gate/command");
            updateStatusWeb(); // Kirim status awal saat baru konek
        } else { 
            delay(5000); 
        }
    }
    client.loop();

    // Logika Pembacaan RFID
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
        String uidStr = "";
        for (byte i = 0; i < rfid.uid.size; i++) {
            uidStr += (rfid.uid.uidByte[i] < 0x10 ? "0" : "");
            uidStr += String(rfid.uid.uidByte[i], HEX);
            if (i < rfid.uid.size - 1) uidStr += " ";
        }
        uidStr.toUpperCase();

        Serial.println("RFID Detected: " + uidStr);

        // A. Perintahkan ESP32-CAM ambil foto
        client.publish("gusalit/gate/camera_command", "CAPTURE");
        
        // B. Kirim info UID ke Dashboard
        client.publish("gusalit/gate/rfid", uidStr.c_str());

        // C. Cek Daftar User
        bool found = false;
        for (int i = 0; i < TOTAL_USER; i++) {
            if (uidStr == allowedUsers[i].uid) {
                found = true;
                kartuSalahCounter = 0; // Reset counter karena kartu benar ditemukan
                client.publish("gusalit/gate/access", "GRANTED");
                eksekusiPintu(!pintuTerbuka, "RFID: " + String(allowedUsers[i].nama));
                break;
            }
        }

        if (!found) {
            kartuSalahCounter++; // Tambah hitungan kartu salah
            Serial.printf("Kartu Tidak Dikenal! (Percobaan: %d/3)\n", kartuSalahCounter);
            
            client.publish("gusalit/gate/access", "DENIED");
            
            // JIKA SUDAH 3 KALI SALAH
            if (kartuSalahCounter >= 3) {
                sistemTerkunci = true;
                updateStatusWeb();
                Serial.println("SISTEM OTOMATIS TERKUNCI (SECURITY LOCK)");
                client.publish("gusalit/gate/status", "SECURITY_ALERT", true);
                beep(2000); // Beep panjang sebagai tanda bahaya
            } else {
                beep(800);
            }
        }
}
}