// Dashboard Logic - Auto refresh logs/status
async function handleLogout() {
  try {
    await fetch('/auth/logout', { credentials: 'include' });
    window.location.href = '/index.html';
  } catch (e) {
    window.location.href = '/index.html';
  }
}

async function refreshData() {
  try {
    // Status
    const resStatus = await fetch('/status/gate-status', { credentials: 'include' });
    if (!resStatus.ok) return;
    const dataStatus = await resStatus.json();
    
    const gateEl = document.getElementById('gateStatus');
    const lockEl = document.getElementById('lockStatus');
    
    if (gateEl) {
      gateEl.innerText = dataStatus.gate_status === 'OPEN' ? 'TERBUKA' : 'TERTUTUP';
      gateEl.className = dataStatus.gate_status === 'OPEN' 
        ? 'px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20'
        : 'px-3 py-1 rounded-lg bg-rose-500/10 text-rose-500 text-[10px] font-black border border-rose-500/20';
    }
    
    if (lockEl) {
      lockEl.innerText = dataStatus.lock_status;
      lockEl.className = dataStatus.lock_status === 'LOCKED' 
        ? 'px-3 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20'
        : 'px-3 py-1 rounded-lg bg-slate-700 text-slate-400 text-[10px] font-black';
    }
    
    // Logs
    const resLogs = await fetch('/api/logs', { credentials: 'include' });
    if (!resLogs.ok) return;
    const logs = await resLogs.json();
    
    const historyList = document.getElementById('historyList');
    if (historyList) {
      historyList.innerHTML = logs.map(log => {
        const isGranted = log.aktivitas.toUpperCase().includes('GRANTED');
        const statusClass = isGranted ? 'text-emerald-400' : 'text-rose-400';
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
    }
  } catch (err) {
    console.error('Refresh error:', err);
  }
}

// Auto refresh every 3s
setInterval(refreshData, 3000);
refreshData();

// Camera refresh
function refreshCam() {
  const cam = document.getElementById('camera-stream');
  if (cam) {
    const currentSrc = cam.src.split('?')[0];
    cam.src = currentSrc + '?t=' + Date.now();
  }
}
setInterval(refreshCam, 5000);

// Session keepalive
setInterval(async () => {
  try {
    await fetch('/health', { credentials: 'include' });
  } catch {}
}, 30000);

window.handleLogout = handleLogout;
