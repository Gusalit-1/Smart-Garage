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
  updateMQTTStatus("CONNECTED");
  mqtt.subscribe(topic_sub);
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

function onMessageArrived(message) {
    var topic = message.destinationName;
    var payload = message.payloadString.trim();

    if (topic === "gusalit/gate/status") {
        var isBuka = (payload === "OPEN");
        $("#gateStatus").text(isBuka ? "TERBUKA" : "TERTUTUP")
                        .removeClass("bg-danger bg-success")
                        .addClass(isBuka ? "bg-success" : "bg-danger");
    }

    if (topic === "gusalit/gate/lock") {
        var isLocked = (payload === "LOCKED");
        $("#lockStatus").text(payload)
                        .removeClass("bg-secondary bg-warning")
                        .addClass(isLocked ? "bg-warning text-dark" : "bg-info text-dark");
        setLockUI(isLocked);
    }

    if (topic === "gusalit/gate/rfid") {
        lastUID = payload;
    }

    if (topic === "gusalit/gate/access") {
        addHistory(lastUID, payload);
    }
}

function addHistory(uid, access) {
    const now = new Date();

    const waktu = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    let nama = "";
    if (typeof getNamaByUID === "function") {
        nama = getNamaByUID(uid);
    }
    if (!nama) {
        nama = "Unknown User";
    }

    const isGranted = access === "GRANTED";
    const statusBadge = isGranted ? "badge bg-success" : "badge bg-danger";

    const row = document.createElement("li");
    
    // bg-transparent agar background putih hilang
    // border-secondary agar garis pemisah antar list tidak terlalu kontras (putih tipis)
    row.className = "list-group-item bg-transparent border-secondary d-flex justify-content-between align-items-center px-3 py-2";

    const safeNama = typeof escapeHtml === "function" ? escapeHtml(nama) : nama;
    const safeUid = typeof escapeHtml === "function" ? escapeHtml(uid) : uid;

    row.innerHTML = `
        <div class="d-flex flex-column" style="width: 40%;">
            <span class="fw-bold text-white text-truncate" style="font-size: 14px;">${safeNama}</span>
            <span class="text-white-50 text-uppercase font-monospace" style="font-size: 10px;">${safeUid}</span>
        </div>
        
        <div class="text-center text-white" style="width: 30%; font-size: 12px;">
            ${waktu}
        </div>
        
        <div class="text-end" style="width: 30%;">
            <span class="${statusBadge} text-uppercase" style="font-size: 10px; letter-spacing: 1px;">
                ${access}
            </span>
        </div>
    `;

    const container = document.getElementById("historyList");
    if (!container) return;

    container.prepend(row);

    // Tetap simpan hingga 50 agar bisa discroll
    while (container.children.length > 50) {
        container.removeChild(container.lastChild);
    }
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