// --- MODAL SYSTEM (GLOBAL SCOPE) ---
function openModal(src) {
    const modal = document.getElementById('photoModal');
    const img = document.getElementById('imgPreview');
    
    if (modal && img) {
        img.src = src;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        setTimeout(() => {
            const content = modal.querySelector('.relative');
            if (content) {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }
        }, 10);
        document.body.style.overflow = 'hidden'; 
    }
}

function closeModal() {
    const modal = document.getElementById('photoModal');
    if (modal) {
        const content = modal.querySelector('.relative');
        if (content) {
            content.classList.add('scale-95', 'opacity-0');
            content.classList.remove('scale-100', 'opacity-100');
        }
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = 'auto'; 
        }, 200);
    }
}

let sessionTimeout;

function resetSessionTimer() {
    console.log("Aktivitas terdeteksi, mereset timer sesi...");
    clearTimeout(sessionTimeout);
    
    // Set timer untuk logout otomatis jika tidak ada aktivitas selama 15 menit
    sessionTimeout = setTimeout(() => {
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas.");
        window.location.href = 'logout.php';
    }, 15 * 60 * 1000); 
}

// --- INITIALIZATION ---
function init() {
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });
    
    // Aktifkan auto-logout timer
    resetSessionTimer();
    
    // Event listeners untuk reset timer saat ada aktivitas
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(event => {
        document.addEventListener(event, resetSessionTimer, { passive: true });
    });
    
    console.log("UI Script Initialized...");
}

document.addEventListener("DOMContentLoaded", init);
