#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFiManager.h> 
#include <ESP32Servo.h>


const char *mqtt_broker = "broker.emqx.io"; 
const int mqtt_port = 1883;


#define SS_PIN 5
#define RST_PIN 22
#define BUZZER_PIN 25
#define SERVO_1_PIN 13 
#define SERVO_2_PIN 12 


const int SUDUT_BUKA = 20;
const int SUDUT_TUTUP = 130;
int posisiSekarang = 130;
bool pintuTerbuka = false;
bool sistemTerkunci = false;
int kartuSalahCounter = 0;


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


void updateStatusWeb() {
    client.publish("gusalit/gate/status", pintuTerbuka ? "OPEN" : "CLOSE", true);
    client.publish("gusalit/gate/lock", sistemTerkunci ? "LOCKED" : "UNLOCKED", true);
    client.publish("gusalit/gate/main_ip", WiFi.localIP().toString().c_str(), true);
}

void eksekusiPintu(bool buka, String trigger) {
    if (sistemTerkunci) {
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
            kartuSalahCounter = 0; 
            updateStatusWeb(); 
            beep(100); 
        }
        else if (msg == "OPEN" && !pintuTerbuka && !sistemTerkunci) { 
            eksekusiPintu(true, "Dashboard"); 
        }
        else if (msg == "CLOSE" && pintuTerbuka && !sistemTerkunci) { 
            eksekusiPintu(false, "Dashboard"); 
        }
    }
}


void setup() {
    Serial.begin(115200);
    SPI.begin();
    rfid.PCD_Init();
    
    ledcAttach(BUZZER_PIN, 2000, 8);
    ledcAttach(SERVO_1_PIN, 50, 16);
    ledcAttach(SERVO_2_PIN, 50, 16);
    dualServoWrite(SUDUT_TUTUP);

    WiFiManager wm;
    if(!wm.autoConnect("ESP UTAMA_SMART GARAGE", "12345678")) {
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

        Serial.println("RFID Detected: " + uidStr);
        client.publish("gusalit/gate/rfid", uidStr.c_str());

        bool found = false;
        for (int i = 0; i < TOTAL_USER; i++) {
            if (uidStr == allowedUsers[i].uid) {
                found = true;
                kartuSalahCounter = 0;

                // Logika History agar tidak selalu "GRANTED" saat Locked
                if (sistemTerkunci) {
                    client.publish("gusalit/gate/access", "BLOCKED-LOCKED");
                } else {
                    client.publish("gusalit/gate/access", "GRANTED");
                }

                eksekusiPintu(!pintuTerbuka, "RFID: " + String(allowedUsers[i].nama));
                break;
            }
        }

        if (!found) {
            kartuSalahCounter++;
            Serial.printf("Kartu Tidak Dikenal! (Percobaan: %d/3)\n", kartuSalahCounter);
            client.publish("gusalit/gate/access", "DENIED (UNREGISTERED)");
            
            if (kartuSalahCounter >= 3) {
                sistemTerkunci = true;
                updateStatusWeb();
                client.publish("gusalit/gate/status", "SECURITY_ALERT", true);
                beep(2000); 
            } else {
                beep(800);
            }
        }
        
        rfid.PICC_HaltA();
        rfid.PCD_StopCrypto1();
    }
}