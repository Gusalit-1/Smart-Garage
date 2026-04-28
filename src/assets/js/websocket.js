var mqtt;
var reconnectTimeout = 2000;
var lastUID = "-";


const rfidNames = {
    "77 97 35 02": "Wayan Giri",
    "04 87 60 4A 9B 19 90": "Gusalit",
    "05 81 25 1D": "Gung Rama"
};

function getNamaByUID(uid) { return rfidNames[uid] || "Stranger"; }


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
    $("#mqttStatus").html("● CONNECTED").addClass("text-emerald-500").removeClass("text-slate-500");
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
        el.textContent = "LOCKED";
        el.className = "px-3 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20";
    } else {
        el.textContent = "UNLOCK";
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


function addHistory(uid, access) {
    const container = document.getElementById("historyList");
    if (!container) return;

    const nama = getNamaByUID(uid);
    const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const isGranted = access.includes("GRANTED");
    
    const row = document.createElement("li");
    row.className = "px-8 py-5 flex justify-between items-center border-b border-white/5 animate-pulse";
    
    row.innerHTML = `
        <div class="space-y-1">
            <div class="flex items-center gap-3">
                <span class="text-[10px] font-mono font-bold text-slate-600 bg-black/20 px-2 py-0.5 rounded">${waktu}</span>
                <span class="text-sm font-bold text-white tracking-tight">${nama}</span>
            </div>
            <p class="text-[11px] ${isGranted ? 'text-emerald-400' : 'text-rose-400'} font-black uppercase tracking-wider">
                ${access}
            </p>
        </div>
        <div class="text-slate-600 text-[10px] font-bold italic">Real-time</div>
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
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'MQTT Offline', background: '#0f172a', color: '#fff' });
        } else {
            alert('MQTT Offline: Tidak dapat mengirim perintah.');
        }
    }
}

$(document).ready(function() {
    MQTTconnect();
});