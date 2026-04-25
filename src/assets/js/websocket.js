var mqtt;
var reconnectTimeout = 2000;
var historyNo = 0;
var lastUID = "-";
var isLocked = false;

// Daftar User (Sesuai data kamu)
const rfidNames = {
  "77 97 35 02": "Wayan Giri",
  "04 0E 45 EA": "Gusalit",
  "05 81 25 1D": "Gung Rama",
};

function getNamaByUID(uid) {
  return rfidNames[uid] || "Tidak Dikenal";
}

// Update UI Status Koneksi MQTT
function updateMQTTStatus(status) {
  const dot = $("#mqttStatus");
  if (status === "CONNECTED") {
    dot.removeClass("text-danger text-warning").addClass("text-success").html("● CONNECTED");
  } else if (status === "CONNECTING") {
    dot.removeClass("text-danger text-success").addClass("text-warning").html("● CONNECTING");
  } else {
    dot.removeClass("text-success text-warning").addClass("text-danger").html("● OFFLINE");
  }
}

function setLockUI(locked) {
  isLocked = locked;
  if (locked) {
    $("#lockStatus").text("ON").css("color", "#ef4444");
    $("#open, #close").prop("disabled", true).css("opacity", "0.5");
  } else {
    $("#lockStatus").text("OFF").css("color", "#10b981");
    $("#open, #close").prop("disabled", false).css("opacity", "1");
  }
}

$(document).ready(function () {
  MQTTconnect();

  // Pastikan ID tombol (#open, #close, dll) sama dengan di HTML
  $("#open").on("click", function () {
    console.log("Tombol Buka diklik"); 
    sendmesg(topic_cmd, "OPEN");
  });

  $("#close").on("click", function () {
    console.log("Tombol Tutup diklik"); // Debugging
    sendmesg(topic_cmd, "CLOSE");
  });

  $("#lockBtn").on("click", function () {
    sendmesg(topic_cmd, "LOCK");
  });

  $("#unlockBtn").on("click", function () {
    sendmesg(topic_cmd, "UNLOCK");
  });
});

function MQTTconnect() {
  updateMQTTStatus("CONNECTING");
  var cid = "web_" + Math.random().toString(16).substr(2, 8);
  mqtt = new Paho.MQTT.Client(host, Number(port), path, cid);

  mqtt.onConnectionLost = onConnectionLost;
  mqtt.onMessageArrived = onMessageArrived;

  var options = {
    timeout: 3,
    useSSL: !!useTLS,
    cleanSession: !!cleansession,
    onSuccess: onConnect,
    onFailure: function (e) {
      updateMQTTStatus("OFFLINE");
      setTimeout(MQTTconnect, reconnectTimeout);
    }
  };

  if (username) {
    options.userName = username;
    options.password = password;
  }

  try { mqtt.connect(options); } catch (err) { updateMQTTStatus("OFFLINE"); }
}

function onConnect() {
    console.log("MQTT Berhasil Konek ke Broker!"); // Tambahkan ini
    updateMQTTStatus("CONNECTED");
    mqtt.subscribe("gusalit/gate/#");
    console.log("Sudah Subscribe ke gusalit/gate/#");
}

function onConnectionLost(res) {
  updateMQTTStatus("OFFLINE");
  setTimeout(MQTTconnect, reconnectTimeout);
}

function addHistory(uid, access) {
  var waktu = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  var nama = getNamaByUID(uid);
  var statusColor = (access === "GRANTED") ? "text-success" : "text-danger";
  
  // URL untuk mengambil satu foto diam (snapshot) dari ESP32-CAM
  // Tambahkan timestamp agar gambar tidak mengambil dari cache browser
  var snapshotUrl = "http://192.168.0.100/capture?t=" + new Date().getTime();

  $("#rfidHistory").prepend(`
    <div class="history-item d-flex align-items-center p-3 mb-2" style="background: rgba(255,255,255,0.03); border-radius: 12px;">
      <div class="me-3">
        <img src="${snapshotUrl}" 
             alt="User" 
             style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);"
             onerror="this.src='https://placehold.co/60x60?text=NA'">
      </div>
      
      <div class="flex-grow-1">
        <span class="fw-bold d-block" style="font-size: 14px;">${nama}</span>
        <small class="text-secondary" style="font-size: 11px;">${uid}</small>
      </div>
      
      <div class="text-end">
        <span class="${statusColor} fw-bold d-block" style="font-size: 12px;">${access}</span>
        <small class="text-secondary" style="font-size: 11px;">${waktu}</small>
      </div>
    </div>
  `);

  // Batasi agar tidak berat (max 5 riwayat)
  if ($("#rfidHistory .history-item").length > 5) {
    $("#rfidHistory .history-item").last().remove();
  }
}

// Tambahkan variabel global di bagian atas jika diperlukan
var currentCameraIP = "192.168.0.105"; // Default IP awal

function onMessageArrived(message) {
    var topic = message.destinationName;
    var payload = message.payloadString.trim();

    // --- FITUR AUTO DETECT IP KAMERA ---
    if (topic === "gusalit/gate/camera_ip") {
        console.log("IP Kamera Baru Diterima: " + payload);
        currentCameraIP = payload;
        
        // Update URL Stream di Dashboard
        // Port 81 adalah port standar streaming ESP32-CAM
        const newStreamUrl = "http://" + payload + ":81/stream";
        $("#camera-stream").attr("src", newStreamUrl);
        
        // Update juga untuk fitur snapshot di history jika ada
        console.log("Stream URL diupdate ke: " + newStreamUrl);
    }

    // --- STATUS GERBANG ---
    if (topic === "gusalit/gate/status") {
        var isBuka = (payload === "OPEN");
        $("#gateStatus").text(isBuka ? "TERBUKA" : "TERTUTUP")
                        .removeClass("bg-danger bg-success")
                        .addClass(isBuka ? "bg-success" : "bg-danger");
    }

    // --- STATUS LOCK ---
    if (topic === "gusalit/gate/lock") {
        var locked = (payload === "LOCKED");
        $("#lockStatus").text(payload)
                        .removeClass("bg-secondary bg-warning")
                        .addClass(locked ? "bg-warning text-dark" : "bg-info text-dark");
        setLockUI(locked);
    }

    // --- RFID DATA ---
    if (topic === "gusalit/gate/rfid") {
        lastUID = payload;
    }

    // --- AKSES RFID ---
    if (topic === "gusalit/gate/access") {
        addHistory(lastUID, payload);
    }
}

function addHistory(uid, access) {
    const container = document.getElementById("historyList");
    if (!container) return;

    let nama = getNamaByUID(uid);
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const statusClass = access === "GRANTED" ? 'text-emerald-400' : 'text-rose-400';

    const row = document.createElement("li");
    row.className = "px-8 py-5 hover:bg-white/[0.02] transition-all flex justify-between items-center group";

    row.innerHTML = `
        <div class="space-y-1">
            <div class="flex items-center gap-3">
                <span class="text-[10px] font-mono font-bold text-slate-600 bg-black/20 px-2 py-0.5 rounded">${waktu}</span>
                <span class="text-sm font-bold text-white tracking-tight">${nama}</span>
            </div>
            <p class="text-[11px] ${statusClass} font-black uppercase tracking-wider">${access}</p>
        </div>
        <button onclick="openModal('src/assets/img/captures/capture_live.jpg?t=${new Date().getTime()}')"
                class="bg-white/5 hover:bg-indigo-600 p-3 rounded-xl transition-all text-slate-400 hover:text-white border border-white/5 shadow-xl">
            <i class="fa-solid fa-camera-retro text-sm"></i>
        </button>
    `;
    container.prepend(row);
}

function sendmesg(topic, command) {
  if (mqtt && mqtt.isConnected()) {
    var message = new Paho.MQTT.Message(command);
    message.destinationName = topic;
    mqtt.send(message);
    console.log("Mengirim: " + command + " ke topic: " + topic);
  } else {
    console.log("Gagal mengirim: MQTT tidak terhubung");
    alert("MQTT belum terhubung!");
  }
}