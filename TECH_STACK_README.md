# NEXUS — Deep-Dive Tech Stack Architecture & Implementation Specification

> **NEXUS** is an autonomous Spatial Intelligence & Operational Command Platform that ingests fragmented multimodal real-world observations, fuses them into an authoritative 3D/2D digital twin, calculates causal graph impact and accessibility bottlenecks, performs isolated counterfactual simulations, and coordinates policy-bounded response plans with closed-loop physical verification.

This document provides a **complete, component-by-component, architectural breakdown** of every layer, framework, library, protocol, and algorithm used in the NEXUS codebase.

---

## 1. High-Level Architectural Topology

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT / INTERACTION LAYER                              │
│  Next.js 15 (App Router) • React 19 • TypeScript 5 • Tailwind CSS • Zustand • TanStack │
│  ┌───────────────────────────────┐          ┌────────────────────────────────────────┐ │
│  │ 3D Spatial Twin (CesiumJS)    │          │ 2D Tactical View (Mapbox GL JS)        │ │
│  │ - 3D Tiles & Terrain Engine   │          │ - High-Density Vector Overlays         │ │
│  │ - Dynamic Entity Billboards   │          │ - GeoJSON Choropleths & Heatmaps       │ │
│  └───────────────▲───────────────┘          └───────────────────▲────────────────────┘ │
│                  │                                              │                      │
│                  └──────────────────────┬───────────────────────┘                      │
└─────────────────────────────────────────┼──────────────────────────────────────────────┘
                                          │ REST API / WebSocket Duplex
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION & SERVICES LAYER                              │
│                     Python 3.11+ • FastAPI • Pydantic v2 • Uvicorn                     │
│  ┌─────────────────────────────┐                  ┌──────────────────────────────────┐ │
│  │ Evidence Ingestion & Fusion │                  │ Impact & Topological Analysis    │ │
│  │ - Multimodal Parser         │                  │ - NetworkX Shortest Path Routing │ │
│  │ - Spatial Haversine / H3    │                  │ - Hospital Access Delays         │ │
│  │ - Cosine Semantic Clustered │                  │ - Utility Strain Modeling        │ │
│  └──────────────▲──────────────┘                  └─────────────────▲────────────────┘ │
│                 │                                                   │                  │
│  ┌──────────────┴──────────────┐                  ┌─────────────────┴────────────────┐ │
│  │ Counterfactual Simulation   │                  │ Closed-Loop Physical Action      │ │
│  │ - Non-Mutating Sandboxes    │                  │ - Plan Synthesis Engine          │ │
│  │ - Dynamic Network Detours   │                  │ - RBAC Policy State Machine      │ │
│  │ - Pre/Post Travel Times     │                  │ - Drone Telemetry Verification   │ │
│  └─────────────────────────────┘                  └──────────────────────────────────┘ │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │ Async I/O (SQLAlchemy 2.0 AsyncPG / SQLite)
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               DATA & INFRASTRUCTURE LAYER                              │
│  PostgreSQL 16 + PostGIS 3.4 • pgvector • Redis 7 • MinIO S3 • Docker Compose          │
│  (Dev Fallback: Asynchronous SQLite via aiosqlite for 100% Offline Hackathon Mode)     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Technology Stack (`apps/web`)

### 2.1 Next.js 15 (App Router)
- **Role:** Web framework hosting the Operator Command Center, Citizen Reporter, and Audit Queue.
- **Why It Was Chosen:**
  - Fast page rendering with React Server Components (RSC) and hybrid client views.
  - Native route grouping and dynamic query handling (`/world`, `/report`, `/track?id=...`, `/review`).
  - Strict build-time tree-shaking and dynamic bundling for heavy 3D WebGL modules.
- **Key Modules in Project:**
  - `apps/web/src/app/world/page.tsx`: The primary 3D mission control operating surface.
  - `apps/web/src/app/report/page.tsx`: Public incident submission interface with media upload & geotagging.
  - `apps/web/src/app/track/page.tsx`: 9-milestone transparency verification tracker for citizens.
  - `apps/web/src/app/review/page.tsx`: Human-in-the-loop candidate triage queue.

### 2.2 React 19 & TypeScript 5
- **Role:** Reactive component model and strict static type governance.
- **Why It Was Chosen:**
  - Concurrent rendering for managing high-frequency spatial streams without UI stutter.
  - Complete type safety across shared schema models (`packages/shared-types`). Eliminates runtime schema mismatch between Python Pydantic models and UI components.

### 2.3 CesiumJS (`cesium: ^1.121.0`)
- **Role:** Planetary 3D geospatial engine rendering the true-scale digital twin.
- **Key Implementation Points:**
  - **Terrain & Globe:** Renders high-precision WGS84 globes, elevation, and 3D buildings.
  - **Dynamic Entity Management (`NexusViewer.tsx`, `IncidentLayer.ts`):** 
    - Pulsing alert halos and 3D bounding cylinders around flood zones.
    - Ground-clamped polyline corridors for closed roads and bypass detours.
    - Dynamic billboard markers for ambulances, police cruisers, and recon drones.
  - **Cinematic Choreography (`CameraController.ts`):** Programmatic smooth spline flights between incidents, hospitals, and command assets during the 10-step Judge Demo.

### 2.4 Mapbox GL JS (`mapbox-gl: ^3.32.0`)
- **Role:** 2D tactical vector engine providing instant fallback and data-dense spatial visualizations.
- **Key Implementation Points:**
  - `MapboxView.tsx`: Renders GPU-accelerated vector tiles when operating on low-power hardware or when viewing dense urban heatmaps.
  - Dynamic GeoJSON source binding for instant layer toggling between flood extents, hospital nodes, and road graphs.

### 2.5 Zustand (`zustand: ^5.0.3`)
- **Role:** Zero-boilerplate global state management.
- **Key Implementation Points (`useWorldStore.ts`):**
  - Holds active incidents, corroborating evidence items, live asset telemetries, and counterfactual simulation results in a single, predictable memory store.
  - Manages playback state for the **Judge Demo Timeline** (`demoTimeline.ts`), allowing instant jumping, auto-play (4.5s intervals), pause, and deterministic resets.

### 2.6 TanStack React Query (`@tanstack/react-query: ^5.66.0`)
- **Role:** Asynchronous server state caching, background polling, and mutation tracking.
- **Key Implementation Points:**
  - Automated background re-fetching of field evidence candidates without page reloads.
  - Optimistic updates when dispatching rescue assets or changing incident status.

### 2.7 Styling & Icons
- **Tailwind CSS (`^3.4.14`):** Utility-first styling framework configured with a custom cyberpunk/tactical dark palette (HUD borders, glowing indicators, telemetry cards).
- **clsx & tailwind-merge:** Conflict-free dynamic class composition.
- **Lucide React (`^0.475.0`):** Consistent military-grade operational iconography for drones, ambulances, hazards, and mission metrics.

---

## 3. Backend Technology Stack (`services/api`)

### 3.1 Python 3.11+ & FastAPI (`fastapi: >=0.115.0`)
- **Role:** Asynchronous REST API and WebSocket operational gateway.
- **Why It Was Chosen:**
  - Native asynchronous event loop via `asyncio` capable of processing simultaneous IoT sensor streams and citizen uploads.
  - Built-in OpenAPI / Swagger UI documentation generation (`/docs`).
  - Automatic request and response validation using Pydantic.

### 3.2 Uvicorn (`uvicorn[standard]: >=0.31.0`)
- **Role:** ASGI web server worker providing HTTP/1.1 and WebSocket protocol handling.
- **Key Implementation:** Runs with hot-reloading in development and multi-worker multiprocessing in production Docker containers.

### 3.3 Pydantic v2 & Pydantic-Settings (`pydantic: >=2.9.2`)
- **Role:** High-speed C-based data parsing, schema enforcement, and environment configuration.
- **Key Implementation Points:**
  - Serializes all geospatial responses (`IncidentRead`, `EvidenceCluster`, `SimulationResult`).
  - Centralizes typed configuration in `app/core/config.py` (database URLs, CORS rules, model inference endpoints).

### 3.4 SQLAlchemy 2.0 (`sqlalchemy[asyncio]: >=2.0.35`)
- **Role:** Modern Python Object Relational Mapper (ORM) utilizing the async 2.0 style.
- **Key Models:**
  - `Incident`: Core table tracking canonical events, coordinates, severities, and lifecycle phases.
  - `EvidenceItem`: Stores raw multimodal observations (photos, audio, sensor logs, geotags).
  - `FusionRecord`: Stores corroboration mathematics, cluster confidence, and contributing evidence vectors.
  - `ResponsePlan`: Captures auto-synthesized response strategies, assigned units, and audit logs.
  - `AuditLog`: Immutable, append-only security log recording every commander action and policy check.

### 3.5 Database Drivers: Dual-Engine Architecture
NEXUS implements an enterprise hybrid database design:
- **Production: PostgreSQL + asyncpg (`asyncpg: >=0.29.0`):**
  - Pure-async PostgreSQL driver delivering maximum throughput.
  - Backed by **PostGIS** for spatial indices and native geographic distance queries.
- **Local Dev / Offline Demo: aiosqlite (`aiosqlite: >=0.20.0`):**
  - Fully asynchronous SQLite wrapper.
  - Allows NEXUS to start instantly on a judge's laptop or offline environment without requiring local Docker daemon execution.

### 3.6 Real-Time Communication
- **WebSockets (`app/routes/websocket.py`):** Bidirectional pub/sub pipe broadcasting real-time twin updates (`INCIDENT_MUTATED`, `ASSET_TELEMETRY`, `FUSION_UPDATE`) to all connected client consoles.
- **HTTPX (`httpx: >=0.27.2`):** Asynchronous HTTP client used for inter-service communication and fetching external sensor feeds.

---

## 4. Operational Intelligence & Analytical Engines

### 4.1 Evidence Fusion Engine (`app/services/fusion_engine.py`)
Combines multiple noisy, unstructured citizen reports and IoT readings into high-confidence canonical incidents.
- **Mathematical Form:**
  $$\text{Corroboration Score} = w_s S_{\text{spatial}} + w_t S_{\text{temporal}} + w_m S_{\text{semantic}} + w_e S_{\text{entity}} + w_v S_{\text{visual}} + w_i S_{\text{independence}}$$
- **Spatial Metric ($S_{\text{spatial}}$):** Computed via Haversine geodesic distance or Uber H3 spatial hexagon adjacency.
- **Temporal Metric ($S_{\text{temporal}}$):** Exponential decay scoring based on elapsed time between observations.
- **Semantic Metric ($S_{\text{semantic}}$):** Cosine vector similarity across extracted event keywords.
- **Threshold Policy:** If composite corroboration $\ge 0.85$, candidate items cluster into an active, verified operational incident.

### 4.2 Impact Intelligence Engine (`app/services/impact_service.py`)
Computes cascading infrastructural consequences when a road or bridge is blocked.
- Evaluates **Hospital Access Severance**: Quantifies ambulance ingress delays (e.g., +9.0 minutes to Memorial Hospital).
- Determines **Topological Isolations**: Detects medical facilities or critical zones whose primary ingress vectors are compromised.
- Utility Strain Aggregation: Monitors correlated strain across drainage culverts and power substations.

### 4.3 Counterfactual Simulation Engine (`app/services/simulation_service.py`)
- **Non-Mutating Sandboxes:** Simulates "what-if" detour scenarios (e.g., diverting traffic through Corridor R14) in memory without modifying the live database state.
- **Network Routing:** Uses directed graph pathfinding (Dijkstra/A* over municipal road graphs) to compute baseline vs simulated travel times (e.g., reducing detour time to 7.1 minutes).

### 4.4 Closed-Loop Verification (`app/services/response_service.py`)
- Coordinates the complete operational lifecycle:
  `Citizen Report` $\rightarrow$ `AI Fusion` $\rightarrow$ `Impact Analysis` $\rightarrow$ `Simulation` $\rightarrow$ `Commander Authorization` $\rightarrow$ `Autonomous Drone Dispatch` $\rightarrow$ `Physical Sensor Corroboration` $\rightarrow$ `Resolution`.
- Automatically dispatches drone reconnaissance to capture post-incident water recession (verifying flood levels drop below safety threshold before road re-opening).

---

## 5. Security & Access Control (RBAC)

NEXUS enforces a multi-tier Role-Based Access Control matrix across both the UI and API:

| Role | Access Scope | Restraints |
| :--- | :--- | :--- |
| **CITIZEN** | Public road closures, transparency tracker (`/track`), public safety advisories | Cannot view tactical asset GPS, unverified evidence, or response plans |
| **RESPONDER** | Assigned incidents, tactical corridors, nearest hospital routes | Cannot authorize city-wide road closures or bypass simulations |
| **AUTHORITY** | Full 3D digital twin, impact graphs, counterfactual simulator, one-click authorization | Actions strictly recorded in immutable audit logs |
| **ADMIN** | System health, model thresholds, role administration, security compliance | Governed by platform audit trail |

---

## 6. Containerization & Infrastructure (`infra/docker`)

- **PostgreSQL 16 + PostGIS (`postgis/postgis:16-3.4`):** Relational spatial database running on port `5432`.
- **Redis 7 Alpine (`redis:7-alpine`):** In-memory cache and message broker on port `6379`.
- **MinIO S3 (`minio/minio`):** High-performance, S3-compatible object storage for raw citizen media, drone aerial footage, and evidence archives on port `9000/9001`.
- **Multi-Stage Dockerfiles:**
  - `Dockerfile.api`: Python 3.11 slim image running Uvicorn.
  - `Dockerfile.web`: Node.js 18 alpine image building standalone Next.js production artifacts.

---

## 7. Testing & Quality Assurance

- **Backend Automated Suite:** Pytest with `pytest-asyncio` (`30 passed, 0 failed` covering fusion scoring, simulation sandboxes, and verification state machines).
- **Frontend Static Verification:** TypeScript compiler (`npx tsc --noEmit`) with 0 errors across the entire command center code base.
- **Dev Runner (`run_dev.ps1`):** Integrated single-command PowerShell script launching concurrent backend and frontend jobs with unified logging and graceful teardown.
