function refreshCam() {
    const cam = document.getElementById('camera-stream');
    if (cam) {
        const currentSrc = cam.src.split('?')[0];
        cam.src = currentSrc + '?t=' + new Date().getTime();
        console.log('Camera stream refreshed');
    }
}

let sessionTimeout;
function resetSessionTimer() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas.");
        fetch('/auth/logout').then(() => {
            window.location.href = 'index.html';
        });
    }, 15 * 60 * 1000); // 15 Menit
}
function checkGateStatus() {
    fetch('/status/gate-status')
        .then(response => {
            if (!response.ok) throw new Error("Server not responding");
            return response.json();
        })
        .then(data => {
            const gateStatusLabel = document.getElementById('gateStatus');
            const lockStatusLabel = document.getElementById('lockStatus');

            if (gateStatusLabel && data.gate_status) {
                gateStatusLabel.innerText = data.gate_status;
                if (data.gate_status === 'TERBUKA') {
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
            if (window.lastError !== err.message) {
                console.error("Gagal sync status:", err.message);
                window.lastError = err.message;
            }
        });
}

function updateHistoryUI() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    fetch('/api/logs', { credentials: 'include' }) // Pastikan cookie sesi ikut terkirim
        .then(response => {
            if (response.status === 401) {
                // Sesi habis, arahkan ke login
                window.location.href = '/index.html';
                return;
            }
            return response.json();
        })
        .then(result => {
            if (!result) return;

            // Cek apakah server mengirim instruksi redirect
            if (result.redirect) {
                window.location.href = result.redirect;
                return;
            }

            const logs = Array.isArray(result) ? result : result.data;

            if (!logs || !Array.isArray(logs)) {
                console.error("Format log tidak valid:", result);
                return;
            }

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
                            <p class="text-[11px] ${statusClass} font-black uppercase tracking-wider">${log.aktivitas}</p>
                        </div>
                    </li>
                `;
            }).join('');
        })
        .catch(err => console.error("Gagal update history:", err));
}

function init() {
    if (document.getElementById('gateStatus')) {
        resetSessionTimer();
        const activities = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
        activities.forEach(event => {
            document.addEventListener(event, resetSessionTimer, { passive: true });
        });

        setInterval(refreshCam, 60000);
        
        
        checkGateStatus();
        updateHistoryUI();
        console.log("Dashboard Monitoring Active.");
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log("Login Form Ready.");
    }
}

/**
 * HANDLER LOGIN
 */
async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const msg = document.getElementById('loginMessage');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    if (!btn || !msg) return;

    btn.textContent = 'Memproses...';
    btn.disabled = true;
    msg.classList.add('hidden');
    
    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: usernameInput.value, 
                password: passwordInput.value 
            }),
            credentials: 'include'
        });
        const data = await res.json();
        
        if (data.success) {
            window.location.href = data.redirect;
        } else {
            msg.innerHTML = '<p class="text-red-500 text-sm">Username atau password salah!</p>';
            msg.classList.remove('hidden');
        }
    } catch (err) {
        msg.innerHTML = '<p class="text-red-500 text-sm">Error koneksi server!</p>';
        msg.classList.remove('hidden');
    } finally {
        btn.textContent = 'Masuk Sekarang';
        btn.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", init);