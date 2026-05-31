/* ───────────────────────────────
   CONFIG
─────────────────────────────── */
// Saat localhost → pakai port 8000 (server lokal)
// Saat sudah di-deploy → pakai URL yang sama (relatif)
const API_BASE = "https://web-production-0ec46.up.railway.app";
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

// Gambar ulang saat jendela di-resize (kedua kanvas)
window.addEventListener('resize', () => {
  resizeCanvas();
  if (document.getElementById('panel-custom') &&
      !document.getElementById('panel-custom').classList.contains('hidden')) {
    resizeCustomCanvas();
  }
});
resizeCanvas();

/* ───────────────────────────────
   TAB SWITCHING
─────────────────────────────── */
function switchTab(tabName) {
  // Update tombol aktif
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-btn-${tabName}`).classList.add('active');

  // Tampilkan panel yang dipilih
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`panel-${tabName}`).classList.remove('hidden');

  // Gambar ulang kanvas setelah tab muncul
  if (tabName === 'original') {
    setTimeout(resizeCanvas, 30);
  } else {
    setTimeout(resizeCustomCanvas, 30);
  }
}

/* ───────────────────────────────
   CUSTOM GRAPH — STATE
─────────────────────────────── */
let customNodes       = [];   // ['Shelter 1', 'Shelter 2', ...]
let customEdges       = [];   // [{from, to, dist}, ...]
let customActivePath  = [];
let customActiveStart = '';
let customActiveEnd   = '';

/* ───────────────────────────────
   CUSTOM CANVAS — INISIALISASI
─────────────────────────────── */
const customCanvas = document.getElementById('custom-graph-canvas');
const customCtx    = customCanvas.getContext('2d');

function resizeCustomCanvas() {
  const rect = customCanvas.parentElement.getBoundingClientRect();
  customCanvas.width        = rect.width  * devicePixelRatio;
  customCanvas.height       = rect.height * devicePixelRatio;
  customCanvas.style.width  = rect.width  + 'px';
  customCanvas.style.height = rect.height + 'px';
  customCtx.scale(devicePixelRatio, devicePixelRatio);
  drawCustomGraph();
}

/* ───────────────────────────────
   CUSTOM CANVAS — POSISI NODE
   Node diatur melingkar di tengah kanvas
─────────────────────────────── */
function getCustomNodePositions(canvasW, canvasH) {
  const positions = {};
  const total = customNodes.length;
  if (total === 0) return positions;

  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const r  = Math.min(canvasW, canvasH) * (total === 1 ? 0 : 0.34);

  customNodes.forEach((name, i) => {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    positions[name] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
  return positions;
}

/* ───────────────────────────────
   CUSTOM CANVAS — LABEL PENDEK
   "Shelter 1" → "S1", "Pos A" → "PA"
─────────────────────────────── */
function getNodeLabel(name) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.map(w => w[0]).join('').toUpperCase().substring(0, 3);
  }
  return name.substring(0, 2).toUpperCase();
}

/* ───────────────────────────────
   CUSTOM CANVAS — GAMBAR GRAF
─────────────────────────────── */
function drawCustomGraph() {
  const rect = customCanvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  customCtx.clearRect(0, 0, W, H);

  if (customNodes.length === 0) {
    customCtx.font      = '500 12px Inter, sans-serif';
    customCtx.fillStyle = 'rgba(148,163,184,0.35)';
    customCtx.textAlign = 'center';
    customCtx.textBaseline = 'middle';
    customCtx.fillText('Tambahkan shelter untuk melihat graf', W / 2, H / 2);
    return;
  }

  const positions = getCustomNodePositions(W, H);

  // Buat set jalur aktif
  const pathSet = new Set();
  for (let i = 0; i < customActivePath.length - 1; i++) {
    pathSet.add(customActivePath[i] + '→' + customActivePath[i + 1]);
    pathSet.add(customActivePath[i + 1] + '→' + customActivePath[i]);
  }

  // ── Gambar Edge ──────────────────────────
  customEdges.forEach(edge => {
    const a = positions[edge.from];
    const b = positions[edge.to];
    if (!a || !b) return;

    const isActive =
      pathSet.has(edge.from + '→' + edge.to) ||
      pathSet.has(edge.to   + '→' + edge.from);

    customCtx.beginPath();
    customCtx.moveTo(a.x, a.y);
    customCtx.lineTo(b.x, b.y);

    if (isActive) {
      customCtx.strokeStyle = 'rgba(34,211,238,0.9)';
      customCtx.lineWidth   = 2.5;
      customCtx.shadowBlur  = 12;
      customCtx.shadowColor = 'rgba(34,211,238,0.6)';
    } else {
      customCtx.strokeStyle = 'rgba(255,255,255,0.10)';
      customCtx.lineWidth   = 1.5;
      customCtx.shadowBlur  = 0;
    }
    customCtx.stroke();
    customCtx.shadowBlur = 0;

    // Label jarak di tengah garis
    const mx  = (a.x + b.x) / 2;
    const my  = (a.y + b.y) / 2;
    const txt = edge.dist.toFixed(1) + ' km';

    customCtx.font         = '500 10px Inter, sans-serif';
    customCtx.textAlign    = 'center';
    customCtx.textBaseline = 'middle';

    const tw = customCtx.measureText(txt).width;
    const pw = tw + 8, ph = 14;
    customCtx.fillStyle = isActive ? 'rgba(34,211,238,0.15)' : 'rgba(11,15,26,0.80)';
    customCtx.beginPath();
    customCtx.roundRect(mx - pw / 2, my - ph / 2, pw, ph, 4);
    customCtx.fill();

    customCtx.fillStyle = isActive ? '#22d3ee' : 'rgba(148,163,184,0.7)';
    customCtx.fillText(txt, mx, my);
  });

  // ── Gambar Node ──────────────────────────
  const R = Math.max(W, H) * 0.042;

  customNodes.forEach(name => {
    const pos = positions[name];
    if (!pos) return;
    const { x, y } = pos;

    const isStart = name === customActiveStart;
    const isEnd   = name === customActiveEnd;
    const onPath  = customActivePath.includes(name) && !isStart && !isEnd;

    // Glow luar
    if (isStart || isEnd || onPath) {
      customCtx.beginPath();
      customCtx.arc(x, y, R + 5, 0, Math.PI * 2);
      const glowColor = isStart
        ? 'rgba(108,99,255,0.35)'
        : isEnd
        ? 'rgba(244,114,182,0.35)'
        : 'rgba(34,211,238,0.25)';
      const grad = customCtx.createRadialGradient(x, y, R, x, y, R + 5);
      grad.addColorStop(0, glowColor);
      grad.addColorStop(1, 'transparent');
      customCtx.fillStyle = grad;
      customCtx.fill();
    }

    // Lingkaran node
    customCtx.beginPath();
    customCtx.arc(x, y, R, 0, Math.PI * 2);

    let fill   = '#1e293b';
    let stroke = '#334155';
    if (isStart) { fill = 'rgba(108,99,255,0.8)';  stroke = '#6c63ff'; }
    if (isEnd)   { fill = 'rgba(244,114,182,0.8)'; stroke = '#f472b6'; }
    if (onPath)  { fill = 'rgba(34,211,238,0.25)'; stroke = '#22d3ee'; }

    customCtx.shadowBlur  = isStart || isEnd || onPath ? 14 : 4;
    customCtx.shadowColor = isStart ? '#6c63ff' : isEnd ? '#f472b6' : '#22d3ee';
    customCtx.fillStyle   = fill;
    customCtx.fill();
    customCtx.shadowBlur  = 0;

    customCtx.strokeStyle = stroke;
    customCtx.lineWidth   = isStart || isEnd || onPath ? 2.5 : 1.5;
    customCtx.stroke();

    // Label singkat di dalam lingkaran
    const label = getNodeLabel(name);
    customCtx.font         = `700 ${Math.round(R * 0.62)}px Inter, sans-serif`;
    customCtx.textAlign    = 'center';
    customCtx.textBaseline = 'middle';
    customCtx.fillStyle    = isStart || isEnd || onPath ? '#fff' : '#94a3b8';
    customCtx.fillText(label, x, y);

    // Nama lengkap di bawah node
    customCtx.font         = `500 ${Math.round(R * 0.44)}px Inter, sans-serif`;
    customCtx.fillStyle    = isStart
      ? 'rgba(108,99,255,0.9)'
      : isEnd
      ? 'rgba(244,114,182,0.9)'
      : 'rgba(148,163,184,0.65)';
    customCtx.fillText(name, x, y + R + 13);
  });
}

/* ───────────────────────────────
   CUSTOM GRAPH — TAMBAH NODE
─────────────────────────────── */
function addCustomNode() {
  const input = document.getElementById('input-node-name');
  const name  = input.value.trim();

  if (!name) {
    showCustomError('⚠️ Nama shelter tidak boleh kosong.');
    return;
  }
  if (customNodes.includes(name)) {
    showCustomError(`⚠️ Shelter "${name}" sudah ada.`);
    return;
  }

  customNodes.push(name);
  input.value = '';
  hideCustomError();
  renderCustomNodeList();
  updateCustomDropdowns();
  drawCustomGraph();
}

function deleteCustomNode(name) {
  customNodes = customNodes.filter(n => n !== name);
  // Hapus juga semua koneksi yang melibatkan node ini
  customEdges = customEdges.filter(e => e.from !== name && e.to !== name);
  customActivePath  = [];
  customActiveStart = '';
  customActiveEnd   = '';
  renderCustomNodeList();
  renderCustomEdgeList();
  updateCustomDropdowns();
  drawCustomGraph();
}

function renderCustomNodeList() {
  const list = document.getElementById('custom-node-list');
  if (customNodes.length === 0) {
    list.innerHTML = '<p class="list-empty">Belum ada shelter.</p>';
    return;
  }
  list.innerHTML = customNodes.map(name => `
    <div class="list-item">
      <span class="list-item__label">📍 ${name}</span>
      <button class="list-item__delete"
        onclick="deleteCustomNode(this.dataset.name)"
        data-name="${name.replace(/"/g, '&quot;')}">✕</button>
    </div>
  `).join('');
}

/* ───────────────────────────────
   CUSTOM GRAPH — TAMBAH EDGE
─────────────────────────────── */
function addCustomEdge() {
  const from = document.getElementById('custom-edge-from').value;
  const to   = document.getElementById('custom-edge-to').value;
  const dist = parseFloat(document.getElementById('custom-edge-dist').value);

  if (!from || !to) {
    showCustomError('⚠️ Pilih shelter asal dan tujuan koneksi.');
    return;
  }
  if (from === to) {
    showCustomError('⚠️ Shelter asal dan tujuan koneksi tidak boleh sama.');
    return;
  }
  if (isNaN(dist) || dist <= 0) {
    showCustomError('⚠️ Masukkan jarak yang valid (lebih dari 0).');
    return;
  }

  // Cek koneksi duplikat (dua arah)
  const exists = customEdges.some(e =>
    (e.from === from && e.to === to) || (e.from === to && e.to === from)
  );
  if (exists) {
    showCustomError(`⚠️ Koneksi antara "${from}" dan "${to}" sudah ada.`);
    return;
  }

  customEdges.push({ from, to, dist });
  document.getElementById('custom-edge-dist').value = '';
  hideCustomError();
  renderCustomEdgeList();
  drawCustomGraph();
}

function deleteCustomEdge(index) {
  customEdges.splice(index, 1);
  customActivePath  = [];
  customActiveStart = '';
  customActiveEnd   = '';
  renderCustomEdgeList();
  drawCustomGraph();
}

function renderCustomEdgeList() {
  const list = document.getElementById('custom-edge-list');
  if (customEdges.length === 0) {
    list.innerHTML = '<p class="list-empty">Belum ada koneksi.</p>';
    return;
  }
  list.innerHTML = customEdges.map((e, i) => `
    <div class="list-item">
      <span class="list-item__label">
        🔗 ${e.from} ↔ ${e.to}
        <span style="color:var(--accent-2)">&nbsp;(${e.dist.toFixed(1)} km)</span>
      </span>
      <button class="list-item__delete" onclick="deleteCustomEdge(${i})">✕</button>
    </div>
  `).join('');
}

/* ───────────────────────────────
   CUSTOM GRAPH — SINKRON DROPDOWN
─────────────────────────────── */
function updateCustomDropdowns() {
  const configs = [
    { id: 'custom-edge-from',    placeholder: '— Pilih shelter —' },
    { id: 'custom-edge-to',      placeholder: '— Pilih shelter —' },
    { id: 'custom-select-start', placeholder: '— Pilih shelter awal —' },
    { id: 'custom-select-end',   placeholder: '— Pilih shelter tujuan —' },
  ];

  configs.forEach(({ id, placeholder }) => {
    const sel     = document.getElementById(id);
    const current = sel.value;
    sel.innerHTML =
      `<option value="">${placeholder}</option>` +
      customNodes
        .map(n => `<option value="${n}"${n === current ? ' selected' : ''}>${n}</option>`)
        .join('');
  });
}

/* ───────────────────────────────
   CUSTOM GRAPH — CARI RUTE
─────────────────────────────── */
async function findCustomRoute() {
  const start = document.getElementById('custom-select-start').value;
  const end   = document.getElementById('custom-select-end').value;
  hideCustomError();

  if (!start || !end) {
    showCustomError('⚠️ Pilih shelter awal dan shelter tujuan.');
    return;
  }
  if (start === end) {
    showCustomError('⚠️ Shelter awal dan tujuan tidak boleh sama.');
    return;
  }
  if (customNodes.length < 2) {
    showCustomError('⚠️ Tambahkan minimal 2 shelter terlebih dahulu.');
    return;
  }
  if (customEdges.length === 0) {
    showCustomError('⚠️ Tambahkan minimal 1 koneksi antar shelter.');
    return;
  }

  const btn = document.getElementById('btn-custom-find');
  btn.disabled = true;
  btn.classList.add('loading');

  try {
    const payload = {
      start,
      end,
      nodes: customNodes,
      edges: customEdges.map(e => ({
        node_from: e.from,
        node_to:   e.to,
        distance:  e.dist,
      })),
    };

    const res = await fetch(`${API_BASE}/api/custom-route`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    renderCustomResults(data);

  } catch (e) {
    showCustomError(`❌ Gagal menghubungi API: ${e.message}.`);
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

/* ───────────────────────────────
   CUSTOM GRAPH — RENDER HASIL
─────────────────────────────── */
function renderCustomResults(data) {
  const { results, start, end } = data;

  const found   = results.filter(r => r.found);
  const minDist = found.length ? Math.min(...found.map(r => r.total_distance)) : Infinity;

  // Highlight jalur BFS Optimal secara default
  const bfsOptimal  = results.find(r => r.algorithm === 'BFS Optimal' && r.found);
  const firstFound  = results.find(r => r.found);
  const toHighlight = bfsOptimal || firstFound;
  if (toHighlight) {
    customActivePath  = toHighlight.path;
    customActiveStart = start;
    customActiveEnd   = end;
    drawCustomGraph();
  }

  const html = `
    <div class="results-section">
      <div class="card card--results">
        <p class="card__title">Hasil Pencarian Graf Kustom</p>
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
                   onclick="highlightCustomPath(${JSON.stringify(r.path || [])})">
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

  document.getElementById('custom-results-container').innerHTML = html;
}

function highlightCustomPath(path) {
  if (!path || !path.length) return;
  customActivePath = path;
  drawCustomGraph();
}

/* ───────────────────────────────
   CUSTOM GRAPH — RESET
─────────────────────────────── */
function resetCustomGraph() {
  customNodes       = [];
  customEdges       = [];
  customActivePath  = [];
  customActiveStart = '';
  customActiveEnd   = '';

  renderCustomNodeList();
  renderCustomEdgeList();
  updateCustomDropdowns();
  drawCustomGraph();

  document.getElementById('custom-results-container').innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">✏️</div>
      <p class="empty-state__text">
        Tambahkan shelter &amp; koneksi, pilih rute,<br>
        lalu klik <strong>"Temukan Rute"</strong> untuk melihat hasil.
      </p>
    </div>
  `;
}

/* ───────────────────────────────
   CUSTOM GRAPH — ERROR HELPERS
─────────────────────────────── */
function showCustomError(msg) {
  const el = document.getElementById('custom-error-msg');
  el.textContent = msg;
  el.classList.add('visible');
}

function hideCustomError() {
  document.getElementById('custom-error-msg').classList.remove('visible');
}

/* ───────────────────────────────
   ENTER KEY — Tambah Node
─────────────────────────────── */
document.getElementById('input-node-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addCustomNode();
});

/* ───────────────────────────────
   INIT CUSTOM CANVAS
─────────────────────────────── */
resizeCustomCanvas();


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
