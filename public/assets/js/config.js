// Konfigurasi MQTT Broker
var host = "broker.emqx.io";
var port = 8083; // Gunakan 8083 untuk ws, atau 8084 untuk wss
var path = "/mqtt";
var useTLS = false; // Set ke true jika menggunakan port 8084
var cleansession = true;

var username = "";
var password = "";

// Topik Proyek Smart Garage
var topic_prefix = "gusalit/gate";
var topic_sub = topic_prefix + "/#";
var topic_cmd = topic_prefix + "/command";

var clientIdPrefix = "web_gusalit_" + Math.random().toString(16).substr(2, 5);