// --- 1. KONFIGURASI & STATE ---
const TIMEOUT_SESSION = 10 * 60 * 1000; // 10 Menit
let sessionTimeoutId;

// --- 2. SESSION MANAGEMENT (AUTO LOGOUT) ---
function startSessionTimer() {
    sessionTimeoutId = setTimeout(() => {
        alert("Sesi anda berakhir karena tidak ada aktivitas selama 10 menit.");
        window.location.href = "logout.php";
    }, TIMEOUT_SESSION);
}

function resetSessionTimer() {
    clearTimeout(sessionTimeoutId);
    startSessionTimer();
}


// --- 3. MODAL SYSTEM (PREVIEW FOTO) ---
function openModal(src) {
    const modal = document.getElementById('photoModal');
    const img = document.getElementById('imgPreview');
    
    if (modal && img) {
        img.src = src;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Efek transisi scale-up
        setTimeout(() => {
            const content = modal.querySelector('div');
            if (content) {
                content.classList.remove('scale-95');
                content.classList.add('scale-100');
            }
        }, 10);
        
        document.body.style.overflow = 'hidden'; // Kunci scroll background
    }
}

function closeModal() {
    const modal = document.getElementById('photoModal');
    if (modal) {
        const content = modal.querySelector('div');
        if (content) content.classList.add('scale-95');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = 'auto'; // Lepas scroll background
        }, 200);
    }
}

// --- 5. KONTROL GARASI & LOGGING ---
async function controlGarage(action) {
    console.log(`Action Initiated: ${action}`);
    
    // Konfigurasi data untuk simpan_log.php
    const aktivitas = action === 'OPEN' ? 'Membuka Pintu' : 'Menutup Pintu';
    const formData = new FormData();
    formData.append('tombol', aktivitas);

    try {
        // 1. Simpan ke Database
        await fetch('simpan_log.php', { method: 'POST', body: formData });
        
        // 2. Update UI secara instan (Optimistic UI)
        updateLocalLog(action);
        
        // 3. Kirim perintah via MQTT (Jika fungsi tersedia di websocket.js)
        if (typeof sendMqttCommand === "function") {
            sendMqttCommand(action);
        }
    } catch (error) {
        console.error("Gagal memproses aksi:", error);
    }
}

function updateLocalLog(action) {
    const logList = document.getElementById('historyList');
    if (!logList) return;

    const time = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });

    const newEntryHtml = `
        <li class="px-8 py-5 bg-indigo-500/5 border-l-4 border-indigo-500 transition-all animate-pulse flex justify-between items-center">
            <div class="space-y-1">
                <div class="flex items-center gap-3">
                    <span class="text-[10px] font-mono font-bold text-indigo-400">${time}</span>
                    <span class="text-sm font-bold text-white tracking-tight">Admin</span>
                </div>
                <p class="text-[11px] text-indigo-300 font-black uppercase tracking-wider">MEMINTA ${action}</p>
            </div>
            <span class="text-[9px] text-slate-500 italic uppercase font-bold tracking-tighter">Baru Saja</span>
        </li>
    `;
    
    logList.insertAdjacentHTML('afterbegin', newEntryHtml);
}

// --- 6. UTILITIES ---
function escapeHtml(unsafe) {
    return (unsafe || "").toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- 7. INITIALIZATION ---
function init() {
    // Setup event listener untuk auto-logout
    const userActivityEvents = ["mousemove", "mousedown", "keypress", "touchmove"];
    userActivityEvents.forEach(event => {
        document.addEventListener(event, resetSessionTimer, false);
    });

    // Event untuk menutup modal dengan tombol ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });

    // Mulai timer session pertama kali
    startSessionTimer();
    
    console.log("System Initialized...");
}

// Jalankan saat DOM siap
document.addEventListener("DOMContentLoaded", init);