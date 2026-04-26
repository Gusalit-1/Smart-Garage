#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <HTTPClient.h>


// --- 1. KONFIGURASI PIN CAMERA (Model AI-Thinker) ---
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// --- 2. KONFIGURASI MQTT ---
const char* mqtt_broker = "broker.emqx.io";
const int mqtt_port = 1883;
const char* topic_ip = "gusalit/gate/camera_ip";
const char* topic_cmd = "gusalit/gate/camera_command";

WiFiClient espClient;
PubSubClient client(espClient);

// Prototipe fungsi
void startCameraServer();

// --- 3. FUNGSI CALLBACK (Terima perintah dari ESP Utama) ---
void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) msg += (char)payload[i];

  Serial.println("Pesan MQTT masuk: " + msg);

  if (String(topic) == topic_cmd) {
    if (msg == "CAPTURE") {
      Serial.println(">>> TRIGGER DITERIMA! Mengambil Foto...");
      sendPhoto(); // <--- INI KUNCI OTOMATISNYA
    }
  }
}

// --- 4. FUNGSI RECONNECT (Jaga koneksi & Lapor IP) ---
void reconnect() {
  while (!client.connected()) {
    Serial.print("Menghubungkan MQTT...");
    // ID Unik agar tidak bentrok dengan ESP Utama
    String clientId = "ESP32CAM-Gusalit-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("Terhubung!");
      client.subscribe(topic_cmd);
      
      // Kirim IP ke Dashboard (Retained = true agar tersimpan di broker)
      String ipAddr = WiFi.localIP().toString();
      client.publish(topic_ip, ipAddr.c_str(), true);
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Coba lagi dalam 5 detik");
      delay(5000);
    }
  }
}
void sendPhoto() {
  camera_fb_t * fb = NULL;
  fb = esp_camera_fb_get();
  if(!fb) {
    Serial.println("Gagal ambil frame foto!");
    return;
  }

  // IP LAPTOP KAMU (Hasil ipconfig tadi)
  const char* serverUrl = "http://192.168.1.17/ROBOTIKA/upload_foto.php";

  HTTPClient http;
  http.begin(serverUrl);
  
  // Header standar untuk pengiriman file (Multipart form-data)
  http.addHeader("Content-Type", "image/jpeg");

  Serial.println("Sedang mengirim foto ke laptop...");
  int httpResponseCode = http.POST(fb->buf, fb->len);

  if (httpResponseCode > 0) {
    Serial.printf("BERHASIL! Respon: %d\n", httpResponseCode);
  } else {
    Serial.printf("GAGAL! Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
  esp_camera_fb_return(fb); // Bersihkan memori
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);

  // --- 5. KONFIGURASI SENSOR KAMERA ---
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if(psramFound()){
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  // --- 6. WIFI MANAGER (Portal Konfigurasi) ---
  WiFiManager wm;
  wm.setClass("invert"); // Dark Mode portal
  
  // Buat Access Point: ESP32-CAM-Gusalit
  if(!wm.autoConnect("ESP32-CAM-Gusalit", "12345678")) {
    Serial.println("Gagal konek WiFi, Restart...");
    delay(3000);
    ESP.restart();
  }

  // --- 7. MULAI SERVER & MQTT ---
  startCameraServer(); // Memulai web server internal ESP32-CAM

  Serial.print("Kamera Ready! IP: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  delay(10); // Stabilitas sistem
}