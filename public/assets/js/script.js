/**
 * REFRESH KAMERA
 * Menambahkan timestamp agar browser tidak melakukan caching pada stream
 */
function refreshCam() {
    const cam = document.getElementById('camera-stream');
    if (cam) {
        const currentSrc = cam.src.split('?')[0];
        cam.src = currentSrc + '?t=' + new Date().getTime();
        console.log('Camera stream refreshed');
    }
}

let sessionTimeout;

/**
 * SESSION TIMER
 * Menendang user ke halaman login jika tidak ada aktivitas
 */
function resetSessionTimer() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas.");
        // Logout via API Node.js
        fetch('/auth/logout').then(() => {
            window.location.href = 'index.html';
        });
    }, 15 * 60 * 1000); // 15 Menit
}

/**
 * MONITOR STATUS GATE & LOCK (SYNC DENGAN NODE.JS & DATABASE)
 * Menggantikan get_status.php
 */
function checkGateStatus() {
    fetch('/status/gate-status') // Route API di server.js
        .then(response => {
            if (!response.ok) throw new Error("Server not responding");
            return response.json();
        })
        .then(data => {
            const gateStatusLabel = document.getElementById('gateStatus');
            const lockStatusLabel = document.getElementById('lockStatus');

            if (gateStatusLabel && data.gate_status) {
                gateStatusLabel.innerText = data.gate_status;
                
                // Update Styling berdasarkan status
                if (data.gate_status === 'OPEN') {
                    gateStatusLabel.className = 'px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-black animate-pulse';
                } else {
                    gateStatusLabel.className = 'px-3 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/50 font-black';
                }
            }
            
            if (lockStatusLabel && data.lock_status) {
                lockStatusLabel.innerText = data.lock_status;
                if (data.lock_status === 'LOCKED') {
                    lockStatusLabel.className = 'px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/50 font-black';
                } else {
                    lockStatusLabel.className = 'px-3 py-1 rounded-lg bg-slate-700 text-slate-400 font-black';
                }
            }
        })
        .catch(err => {
            // Kita log sekali saja, tidak perlu spam console setiap detik
            if (window.lastError !== err.message) {
                console.error("Gagal sync status:", err.message);
                window.lastError = err.message;
            }
        });
}

/**
 * UPDATE HISTORY LIST (REAL-TIME TANPA REFRESH)
 * Mengambil data log terbaru dari API Node.js
 */
function updateHistoryUI() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    fetch('/api/logs') // Route API di server.js
        .then(response => response.json())
        .then(logs => {
            // Kosongkan list dan isi dengan data baru
            historyList.innerHTML = logs.map(log => {
                const isGranted = log.aktivitas.toUpperCase().includes('GRANTED');
                const statusClass = isGranted ? 'text-emerald-400' : 'text-sky-400';
                const time = new Date(log.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                return `
                    <li class="px-8 py-5 hover:bg-white/[0.02] transition-all flex justify-between items-center group">
                        <div class="space-y-1">
                            <div class="flex items-center gap-3">
                                <span class="text-[10px] font-mono font-bold text-slate-600 bg-black/20 px-2 py-0.5 rounded">${time}</span>
                                <span class="text-sm font-bold text-white tracking-tight">${log.username}</span>
                            </div>
                            <p class="text-[11px] ${statusClass} font-black uppercase tracking-wider">
                                ${log.aktivitas}
                            </p>
                        </div>
                    </li>
                `;
            }).join('');
        })
        .catch(err => console.error("Gagal update history:", err));
}

/**
 * INITIALIZATION
 */
function init() {
    resetSessionTimer();
    
    // Deteksi aktivitas user untuk reset timer
    const activities = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    activities.forEach(event => {
        document.addEventListener(event, resetSessionTimer, { passive: true });
    });

    // Jalankan interval
    setInterval(refreshCam, 60000); // 1 menit
    setInterval(checkGateStatus, 1000); // 1 detik (Real-time sync)
    setInterval(updateHistoryUI, 5000); // 5 detik untuk history
    
    // Panggil sekali saat start
    checkGateStatus();
    updateHistoryUI();

    console.log("Smart Garage Monitoring UI Initialized for Node.js...");
}

document.addEventListener("DOMContentLoaded", init);