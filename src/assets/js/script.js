function refreshStream() {
        const img = document.getElementById("camera-stream");
        const currentSrc = img.src.split("?")[0];
        img.src = currentSrc + "?t=" + new Date().getTime();
      }

      function sendMQTT(command) {
        console.log("Sending Command: " + command);
        // Logika Paho MQTT kamu di sini
        const log = document.getElementById("activity-log");
        const time = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        log.innerHTML =
          `
                <div class="flex items-center gap-3 text-indigo-300 border-b border-white/5 pb-2">
                    <span class="text-xs font-mono">${time}</span>
                    <span>Gate: ${command}</span>
                </div>
            ` + log.innerHTML;
      }

      function captureImage() {
        alert("Image saved to local storage!");
      }
function refreshCam() {
        const img = document.getElementById("camera-stream");
        const src = img.src.split("?")[0];
        img.src = src + "?t=" + new Date().getTime();
      }
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