function refreshCam() {
    const cam = document.getElementById('camera-stream');
    if (cam) {
        // Mengambil URL dasar tanpa parameter query
        const currentSrc = cam.src.split('?')[0];
        // Memaksa refresh dengan parameter unik (time)
        cam.src = currentSrc + '?t=' + new Date().getTime();
        console.log('Camera stream refreshed');
    }
}


let sessionTimeout;

function resetSessionTimer() {
    console.log("Aktivitas terdeteksi, mereset timer sesi...");
    clearTimeout(sessionTimeout);
    
    sessionTimeout = setTimeout(() => {
        alert("Sesi Anda telah berakhir karena tidak ada aktivitas.");
        window.location.href = 'logout.php';
    }, 15 * 60 * 1000); 
}

function init() {

    resetSessionTimer();
    
    const activities = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    activities.forEach(event => {
        document.addEventListener(event, resetSessionTimer, { passive: true });
    });
    setInterval(refreshCam, 60000);
    
    console.log("Smart Garage Monitoring UI Initialized...");
}

document.addEventListener("DOMContentLoaded", init);