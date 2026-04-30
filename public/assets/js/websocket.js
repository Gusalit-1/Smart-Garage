var mqtt;
var reconnectTimeout = 2000;
var lastUID = "-";
var isLocked = false; 
var isProcessing = false; // Mencegah spam klik

const rfidNames = {
    "77 97 35 02": "Wayan Giri",
    "04 87 60 4A 9B 19 90": "Gusalit",
    "05 81 25 1D": "Gung Rama"
};

function getNamaByUID(uid) { return rfidNames[uid] || "Stranger"; }

// --- KONEKSI MQTT ---
function MQTTconnect() {
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
    mqtt.subscribe(topic_sub);
    $("#mqttStatus").html(" CONNECTED").addClass("text-emerald-500").removeClass("text-slate-500");
}

function onConnectionLost(response) {
    $("#mqttStatus").html("OFFLINE").addClass("text-slate-500").removeClass("text-emerald-500");
    setTimeout(MQTTconnect, reconnectTimeout);
}

// --- LOGIKA PESAN MASUK (REAL-TIME) ---
function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString.trim();

    // Logika Status Lock (Paling Penting agar tidak berubah-ubah)
    if (topic === "gusalit/gate/lock") {
        isLocked = (payload === "LOCKED");
        updateLockStatus(payload);
    }
    
    if (topic === "gusalit/gate/status") {
        updateGateStatus(payload);
    }
    
    if (topic === "gusalit/gate/rfid") {
        lastUID = payload;
    }
    
    if (topic === "gusalit/gate/access") {
        addHistory(lastUID, payload);
    }
}

// --- UPDATE UI COMPONENTS ---
function updateGateStatus(status) {
    const el = document.getElementById("gateStatus");
    if (!el) return;
    if (status === "OPEN") {
        el.textContent = "TERBUKA";
        el.className = "px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20";
    } else {
        el.textContent = "TERTUTUP";
        el.className = "px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-black border border-rose-500/20";
    }
}

function updateLockStatus(status) {
    const el = document.getElementById("lockStatus");
    if (!el) return;
    if (status === "LOCKED") {
        el.textContent = "LOCKED";
        el.className = "px-3 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20";
    } else {
        el.textContent = "UNLOCK";
        el.className = "px-3 py-1 rounded-lg bg-slate-700 text-slate-400 text-[10px] font-black";
    }
}

// --- FUNGSI KONTROL (DENGAN PROTEKSI LOCK) ---
function controlGarage(command) {
    if (!mqtt || !mqtt.isConnected()) {
        Swal.fire({ icon: 'error', title: 'Offline', text: 'MQTT tidak terhubung!' });
        return;
    }

    // PROTEKSI: Jika LOCKED, dilarang kirim OPEN/CLOSE
    if (isLocked && (command === "OPEN" || command === "CLOSE")) {
        Swal.fire({
            icon: 'warning',
            title: 'Sistem Terkunci',
            text: 'Buka pengunci (UNLOCK) terlebih dahulu!',
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
    
    // Beri jeda agar status stabil sebelum bisa klik lagi
    setTimeout(() => { isProcessing = false; }, 1000);
}

// --- LOGIKA HISTORY ---
function addHistory(uid, access) {
    const container = document.getElementById("historyList");
    if (!container) return;

    const nama = getNamaByUID(uid);
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isGranted = access.toUpperCase().includes("GRANTED");
    
    const row = document.createElement("li");
    row.className = "px-8 py-5 flex justify-between items-center border-b border-white/5 animate-pulse";
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
    setTimeout(() => row.classList.remove('animate-pulse'), 1000);
    if (container.children.length > 10) container.removeChild(container.lastChild);
}

// Sinkronisasi database berkala (hanya jika MQTT diskonek sebagai backup)
function syncDatabase() {
    if (mqtt && mqtt.isConnected()) return; 

    fetch('/status/gate-status')
        .then(res => res.json())
        .then(data => {
            updateLockStatus(data.lock_status);
            updateGateStatus(data.gate_status);
            isLocked = (data.lock_status === "LOCKED");
        });
}

$(document).ready(function() {
    MQTTconnect();
    setInterval(syncDatabase, 5000); 
});