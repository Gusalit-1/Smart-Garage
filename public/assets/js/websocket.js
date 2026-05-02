var mqtt;
var reconnectTimeout = 2000;
var lastUID = "-";
var isLocked = false; 
var isProcessing = false; 

// 1. Konfigurasi Nama Berdasarkan UID RFID
const rfidNames = {
    "77 97 35 02": "Wayan Giri",
    "04 87 60 4A 9B 19 90": "Gusalit",
    "05 81 25 1D": "Gung Rama"
};

function getNamaByUID(uid) { return rfidNames[uid] || "Stranger"; }

// 2. Koneksi MQTT
function MQTTconnect() {
    if (typeof host === 'undefined') {
        console.error("Config host belum dimuat. Pastikan config.js sudah benar.");
        return;
    }

    console.log("Connecting to " + host + ":" + port);
    mqtt = new Paho.MQTT.Client(host, Number(port), path, clientIdPrefix);
    
    var options = {
        timeout: 3,
        useSSL: useTLS,
        cleanSession: cleansession,
        onSuccess: onConnect,
        onFailure: function(message) {
            console.log("Connection Failed: " + message.errorMessage);
            setTimeout(MQTTconnect, reconnectTimeout);
        }
    };
    
    mqtt.onMessageArrived = onMessageArrived;
    mqtt.onConnectionLost = onConnectionLost;
    mqtt.connect(options);
}

function onConnect() {
    console.log("Connected to MQTT Broker");
    mqtt.subscribe(topic_sub); // Subscribe ke 'gusalit/gate/#'
    $("#mqttStatus").html(" CONNECTED")
        .addClass("text-emerald-500")
        .removeClass("text-slate-500");
}

function onConnectionLost(response) {
    console.log("MQTT Lost: " + response.errorMessage);
    $("#mqttStatus").html("OFFLINE")
        .addClass("text-slate-500")
        .removeClass("text-emerald-500");
    setTimeout(MQTTconnect, reconnectTimeout);
}

// 3. Logika Pesan Masuk (Real-Time)
function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString.trim();

    console.log(`[MQTT] Topic: ${topic} | Payload: ${payload}`);

    // Route pesan berdasarkan topik
    if (topic === "gusalit/gate/lock") {
        isLocked = (payload === "LOCKED");
        updateLockStatus(payload);
    } 
    else if (topic === "gusalit/gate/status") {
        updateGateStatus(payload);
    } 
    else if (topic === "gusalit/gate/rfid") {
        lastUID = payload;
    } 
    else if (topic === "gusalit/gate/access") {
        addHistory(lastUID, payload);
    }
    else if (topic === "gusalit/gate/main_ip") {
        const mainIpEl = document.getElementById("main-ip-display");
        if (mainIpEl) mainIpEl.innerText = payload;
    }
    else if (topic === "gusalit/gate/cam_ip") {
        updateCameraStream(payload);
    }
    else if (topic === "gusalit/gate/ai_detection") {
        updateAIDetection(payload);
    }
}

// 4. Helper Update UI
function updateCameraStream(ip) {
    const streamEl = document.getElementById("camera-stream");
    const camIpDisplay = document.getElementById("cam-ip-display");
    
    // Mengarahkan ke AI Service (Python Flask)
    const aiStreamUrl = "http://localhost:5000/video_feed";

    if (streamEl && streamEl.src !== aiStreamUrl) {
        streamEl.src = aiStreamUrl;
        console.log("Stream dialihkan ke AI Service (YOLO)");
    }
    if (camIpDisplay) camIpDisplay.innerText = ip;
}

function updateAIDetection(objectName) {
    const statusEl = document.getElementById("ai-object-name");
    if (!statusEl) return;

    statusEl.innerText = objectName.toUpperCase();
    statusEl.className = "text-emerald-400 font-black text-xl tracking-tight animate-pulse";
    
    clearTimeout(window.aiResetTimer);
    window.aiResetTimer = setTimeout(() => {
        statusEl.innerText = "Monitoring...";
        statusEl.className = "text-emerald-400 font-black text-xl tracking-tight";
    }, 4000);
}

function updateGateStatus(status) {
    const el = document.getElementById("gateStatus");
    if (!el) return;

    const normalized = status.toUpperCase();
    const targetText = normalized === "OPEN" ? "TERBUKA" : "TERTUTUP";

    if (el.textContent === targetText) return;

    el.textContent = targetText;
    el.className = (normalized === "OPEN")
        ? "px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20"
        : "px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-black border border-rose-500/20";
}

function updateLockStatus(status) {
    const el = document.getElementById("lockStatus");
    if (!el || el.textContent === status) return;

    el.textContent = status;
    el.className = (status === "LOCKED")
        ? "px-3 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20"
        : "px-3 py-1 rounded-lg bg-slate-700 text-slate-400 text-[10px] font-black";
}

// 5. Kontrol Gerbang
function controlGarage(command) {
    if (!mqtt || !mqtt.isConnected()) {
        Swal.fire({ icon: 'error', title: 'Offline', text: 'MQTT tidak terhubung!' });
        return;
    }

    if (isLocked && (command === "OPEN" || command === "CLOSE")) {
        Swal.fire({
            icon: 'warning',
            title: 'Sistem Terkunci',
            text: 'Buka LOCK terlebih dahulu!',
            background: '#0f172a',
            color: '#fff',
            confirmButtonColor: '#f59e0b'
        });
        return;
    }

    if (isProcessing) return;
    isProcessing = true;

    var message = new Paho.MQTT.Message(command);
    message.destinationName = topic_cmd;
    mqtt.send(message);
    
    setTimeout(() => { isProcessing = false; }, 1000);
}

// 6. Riwayat & Database
function addHistory(uid, access) {
    const container = document.getElementById("historyList");
    if (!container) return;

    const nama = getNamaByUID(uid);
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isGranted = access.toUpperCase().includes("GRANTED");
    
    const row = document.createElement("li");
    row.className = "px-8 py-5 flex justify-between items-center border-b border-white/5 animate-fade-in hover:bg-white/[0.02]";
    row.innerHTML = `
        <div class="space-y-1">
            <div class="flex items-center gap-3">
                <span class="text-[10px] font-mono font-bold text-slate-600 bg-black/20 px-2 py-0.5 rounded">${waktu}</span>
                <span class="text-sm font-bold text-white tracking-tight">${nama}</span>
            </div>
            <p class="text-[11px] ${isGranted ? 'text-emerald-400' : 'text-rose-400'} font-black uppercase tracking-wider">${access}</p>
        </div>
        <div class="text-slate-600 text-[10px] font-bold italic">Real-time</div>
    `;
    
    container.prepend(row);
    if (container.children.length > 10) container.removeChild(container.lastChild);
}

async function syncDatabase() {
    try {
        const res = await fetch('/status/gate-status', { credentials: 'include' });
        if (res.status === 401) {
            window.location.href = '/index.html';
            return;
        }
        const data = await res.json();
        
        updateLockStatus(data.lock_status);
        updateGateStatus(data.gate_status);
        isLocked = (data.lock_status === "LOCKED");
    } catch (err) {
        console.warn("Sync database failed (relying on MQTT).");
    }
}

// 7. Inisialisasi
$(document).ready(function() {
    MQTTconnect();
    syncDatabase();
    setInterval(syncDatabase, 60000);
});

window.handleLogout = async function() {
    try {
        await fetch('/auth/logout', { credentials: 'include' });
        window.location.href = '/index.html';
    } catch (e) {
        window.location.href = '/index.html';
    }
};