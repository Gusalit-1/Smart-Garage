#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>

// ===========================
// Pastikan board_config.h berisi definisi pin yang benar (Y2, Y3, dll)
// ===========================
#include "board_config.h"

const char* mqtt_broker = "broker.emqx.io";
const int mqtt_port = 1883;
const char* topic_ip = "gusalit/gate/camera_ip";
const char* topic_cmd = "gusalit/gate/camera_command";

WiFiClient espClient;
PubSubClient client(espClient);

// Prototipe fungsi web server (biasanya ada di file app_httpd.cpp)
void startCameraServer();

// --- 1. FUNGSI CALLBACK MQTT ---
void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) msg += (char)payload[i];
  
  Serial.print("Pesan MQTT masuk [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(msg);

  // Contoh logika: jika menerima pesan "REBOOT" dari dashboard
  if (msg == "REBOOT") {
    ESP.restart();
  }
}

// --- 2. FUNGSI RECONNECT ---
void reconnect() {
  while (!client.connected()) {
    Serial.print("Menghubungkan MQTT...");
    String clientId = "ESP32CAM-Gusalit-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("Terhubung!");
      client.subscribe(topic_cmd);
      
      // Lapor IP ke dashboard (Retained agar dashboard tahu IP terakhir meski ESP offline)
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

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

  // --- 3. KONFIGURASI KAMERA ---
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
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG; 
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA; // Gunakan VGA agar streaming lebih lancar untuk YOLO
    config.jpeg_quality = 10;
    config.fb_count = 2;
    config.grab_mode = CAMERA_GRAB_LATEST;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.fb_location = CAMERA_FB_IN_DRAM;
  }

  // Init Camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  // Setting tambahan agar gambar lebih jelas untuk deteksi wajah
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
  }

  // --- 4. WIFI MANAGER ---
  WiFiManager wm;
  wm.setClass("invert"); 
  if(!wm.autoConnect("ESP32-CAM-Gusalit", "12345678")) {
    Serial.println("Gagal konek WiFi, Restart...");
    delay(3000);
    ESP.restart();
  }

  // --- 5. START SERVER & MQTT ---
  startCameraServer(); 

  Serial.print("Streaming Ready! URL: http://");
  Serial.print(WiFi.localIP());
  Serial.println(":81/stream"); // Port streaming default ESP32-CAM

  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  // PENTING: Jaga koneksi MQTT tetap hidup
  if (!client.connected()) {
    reconnect();
  }
  client.loop(); // Memproses data MQTT yang masuk
  
  // Jangan gunakan delay(10000) karena akan mematikan respon MQTT
  delay(10); 
}