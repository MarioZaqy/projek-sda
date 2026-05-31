from collections import deque
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os

# ─────────────────────────────────────────────
# CLASS GRAPH
# ─────────────────────────────────────────────

class Graph:

    def __init__(self, directed=False):
        self.graph = {}
        self.directed = directed

    def add_edge(self, u, v, jarak):
        if u not in self.graph:
            self.graph[u] = []
        if v not in self.graph:
            self.graph[v] = []
        self.graph[u].append((v, jarak))
        if not self.directed:
            self.graph[v].append((u, jarak))

    def bfs(self, start, target):
        visited = set()
        queue = deque([(start, [start], 0)])
        visited.add(start)
        while queue:
            (vertex, path, total_dist) = queue.popleft()
            if vertex == target:
                return path, total_dist
            for neighbour, weight in sorted(self.graph.get(vertex, [])):
                if neighbour not in visited:
                    visited.add(neighbour)
                    queue.append((neighbour, path + [neighbour], total_dist + weight))
        return None, 0

    def dfs(self, start, target):
        visited = set()
        stack = [(start, [start], 0)]
        while stack:
            (vertex, path, total_dist) = stack.pop()
            if vertex == target:
                return path, total_dist
            if vertex not in visited:
                visited.add(vertex)
                for neighbour, weight in reversed(sorted(self.graph.get(vertex, []))):
                    if neighbour not in visited:
                        stack.append((neighbour, path + [neighbour], total_dist + weight))
        return None, 0

    def bfs_modified(self, start, target):
        queue = deque([(start, [start], 0)])
        all_possible_paths = []
        while queue:
            (vertex, path, total_dist) = queue.popleft()
            if vertex == target:
                all_possible_paths.append((path, total_dist))
                continue
            for neighbour, weight in sorted(self.graph.get(vertex, [])):
                if neighbour not in path:
                    queue.append((neighbour, path + [neighbour], total_dist + weight))
        if all_possible_paths:
            all_possible_paths.sort(key=lambda x: x[1])
            return all_possible_paths[0]
        return None, 0

    def dfs_modified(self, start, target):
        stack = [(start, [start], 0)]
        all_possible_paths = []
        while stack:
            (vertex, path, total_dist) = stack.pop()
            if vertex == target:
                all_possible_paths.append((path, total_dist))
                continue
            if vertex in self.graph:
                for neighbour, weight in reversed(sorted(self.graph[vertex])):
                    if neighbour not in path:
                        stack.append((neighbour, path + [neighbour], total_dist + weight))
        if all_possible_paths:
            all_possible_paths.sort(key=lambda x: x[1])
            return all_possible_paths[0]
        return None, 0


# ─────────────────────────────────────────────
# GRAPH DATA
# ─────────────────────────────────────────────

SHELTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

EDGES = [
    {"from": "A", "to": "B", "distance": 1.5},
    {"from": "A", "to": "D", "distance": 1.5},
    {"from": "A", "to": "F", "distance": 3.0},
    {"from": "B", "to": "C", "distance": 1.5},
    {"from": "B", "to": "D", "distance": 1.8},
    {"from": "D", "to": "C", "distance": 1.1},
    {"from": "D", "to": "F", "distance": 0.8},
    {"from": "C", "to": "F", "distance": 2.5},
    {"from": "C", "to": "E", "distance": 0.2},
    {"from": "F", "to": "E", "distance": 1.5},
    {"from": "F", "to": "G", "distance": 1.0},
]


def build_graph() -> Graph:
    g = Graph()
    for e in EDGES:
        g.add_edge(e["from"], e["to"], e["distance"])
    return g


# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────

app = FastAPI(
    title="Rute Evakuasi API",
    description="API pencarian rute evakuasi menggunakan BFS & DFS",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Schemas ───────────────────────────

class RouteRequest(BaseModel):
    start: str
    end: str


class RouteResult(BaseModel):
    algorithm: str
    path: Optional[list[str]] = None
    total_distance: float
    path_string: Optional[str] = None
    found: bool


class RouteResponse(BaseModel):
    start: str
    end: str
    results: list[RouteResult]
    shelters: list[str]
    edges: list[dict]


class CustomEdgeInput(BaseModel):
    node_from: str
    node_to: str
    distance: float


class CustomRouteRequest(BaseModel):
    start: str
    end: str
    nodes: list[str]
    edges: list[CustomEdgeInput]


# ── API Routes (must be before static mount) ──

@app.get("/api")
def root():
    return {
        "message": "Rute Evakuasi API is running",
        "shelters": SHELTERS,
        "docs": "/api/docs",
    }


@app.get("/api/shelters")
def get_shelters():
    """Mengembalikan daftar shelter yang tersedia beserta data edge graph."""
    return {"shelters": SHELTERS, "edges": EDGES}


@app.post("/api/route", response_model=RouteResponse)
def find_routes(req: RouteRequest):
    """
    Mencari rute evakuasi dari shelter asal ke shelter tujuan
    menggunakan 4 algoritma: BFS, DFS, BFS Optimal, DFS Optimal.
    """
    start = req.start.strip().upper()
    end   = req.end.strip().upper()

    if start not in SHELTERS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Shelter '{start}' tidak valid. Pilih: {', '.join(SHELTERS)}")
    if end not in SHELTERS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Shelter '{end}' tidak valid. Pilih: {', '.join(SHELTERS)}")
    if start == end:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Shelter awal dan tujuan tidak boleh sama.")

    g = build_graph()

    algorithms = [
        ("BFS",         g.bfs),
        ("DFS",         g.dfs),
        ("BFS Optimal", g.bfs_modified),
        ("DFS Optimal", g.dfs_modified),
    ]

    results: list[RouteResult] = []
    for name, fn in algorithms:
        path, dist = fn(start, end)
        found = path is not None
        results.append(
            RouteResult(
                algorithm=name,
                path=path,
                total_distance=round(dist, 2) if found else 0.0,
                path_string=" → ".join(path) if found else "Rute tidak ditemukan",
                found=found,
            )
        )

    return RouteResponse(
        start=start,
        end=end,
        results=results,
        shelters=SHELTERS,
        edges=EDGES,
    )


@app.post("/api/custom-route", response_model=RouteResponse)
def find_custom_routes(req: CustomRouteRequest):
    """
    Mencari rute pada graf kustom yang didefinisikan pengguna
    menggunakan 4 algoritma: BFS, DFS, BFS Optimal, DFS Optimal.
    """
    start = req.start.strip()
    end   = req.end.strip()

    if start not in req.nodes:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Shelter '{start}' tidak valid.")
    if end not in req.nodes:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Shelter '{end}' tidak valid.")
    if start == end:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Shelter awal dan tujuan tidak boleh sama.")

    g = Graph()
    edges_dict = []
    for e in req.edges:
        g.add_edge(e.node_from, e.node_to, e.distance)
        edges_dict.append({"from": e.node_from, "to": e.node_to, "distance": e.distance})

    algorithms = [
        ("BFS",         g.bfs),
        ("DFS",         g.dfs),
        ("BFS Optimal", g.bfs_modified),
        ("DFS Optimal", g.dfs_modified),
    ]

    results: list[RouteResult] = []
    for name, fn in algorithms:
        path, dist = fn(start, end)
        found = path is not None
        results.append(
            RouteResult(
                algorithm=name,
                path=path,
                total_distance=round(dist, 2) if found else 0.0,
                path_string=" \u2192 ".join(path) if found else "Rute tidak ditemukan",
                found=found,
            )
        )

    return RouteResponse(
        start=start,
        end=end,
        results=results,
        shelters=req.nodes,
        edges=edges_dict,
    )


# ── Serve Static Frontend ──────────────────────

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")

if os.path.isdir(PUBLIC_DIR):
    app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="static")
