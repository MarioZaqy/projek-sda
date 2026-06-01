/* ───────────────────────────────
   CONFIG
─────────────────────────────── */
// Saat localhost → pakai port 8000 (server lokal)
// Saat sudah di-deploy → pakai URL yang sama (relatif)
const API_BASE = "https://web-production-d8b04.up.railway.app";
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : '';

/* ───────────────────────────────
   DATA GRAF (sama seperti backend)
   Digunakan untuk menggambar kanvas
─────────────────────────────── */
const GRAPH_NODES = {
  A: { x: 0.15, y: 0.18 },
  B: { x: 0.42, y: 0.12 },
  C: { x: 0.72, y: 0.18 },
  D: { x: 0.42, y: 0.50 },
  E: { x: 0.88, y: 0.48 },
  F: { x: 0.55, y: 0.80 },
  G: { x: 0.85, y: 0.88 },
};

const GRAPH_EDGES = [
  { from: 'A', to: 'B', dist: 1.5 },
  { from: 'A', to: 'D', dist: 1.5 },
  { from: 'A', to: 'F', dist: 3.0 },
  { from: 'B', to: 'C', dist: 1.5 },
  { from: 'B', to: 'D', dist: 1.8 },
  { from: 'D', to: 'C', dist: 1.1 },
  { from: 'D', to: 'F', dist: 0.8 },
  { from: 'C', to: 'F', dist: 2.5 },
  { from: 'C', to: 'E', dist: 0.2 },
  { from: 'F', to: 'E', dist: 1.5 },
  { from: 'F', to: 'G', dist: 1.0 },
];

/* ───────────────────────────────
   CANVAS — INISIALISASI
─────────────────────────────── */
const canvas = document.getElementById('graph-canvas');
const ctx    = canvas.getContext('2d');

// State aktif untuk highlight jalur di kanvas
let activePath  = [];
let activeStart = '';
let activeEnd   = '';

/* ───────────────────────────────
   CANVAS — RESIZE
   Menangani layar retina (devicePixelRatio)
   agar gambar tidak blur
─────────────────────────────── */
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width  * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(devicePixelRatio, devicePixelRatio);
  drawGraph();
}

/* ───────────────────────────────
   CANVAS — POSISI NODE
   Mengonversi koordinat relatif (0-1)
   ke koordinat piksel aktual
─────────────────────────────── */
function nodePos(key) {
  const rect = canvas.getBoundingClientRect();
  const n = GRAPH_NODES[key];
  return { x: n.x * rect.width, y: n.y * rect.height };
}

/* ───────────────────────────────
   CANVAS — GAMBAR GRAF
   Dipanggil ulang setiap ada perubahan:
   - resize jendela
   - pilih shelter
   - klik kartu hasil
─────────────────────────────── */
function drawGraph() {
  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  ctx.clearRect(0, 0, W, H);

  // Buat set dari pasangan node di jalur aktif
  // agar pengecekan edge aktif lebih cepat (O(1))
  const pathSet = new Set();
  for (let i = 0; i < activePath.length - 1; i++) {
    pathSet.add(activePath[i] + '-' + activePath[i + 1]);
    pathSet.add(activePath[i + 1] + '-' + activePath[i]);
  }

  // ── Gambar Edge (Garis antar node) ──────────
  GRAPH_EDGES.forEach(edge => {
    const a = nodePos(edge.from);
    const b = nodePos(edge.to);
    const isActive =
      pathSet.has(edge.from + '-' + edge.to) ||
      pathSet.has(edge.to + '-' + edge.from);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);

    if (isActive) {
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.lineWidth   = 2.5;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = 'rgba(34,211,238,0.6)';
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth   = 1.5;
      ctx.shadowBlur  = 0;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Label jarak di tengah garis
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const txt = edge.dist.toFixed(1) + ' km';

    ctx.font = '500 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Background pill untuk label
    const tw = ctx.measureText(txt).width;
    const pw = tw + 8, ph = 14;
    ctx.fillStyle = isActive ? 'rgba(34,211,238,0.15)' : 'rgba(11,15,26,0.75)';
    ctx.beginPath();
    ctx.roundRect(mx - pw / 2, my - ph / 2, pw, ph, 4);
    ctx.fill();

    ctx.fillStyle = isActive ? '#22d3ee' : 'rgba(148,163,184,0.7)';
    ctx.fillText(txt, mx, my);
  });

  // ── Gambar Node (Lingkaran shelter) ─────────
  const R = Math.max(W, H) * 0.038;

  Object.entries(GRAPH_NODES).forEach(([key]) => {
    const { x, y } = nodePos(key);
    const isStart = key === activeStart;
    const isEnd   = key === activeEnd;
    const onPath  = activePath.includes(key) && !isStart && !isEnd;

    // Outer glow untuk node aktif
    if (isStart || isEnd || onPath) {
      ctx.beginPath();
      ctx.arc(x, y, R + 5, 0, Math.PI * 2);
      const glowColor = isStart
        ? 'rgba(108,99,255,0.35)'
        : isEnd
        ? 'rgba(244,114,182,0.35)'
        : 'rgba(34,211,238,0.25)';
      const grad = ctx.createRadialGradient(x, y, R, x, y, R + 5);
      grad.addColorStop(0, glowColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Lingkaran node
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);

    let fill   = '#1e293b';
    let stroke = '#334155';
    if (isStart) { fill = 'rgba(108,99,255,0.8)'; stroke = '#6c63ff'; }
    if (isEnd)   { fill = 'rgba(244,114,182,0.8)'; stroke = '#f472b6'; }
    if (onPath)  { fill = 'rgba(34,211,238,0.25)'; stroke = '#22d3ee'; }

    ctx.shadowBlur  = isStart || isEnd || onPath ? 14 : 4;
    ctx.shadowColor = isStart ? '#6c63ff' : isEnd ? '#f472b6' : '#22d3ee';
    ctx.fillStyle   = fill;
    ctx.fill();
    ctx.shadowBlur  = 0;

    ctx.strokeStyle = stroke;
    ctx.lineWidth   = isStart || isEnd || onPath ? 2.5 : 1.5;
    ctx.stroke();

    // Label huruf di tengah node
    ctx.font = `700 ${Math.round(R * 0.7)}px Inter, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = isStart || isEnd || onPath ? '#fff' : '#94a3b8';
    ctx.fillText(key, x, y);
  });
}

// Gambar ulang saat jendela di-resize
window.addEventListener('resize', resizeCanvas);
resizeCanvas();


/* ───────────────────────────────
   UI SYNC — CHIPS SHELTER
   Chip A-G berubah warna sesuai
   shelter yang dipilih di dropdown
─────────────────────────────── */
const selectStart = document.getElementById('select-start');
const selectEnd   = document.getElementById('select-end');

function updateChips() {
  const s = selectStart.value;
  const e = selectEnd.value;

  document.querySelectorAll('.chip').forEach(chip => {
    const sh = chip.dataset.shelter;
    chip.classList.toggle('active-start', sh === s);
    chip.classList.toggle('active-end',   sh === e);
  });

  activeStart = s;
  activeEnd   = e;
  activePath  = []; // Reset jalur saat pilihan berubah
  drawGraph();
}

selectStart.addEventListener('change', updateChips);
selectEnd.addEventListener('change', updateChips);

/* ───────────────────────────────
   FIND ROUTE — KIRIM REQUEST
   Mengirim POST ke /api/route
   dan menampilkan hasilnya
─────────────────────────────── */
const btn       = document.getElementById('btn-find');
const errorMsg  = document.getElementById('error-msg');
const container = document.getElementById('results-container');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
}

function hideError() {
  errorMsg.classList.remove('visible');
}

async function findRoute() {
  const start = selectStart.value;
  const end   = selectEnd.value;
  hideError();

  // Validasi input di sisi frontend
  if (!start || !end) {
    showError('⚠️  Silakan pilih shelter awal dan shelter tujuan.');
    return;
  }
  if (start === end) {
    showError('⚠️  Shelter awal dan tujuan tidak boleh sama.');
    return;
  }

  // Tampilkan loading state pada tombol
  btn.disabled = true;
  btn.classList.add('loading');

  try {
    const res = await fetch(`${API_BASE}/api/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    renderResults(data);

  } catch (e) {
    showError(`❌  Gagal menghubungi API: ${e.message}. Pastikan backend berjalan.`);
    console.error(e);
  } finally {
    // Kembalikan tombol ke state normal
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

/* ───────────────────────────────
   RENDER RESULTS — TAMPILKAN HASIL
   Membuat kartu hasil 4 algoritma
   secara dinamis dari data API
─────────────────────────────── */
const ALGO_META = {
  'BFS':         { cls: 'algo-bfs',     emoji: '🔵' },
  'DFS':         { cls: 'algo-dfs',     emoji: '🟠' },
  'BFS Optimal': { cls: 'algo-bfs-opt', emoji: '🔷' },
  'DFS Optimal': { cls: 'algo-dfs-opt', emoji: '🟢' },
};

function renderResults(data) {
  const { results, start, end } = data;

  // Cari jarak terkecil di antara semua jalur yang ditemukan
  const found   = results.filter(r => r.found);
  const minDist = found.length
    ? Math.min(...found.map(r => r.total_distance))
    : Infinity;

  // Highlight jalur BFS Optimal (bfs_modified) di kanvas secara default
  const bfsOptimal = results.find(r => r.algorithm === 'BFS Optimal' && r.found);
  const firstFound = results.find(r => r.found);
  const toHighlight = bfsOptimal || firstFound;
  if (toHighlight) {
    activePath  = toHighlight.path;
    activeStart = start;
    activeEnd   = end;
    drawGraph();
  }

  // Bangun HTML kartu hasil secara dinamis
  const html = `
    <div class="results-section">
      <div class="card card--results">
        <p class="card__title">Hasil Pencarian</p>
        <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem;">
          Rute dari shelter <strong style="color:var(--accent-1)">${start}</strong>
          ke shelter <strong style="color:var(--accent-3)">${end}</strong>
        </p>
        <div class="results-grid">
          ${results.map(r => {
            const meta    = ALGO_META[r.algorithm] || { cls: 'algo-bfs', emoji: '📍' };
            const isBest  = r.found && r.total_distance === minDist;

            const pathDisplay = r.found
              ? `<span class="result-card__path">${r.path_string}</span>`
              : `<span class="result-card__path not-found">Rute tidak ditemukan</span>`;

            const distDisplay = r.found
              ? `<span class="result-card__distance">
                   <span>Jarak:</span>
                   <span class="dist-value">${r.total_distance.toFixed(1).replace('.', ',')} km</span>
                 </span>`
              : '';

            return `
              <div class="result-card ${meta.cls}"
                   style="cursor:pointer"
                   onclick="highlightPath(${JSON.stringify(r.path || [])})">
                 ${isBest ? '<span class="best-badge">✦ Terpendek</span>' : ''}
                 <div class="result-card__algo">${meta.emoji} ${r.algorithm}</div>
                 ${pathDisplay}
                 ${distDisplay}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/* ───────────────────────────────
   HIGHLIGHT PATH
   Dipanggil saat kartu hasil diklik
   → update kanvas dengan jalur tsb
─────────────────────────────── */
function highlightPath(path) {
  if (!path || !path.length) return;
  activePath = path;
  drawGraph();
}

/* ───────────────────────────────
   ENTER KEY SUPPORT
─────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !btn.disabled) findRoute();
});

/* ───────────────────────────────
   INITIAL DRAW
─────────────────────────────── */
drawGraph();
