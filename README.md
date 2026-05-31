# 🗺️ Rute Evakuasi — BFS & DFS Pathfinder

> Tugas Mata Kuliah Struktur Data  
> Pencarian rute evakuasi bencana menggunakan algoritma **BFS** dan **DFS** pada struktur data **Graph**, diimplementasikan sebagai web app berbasis Python (FastAPI) + HTML/CSS/JS.

---

## 📋 Daftar Isi

- [Deskripsi Proyek](#-deskripsi-proyek)
- [Struktur Graf Evakuasi](#-struktur-graf-evakuasi)
- [Algoritma yang Digunakan](#-algoritma-yang-digunakan)
- [Cara Kerja Kode](#-cara-kerja-kode)
- [Struktur Web & API](#-struktur-web--api)
- [Clone & Jalankan Secara Lokal](#-clone--jalankan-secara-lokal)
- [Deployment](#-deployment)
- [Contoh Output API](#-contoh-output-api)

---

## 📌 Deskripsi Proyek

Proyek ini mensimulasikan pencarian **jalur evakuasi terpendek** antar shelter bencana menggunakan dua algoritma klasik pada struktur data graph:

| Algoritma | Deskripsi |
|-----------|-----------|
| **BFS** (Breadth-First Search) | Mencari jalur pertama yang ditemukan secara melebar (per level) |
| **DFS** (Depth-First Search) | Mencari jalur pertama yang ditemukan secara mendalam |
| **BFS Optimal** | Menelusuri **semua** jalur dengan BFS, lalu memilih yang terpendek |
| **DFS Optimal** | Menelusuri **semua** jalur dengan DFS, lalu memilih yang terpendek |

---

## 🗺️ Struktur Graf Evakuasi

Graf terdiri dari **7 shelter** (node) yang terhubung dengan jalur berbobot (jarak dalam km):

```
Shelter: A, B, C, D, E, F, G

Koneksi antar shelter:
  A ──1.5── B
  A ──1.5── D
  A ──3.0── F
  B ──1.5── C
  B ──1.8── D
  D ──1.1── C
  D ──0.8── F
  C ──2.5── F
  C ──0.2── E
  F ──1.5── E
  F ──1.0── G
```

Graf ini bersifat **tidak berarah** (*undirected*) — setiap jalur bisa dilalui dari dua arah — dan **berbobot** (*weighted*) — setiap jalur memiliki jarak.

**Visualisasi posisi node di kanvas:**

```
  A          B ──── C ──── E
  │ \        │    / │
  │  \       │   /  │
  │   F ─────D      │
  │    \              \
  │     G              (C─E sangat dekat: 0.2 km)
  └──────────────────
```

---

## 🧠 Algoritma yang Digunakan

### 1. BFS — Breadth-First Search (Standar)

**Cara kerja:**
- Menggunakan struktur data **Queue** (antrian, FIFO)
- Menelusuri graf **per level** — semua tetangga dikunjungi sebelum turun lebih dalam
- Menemukan jalur dengan **jumlah hop (langkah) paling sedikit**, bukan jarak terpendek

```
Queue awal: [(A, path=[A], dist=0)]

Iterasi 1: ambil A → kunjungi B, D, F
Iterasi 2: ambil B → kunjungi C
Iterasi 3: ambil D → (sudah dikunjungi semua)
...
Berhenti saat target ditemukan pertama kali
```

**Karakteristik:** Cepat, tidak selalu menghasilkan jarak terpendek.

---

### 2. DFS — Depth-First Search (Standar)

**Cara kerja:**
- Menggunakan struktur data **Stack** (tumpukan, LIFO)
- Menelusuri satu jalur **sedalam mungkin** sebelum backtrack
- Menemukan **jalur pertama yang ditemukan**, bukan yang terpendek

```
Stack awal: [(A, path=[A], dist=0)]

Iterasi 1: pop A → push F, D, B (reversed sorted)
Iterasi 2: pop B → telusuri B dulu sampai habis
...
Berhenti saat target ditemukan pertama kali
```

**Karakteristik:** Jalur yang ditemukan bergantung urutan traversal.

---

### 3. BFS Optimal (Modifikasi)

**Perbedaan dari BFS biasa:**
- **Tidak berhenti** saat target pertama kali ditemukan
- Menggunakan `continue` untuk **tetap mencari jalur lain**
- Semua jalur yang ditemukan disimpan, lalu **diurutkan berdasarkan jarak**
- Menggunakan `neighbour not in path` (bukan `visited` set) → bisa revisit node lewat jalur berbeda

```python
if vertex == target:
    all_possible_paths.append((path, total_dist))
    continue  # ← kunci: lanjut telusuri, jangan berhenti

all_possible_paths.sort(key=lambda x: x[1])
return all_possible_paths[0]  # ← jalur terpendek
```

---

### 4. DFS Optimal (Modifikasi)

**Sama seperti BFS Optimal**, tetapi menggunakan Stack (DFS):
- Menelusuri **semua kemungkinan jalur** secara depth-first
- Mengumpulkan semua jalur yang mencapai target
- Memilih jalur dengan **total jarak minimum**

---

## 🔍 Cara Kerja Kode

### Struktur Class `Graph`

```
Graph
├── __init__(directed=False)   → Buat adjacency list kosong
├── add_edge(u, v, jarak)      → Tambah sisi antar node (2 arah jika undirected)
├── bfs(start, target)         → BFS standar, return (path, dist) pertama
├── dfs(start, target)         → DFS standar, return (path, dist) pertama
├── bfs_modified(start, target)→ BFS semua jalur, return (path, dist) terpendek
└── dfs_modified(start, target)→ DFS semua jalur, return (path, dist) terpendek
```

### Representasi Graf (Adjacency List)

```python
# Setelah add_edge('A', 'B', 1.5):
graph = {
    'A': [('B', 1.5), ('D', 1.5), ('F', 3.0)],
    'B': [('A', 1.5), ('C', 1.5), ('D', 1.8)],
    'D': [('A', 1.5), ('B', 1.8), ('C', 1.1), ('F', 0.8)],
    ...
}
```

### Alur Data Lengkap (Request → Response)

```
Browser / Client
      │
      │  POST /api/route  {"start": "A", "end": "G"}
      ▼
  FastAPI (main.py)
      │
      ├─ Validasi input (start & end harus ada di SHELTERS, tidak sama)
      ├─ build_graph()  → buat instance Graph & isi semua edge
      │
      ├─ g.bfs("A", "G")         → (["A","F","G"], 4.0)
      ├─ g.dfs("A", "G")         → (["A","B","C","D","F","G"], 5.9)
      ├─ g.bfs_modified("A","G") → (["A","D","F","G"], 3.3)
      └─ g.dfs_modified("A","G") → (["A","D","F","G"], 3.3)
      │
      ▼
  JSON Response → Browser
      │
      ▼
  JavaScript render hasil + animasi canvas graph
```

---

## 🏗️ Struktur Web & API

### Struktur File

```
tugas-mario/
│
├── main.py              ← Backend utama (FastAPI)
│   ├── class Graph      → Implementasi BFS, DFS, BFS Optimal, DFS Optimal
│   ├── SHELTERS, EDGES  → Data graf evakuasi
│   ├── build_graph()    → Membangun instance Graf
│   ├── GET  /api        → Health check
│   ├── GET  /api/shelters → Daftar shelter & edge
│   ├── POST /api/route  → Endpoint pencarian rute (4 algoritma)
│   └── mount "/"        → Serve semua file dari folder public/
│
├── public/
│   ├── index.html       ← Struktur halaman (HTML murni)
│   ├── style.css        ← Seluruh styling (dark glassmorphism, animasi, responsif)
│   └── script.js        ← Logika frontend (canvas graf, fetch API, render hasil)
│
├── requirements.txt     ← Dependensi Python (fastapi, uvicorn, pydantic)
├── Procfile             ← Perintah start untuk Railway/Render/Heroku
├── railway.toml         ← Konfigurasi Railway
├── netlify.toml         ← Konfigurasi Netlify
├── runtime.txt          ← Versi Python (3.11)
└── .gitignore
```

### API Endpoints

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `GET` | `/api` | Health check, cek API aktif |
| `GET` | `/api/shelters` | Ambil daftar shelter & data edge |
| `POST` | `/api/route` | Cari rute dengan 4 algoritma |
| `GET` | `/api/docs` | Swagger UI (dokumentasi interaktif) |
| `GET` | `/` | Halaman web utama |

### Struktur Frontend

```
public/
├── index.html   ← Struktur HTML murni (kerangka halaman)
├── style.css    ← Semua styling (design tokens, layout, animasi)
└── script.js    ← Semua logika JS (canvas, fetch API, render)
```

```
Halaman Web (index.html)
│
├── <head>          → Link ke style.css + Google Fonts
│
├── Header          → Judul + badge "Struktur Data Graph"
│
├── Main Grid (2 kolom)
│   ├── Kolom Kiri
│   │   ├── Card Kontrol
│   │   │   ├── Chip A-G    → Indikator visual shelter terpilih
│   │   │   ├── Select Start → Pilih shelter awal
│   │   │   ├── Select End   → Pilih shelter tujuan
│   │   │   └── Tombol Cari  → Trigger POST /api/route
│   │   └── Card Legenda    → Keterangan warna node
│   │
│   └── Kolom Kanan
│       ├── Card Graf        → Canvas HTML5, gambar node & edge
│       │   └── <canvas>     → Digambar ulang setiap ada hasil baru
│       └── Hasil Pencarian  → 4 card algoritma + badge "Terpendek"
│
├── Footer          → Info tugas
│
└── <script src="script.js">  → Load logika di akhir body
```

### Cara Kerja Canvas Graf (JavaScript)

1. Node A–G digambar sebagai lingkaran di posisi koordinat relatif
2. Edge digambar sebagai garis dengan label jarak di tengah
3. Saat hasil diterima → node & edge di jalur aktif **berwarna cyan** + glow effect
4. Klik salah satu kartu hasil → highlight jalur algoritma tersebut di canvas

---

## 💻 Clone & Jalankan Secara Lokal

### Prasyarat

- **Git** — untuk clone repositori
- **Python 3.11+** — runtime backend
- **uv** *(rekomendasi)* atau pip — package manager Python

### Langkah 1 — Clone Repositori

```bash
git clone https://github.com/USERNAME/tugas-mario.git
cd tugas-mario
```

### Langkah 2 — Buat Virtual Environment & Install Dependensi

**Menggunakan `uv` (lebih cepat, direkomendasikan):**

```bash
# Install uv jika belum ada
curl -LsSf https://astral.sh/uv/install.sh | sh

# Buat virtual environment
uv venv .venv

# Aktifkan virtual environment
source .venv/bin/activate        # Linux / macOS
# .venv\Scripts\activate         # Windows

# Install dependensi
uv pip install -r requirements.txt
```

**Menggunakan `pip` (alternatif):**

```bash
python -m venv .venv
source .venv/bin/activate        # Linux / macOS
# .venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

### Langkah 3 — Jalankan Server

```bash
uvicorn main:app --reload --port 8000
```

Output yang muncul:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

### Langkah 4 — Buka di Browser

| URL | Keterangan |
|-----|------------|
| http://localhost:8000 | Halaman web utama |
| http://localhost:8000/api/docs | Swagger UI — uji API secara interaktif |
| http://localhost:8000/api/shelters | Data shelter & edge (JSON) |

### Langkah 5 — Hentikan Server

Tekan `Ctrl + C` di terminal.

---

## 🚀 Deployment

### Railway (Rekomendasi — Free Tier)

1. Push proyek ke **GitHub**
2. Buka [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Pilih repositori → Railway otomatis mendeteksi Python via `Procfile`
4. Tunggu deploy selesai → app langsung dapat diakses publik ✅

### Render (Free Tier)

1. Buka [render.com](https://render.com) → **New Web Service**
2. Hubungkan GitHub → isi:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Deploy ✅

### Netlify (Khusus Frontend)

Jika ingin deploy frontend saja ke Netlify dan backend ke Railway:

1. Deploy backend ke Railway → catat URL, misal `https://tugas-mario.up.railway.app`
2. Di `public/index.html`, ubah baris ini:
   ```js
   const API_BASE = 'https://tugas-mario.up.railway.app';
   ```
3. Drag & drop folder `public/` ke [netlify.com/drop](https://netlify.com/drop) ✅

---

## 📦 Contoh Output API

### Request

```bash
curl -X POST http://localhost:8000/api/route \
  -H "Content-Type: application/json" \
  -d '{"start": "A", "end": "G"}'
```

### Response

```json
{
  "start": "A",
  "end": "G",
  "results": [
    {
      "algorithm": "BFS",
      "path": ["A", "F", "G"],
      "total_distance": 4.0,
      "path_string": "A → F → G",
      "found": true
    },
    {
      "algorithm": "DFS",
      "path": ["A", "B", "C", "D", "F", "G"],
      "total_distance": 5.9,
      "path_string": "A → B → C → D → F → G",
      "found": true
    },
    {
      "algorithm": "BFS Optimal",
      "path": ["A", "D", "F", "G"],
      "total_distance": 3.3,
      "path_string": "A → D → F → G",
      "found": true
    },
    {
      "algorithm": "DFS Optimal",
      "path": ["A", "D", "F", "G"],
      "total_distance": 3.3,
      "path_string": "A → D → F → G",
      "found": true
    }
  ],
  "shelters": ["A", "B", "C", "D", "E", "F", "G"]
}
```

### Analisis Hasil (A → G)

| Algoritma | Jalur | Jarak | Keterangan |
|-----------|-------|-------|------------|
| BFS | A → F → G | 4.0 km | Paling sedikit langkah (2 hop) |
| DFS | A → B → C → D → F → G | 5.9 km | Jalur pertama yang ditemukan DFS |
| BFS Optimal | A → D → F → G | **3.3 km** ✦ | Terpendek |
| DFS Optimal | A → D → F → G | **3.3 km** ✦ | Terpendek |

> **Kesimpulan:** BFS standar menemukan jalur dengan langkah paling sedikit, tetapi BFS/DFS Optimal menemukan jalur dengan **jarak total terpendek** karena menelusuri semua kemungkinan jalur.

---

## 🛠️ Teknologi yang Digunakan

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| Backend | Python 3.11 | Bahasa pemrograman utama |
| Framework | FastAPI | REST API + serve static files |
| Validasi | Pydantic v2 | Schema request & response |
| Server | Uvicorn | ASGI server (HTTP) |
| Frontend | HTML5 + CSS3 + JS | UI tanpa framework tambahan |
| Grafik | Canvas API (HTML5) | Visualisasi graf interaktif |
| Font | Google Fonts (Inter, JetBrains Mono) | Tipografi |

---

*Dibuat untuk tugas mata kuliah Struktur Data — Algoritma Graph BFS & DFS*
