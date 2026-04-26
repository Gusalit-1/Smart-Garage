var mqtt;
var reconnectTimeout = 2000;
var lastUID = "-";

// 1. Data User (Source: User Summary)
const rfidNames = {
    "77 97 35 02": "Wayan Giri",
    "04 0E 45 EA": "Gusalit",
    "05 81 25 1D": "Gung Rama"
};

function getNamaByUID(uid) { return rfidNames[uid] || "Stranger"; }

// 2. Koneksi MQTT
function MQTTconnect() {
    var cid = "web_" + Math.random().toString(16).substr(2, 8);
    mqtt = new Paho.MQTT.Client(host, Number(port), path, cid);
    
    var options = {
        timeout: 3,
        useSSL: !!useTLS,
        onSuccess: onConnect,
        onFailure: () => setTimeout(MQTTconnect, reconnectTimeout)
    };
    
    mqtt.onMessageArrived = onMessageArrived;
    mqtt.onConnectionLost = () => setTimeout(MQTTconnect, reconnectTimeout);
    mqtt.connect(options);
}

function onConnect() {
    mqtt.subscribe("gusalit/gate/#");
    $("#mqttStatus").html("● CONNECTED").addClass("text-emerald-500");
}

// 3. Update Status UI
function updateGateStatus(status) {
    const el = document.getElementById("gateStatus");
    if (!el) return;
    
    if (status === "OPEN") {
        el.textContent = "TERBUKA";
        el.className = "px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20";
    } else {
        el.textContent = "TERTUTUP";
        el.className = "px-3 py-1 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black border border-rose-500/20";
    }
}

function updateLockStatus(status) {
    const el = document.getElementById("lockStatus");
    if (!el) return;
    
    if (status === "LOCKED") {
        el.textContent = "ON";
        el.className = "px-3 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20";
    } else {
        el.textContent = "OFF";
        el.className = "px-3 py-1 rounded-lg bg-slate-700 text-slate-400 text-[10px] font-black";
    }
}

// 4. Logika Pesan Masuk
function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString.trim();

    if (topic === "gusalit/gate/rfid") {
        lastUID = payload;
    }
    
    if (topic === "gusalit/gate/access") {
        addHistory(lastUID, payload);
    }
    
    if (topic === "gusalit/gate/status") {
        updateGateStatus(payload);
    }
    
    if (topic === "gusalit/gate/lock") {
        updateLockStatus(payload);
    }
}

// 5. Update History Real-time (Otomatis munculkan tombol kamera)
function addHistory(uid, access) {
    const container = document.getElementById("historyList");
    if (!container) return;

    const nama = getNamaByUID(uid);
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isGranted = access.includes("GRANTED");
    
    // Path foto tetap agar otomatis terdeteksi setelah upload_foto.php selesai
    const fotoURL = `src/assets/img/captures/capture_live.jpg?t=${new Date().getTime()}`;

    const row = document.createElement("li");
    row.className = "px-8 py-5 flex justify-between items-center border-b border-white/5 animate-pulse";
    
    row.innerHTML = `
        <div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-mono text-slate-500">${waktu}</span>
                <span class="text-sm font-bold text-white">${nama}</span>
            </div>
            <p class="text-[10px] ${isGranted ? 'text-emerald-400' : 'text-rose-400'} font-black">${access}</p>
        </div>
        <button onclick="openModal('${fotoURL}')" class="bg-white/5 p-3 rounded-xl hover:bg-indigo-600 transition-all">
            <i class="fa-solid fa-camera-retro text-sm"></i>
        </button>
    `;
    container.prepend(row);
    setTimeout(() => row.classList.remove('animate-pulse'), 1000);
}

// 6. Fungsi Kontrol Gerbang
function controlGarage(command) {
    if (mqtt && mqtt.isConnected()) {
        var message = new Paho.MQTT.Message(command);
        message.destinationName = "gusalit/gate/command"; 
        mqtt.send(message);
        console.log("Sent: " + command);
    } else {
        // Fallback jika SweetAlert2 belum load
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'MQTT Offline', background: '#1e293b', color: '#fff' });
        } else {
            alert('MQTT Offline: Tidak dapat mengirim perintah.');
        }
    }
}

// 7. Event Listeners untuk tombol (jika tidak pakai onclick inline)
$(document).ready(function() {
    MQTTconnect();
    
    // Fallback event listeners untuk tombol di src/index.html (yang tidak pakai onclick inline)
    $('#open').on('click', function() { controlGarage('OPEN'); });
    $('#close').on('click', function() { controlGarage('CLOSE'); });
    $('#lockBtn').on('click', function() { controlGarage('LOCK'); });
    $('#unlockBtn').on('click', function() { controlGarage('UNLOCK'); });
});

