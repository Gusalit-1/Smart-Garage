var mqtt;
var reconnectTimeout = 2000;
var lastUID = "-";
var isLocked = false; 
var isProcessing = false; 

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

    console.log(`[MQTT] Topic: ${topic} | Payload: ${payload}`);

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

else if (topic === "gusalit/gate/ai_detection") {
        const statusEl = document.getElementById("ai-object-name");
        if (statusEl) {
            statusEl.innerText = payload.toUpperCase();
            statusEl.className = "text-emerald-400 font-black text-xl tracking-tight animate-pulse";
            
            clearTimeout(window.aiResetTimer);
            window.aiResetTimer = setTimeout(() => {
                statusEl.innerText = "Monitoring...";
                statusEl.className = "text-emerald-400 font-black text-xl tracking-tight";
            }, 3000);
        }
    }
}

// --- UPDATE UI ---
function updateGateStatus(status) {
    const el = document.getElementById("gateStatus");
    if (!el || el.textContent === (status === "OPEN" ? "TERBUKA" : "TERTUTUP")) return;

    el.textContent = status === "OPEN" ? "TERBUKA" : "TERTUTUP";
    el.className = status === "OPEN" 
        ? "px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20"
        : "px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] font-black border border-rose-500/20";
}

function updateLockStatus(status) {
    const el = document.getElementById("lockStatus");
    if (!el || el.textContent === status) return;

    el.textContent = status;
    el.className = status === "LOCKED" 
        ? "px-3 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20"
        : "px-3 py-1 rounded-lg bg-slate-700 text-slate-400 text-[10px] font-black";
}

// --- FUNGSI KONTROL ---
function controlGarage(command) {
    if (!mqtt || !mqtt.isConnected()) {
        Swal.fire({ icon: 'error', title: 'Offline', text: 'MQTT tidak terhubung!' });
        return;
    }

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
    row.className = "px-8 py-5 flex justify-between items-center border-b border-white/5 animate-fade-in";
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

// --- SYNC DATABASE (BACKUP) ---
async function syncDatabase() {
    try {
        const resStatus = await fetch('/status/gate-status', { credentials: 'include' });
        if (!resStatus.ok) return;
        const dataStatus = await resStatus.json();
        
        updateLockStatus(dataStatus.lock_status);
        updateGateStatus(dataStatus.gate_status);
        isLocked = (dataStatus.lock_status === "LOCKED");
    } catch (err) {
        console.error("Sync error:", err);
    }
}

// --- LOGOUT ---
async function handleLogout() {
    try {
        await fetch('/auth/logout', { credentials: 'include' });
        window.location.href = '/index.html';
    } catch (e) {
        window.location.href = '/index.html';
    }
}

// --- INISIALISASI ---
$(document).ready(function() {
    MQTTconnect();
    syncDatabase(); // Jalankan sekali saat startup
    setInterval(syncDatabase, 30000); // Sinkronisasi cadangan setiap 30 detik
});

window.handleLogout = handleLogout;