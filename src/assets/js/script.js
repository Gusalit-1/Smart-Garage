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

// --- MODAL SYSTEM (Hanya Satu Versi) ---
function openModal(src) {
    const modal = document.getElementById('photoModal');
    const img = document.getElementById('imgPreview');
    
    if (modal && img) {
        img.src = src;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Animasi halus
        setTimeout(() => {
            const content = modal.querySelector('div');
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        document.body.style.overflow = 'hidden'; 
    }
}

function closeModal() {
    const modal = document.getElementById('photoModal');
    if (modal) {
        const content = modal.querySelector('div');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = 'auto'; 
        }, 200);
    }
}

// 3. Fungsi Update Log untuk RFID (Panggil ini saat MQTT gusalit/gate/access masuk)
function updateRFIDLog(nama, status, foto) {
    const logList = document.getElementById('historyList');
    if (!logList) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isGranted = status.includes('GRANTED');
    const statusClass = isGranted ? 'text-emerald-400' : 'text-rose-400';
    
    // Path folder foto
    const fotoPath = `src/assets/img/captures/${foto}`;

    const newEntryHtml = `
        <li class="px-8 py-5 hover:bg-white/[0.02] transition-all flex justify-between items-center group animate-fade-in">
            <div class="space-y-1">
                <div class="flex items-center gap-3">
                    <span class="text-[10px] font-mono font-bold text-slate-600 bg-black/20 px-2 py-0.5 rounded">${time}</span>
                    <span class="text-sm font-bold text-white tracking-tight">${nama}</span>
                </div>
                <p class="text-[11px] ${statusClass} font-black uppercase tracking-wider">${status}</p>
            </div>
            
            <button onclick="openModal('${fotoPath}')" class="bg-white/5 hover:bg-indigo-600 p-3 rounded-xl transition-all text-slate-400 hover:text-white border border-white/5 shadow-xl">
                <i class="fa-solid fa-camera-retro text-sm"></i>
            </button>
        </li>
    `;
    
    logList.insertAdjacentHTML('afterbegin', newEntryHtml);
}

// Fungsi Pop-up menggunakan SweetAlert2
function showPhoto(fileName) {
    Swal.fire({
        title: 'Hasil Capture Kamera',
        imageUrl: `uploads/${fileName}`, // Lokasi folder foto kamu
        imageWidth: 400,
        imageAlt: 'RFID Capture',
        background: '#1e293b',
        color: '#f1f5f9',
        confirmButtonColor: '#6366f1',
        confirmButtonText: 'TUTUP'
    });
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