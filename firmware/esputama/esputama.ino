#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <HTTPClient.h>

// --- 1. KONFIGURASI WIFI & MQTT ---
const char *ssid = "ALDI BALI TRANSPORT";
const char *pass = "balialdi";
const char *mqtt_broker = "broker.emqx.io";
const int mqtt_port = 1883;

// --- 2. URL SERVER ---
const char *server_url = "http://192.168.0.100/ROBOTIKA/simpan_log.php";

// --- 3. KONFIGURASI PIN ---
#define SS_PIN 5
#define RST_PIN 22
#define BUZZER_PIN 25
#define SERVO_1_PIN 13 // Servo Kiri
#define SERVO_2_PIN 12 // Servo Kanan

// --- 4. STATUS & SUDUT SERVO ---
const int SUDUT_BUKA = 20;
const int SUDUT_TUTUP = 130;
int posisiSekarang = 130;
bool pintuTerbuka = false;
bool sistemTerkunci = false;

// --- 5. DAFTAR USER RFID ---
struct User {
    const char *uid;
    const char *nama;
};

User allowedUsers[] = {
    {"77 97 35 02", "Wayan Giri"},
    {"04 0E 45 EA", "Gusalit"},
    {"05 81 25 1D", "Gung Rama"}
};
const int TOTAL_USER = sizeof(allowedUsers) / sizeof(allowedUsers[0]);

// --- 6. INISIALISASI OBJECT ---
MFRC522 rfid(SS_PIN, RST_PIN);
WiFiClient espClient;
PubSubClient client(espClient);

// --- 7. FUNGSI SERVO (DUAL SERVO) ---
void dualServoWrite(int angle) {
    // Servo 1 (Normal)
    int us1 = 600 + (angle * (2400 - 600) / 180);
    uint32_t duty1 = (uint32_t)((us1 * 65535) / 20000);
    
    // Servo 2 (Dibalik karena berhadapan)
    // Jika angle 20 (buka), maka servo 2 akan ke 160 (180 - 20)
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

void updateStatusWeb() {
    client.publish("gusalit/gate/status", pintuTerbuka ? "OPEN" : "CLOSE");
    client.publish("gusalit/gate/lock", sistemTerkunci ? "LOCKED" : "UNLOCKED");
}

void sendLogToDB(String uid) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(server_url);
        http.addHeader("Content-Type", "application/x-www-form-urlencoded");
        String postData = "uid=" + uid;
        int httpResponseCode = http.POST(postData);
        http.end();
    }
}

void eksekusiPintu(bool buka, String trigger) {
    if (sistemTerkunci && trigger.indexOf("RFID") != -1) {
        Serial.println("System LOCKED!");
        beep(1000);
        return;
    }

    if (buka) {
        pintuTerbuka = true;
        updateStatusWeb();
        beep(100); delay(100); beep(100);
        servoMoveSmooth(SUDUT_BUKA, 20);
    } else {
        pintuTerbuka = false;
        updateStatusWeb();
        beep(300);
        servoMoveSmooth(SUDUT_TUTUP, 20);
    }
}

// --- 8. MQTT CALLBACK ---
void callback(char *topic, byte *payload, unsigned int length) {
    String msg = "";
    for (int i = 0; i < length; i++) msg += (char)payload[i];

    if (String(topic) == "gusalit/gate/command") {
        if (msg == "LOCK") { sistemTerkunci = true; updateStatusWeb(); beep(600); }
        else if (msg == "UNLOCK") { sistemTerkunci = false; updateStatusWeb(); beep(100); }
        else if (msg == "OPEN" && !pintuTerbuka) { eksekusiPintu(true, "Web Control"); }
        else if (msg == "CLOSE" && pintuTerbuka) { eksekusiPintu(false, "Web Control"); }
    }
}

// --- 9. SETUP ---
void setup() {
    Serial.begin(115200);
    SPI.begin();
    rfid.PCD_Init();
    
    // Inisialisasi PWM untuk Buzzer
    ledcAttach(BUZZER_PIN, 2000, 8);
    
    // Inisialisasi PWM untuk Servo 1 (Pin 13) dan Servo 2 (Pin 12)
    ledcAttach(SERVO_1_PIN, 50, 16);
    ledcAttach(SERVO_2_PIN, 50, 16);
    
    dualServoWrite(SUDUT_TUTUP);

    WiFi.begin(ssid, pass);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    client.setServer(mqtt_broker, mqtt_port);
    client.setCallback(callback);
}

// --- 10. LOOP ---
void loop() {
    if (!client.connected()) {
        if (client.connect("ESP32_Gusalit_Main")) {
            client.subscribe("gusalit/gate/command");
            updateStatusWeb();
        } else {
            delay(5000);
        }
    }
    client.loop();

    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
        String uidStr = "";
        for (byte i = 0; i < rfid.uid.size; i++) {
            uidStr += (rfid.uid.uidByte[i] < 0x10 ? "0" : "");
            uidStr += String(rfid.uid.uidByte[i], HEX);
            if (i < rfid.uid.size - 1) uidStr += " ";
        }
        uidStr.toUpperCase();

        client.publish("gusalit/gate/rfid", uidStr.c_str());
        sendLogToDB(uidStr);

        bool found = false;
        for (int i = 0; i < TOTAL_USER; i++) {
            if (uidStr == allowedUsers[i].uid) {
                found = true;
                client.publish("gusalit/gate/access", "GRANTED");
                eksekusiPintu(!pintuTerbuka, "RFID: " + String(allowedUsers[i].nama));
                break;
            }
        }

        if (!found) {
            client.publish("gusalit/gate/access", "DENIED");
            beep(800);
        }

        rfid.PICC_HaltA();
        rfid.PCD_StopCrypto1();
    }
}