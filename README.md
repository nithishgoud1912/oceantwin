# OceanTwin - Intelligent 3D Ocean Digital Twin & Observation Platform

**Smart India Hackathon 2026**  
- **Problem Statement ID**: `SIH 26067`
- **Problem Statement Title**: OceanTwin
- **Theme**: Disaster Management
- **Category**: Software
- **Team**: Pheonix (Team ID: 50)

---

## Overview

OceanTwin is a high-performance, web-based interactive 3D digital twin platform that harmonizes ocean numerical model outputs (ROMS, HYCOM) with real-time in-situ observations (INCOIS Argo Profiling Floats, Autonomous Underwater Gliders, CTD casts, and satellite imagery).

The platform bridges the gap between simulated hydrodynamic models and real-world marine telemetry, enabling ocean forecasters, disaster management agencies, marine scientists, and fisheries authorities to explore, compare, analyze, and decide rapidly.

---

## Features

- **Master 3D Digital Twin Globe (Three.js WebGL)**:
  - Photorealistic 3D Earth projection with atmospheric rim scattering.
  - Dynamic Sea Surface Temperature (SST) color mapping (18°C to 34°C Jet/Turbo scale) covering the Indian Ocean, Bay of Bengal, and Arabian Sea.
  - Animated ocean current stream vectors and particle flow simulation illustrating monsoon gyres and equatorial drift.
  - Real-time in-situ Argo float markers with radar beacons and historical trajectory path lines.
  - Interactive Buoy telemetry card for `INCOIS-BOB-023` (13.15° N, 88.67° E, 29.2 °C, 34.7 PSU, 50 m depth).
  - Floating glassmorphism controls: Layer toggles (SST, Salinity, Currents, SSH, Waves, DO), Depth level slider (0–1000m), and visualization modes.
- **Model vs Observation Overview Panel**:
  - Live KPI cards: Overall Accuracy (87%), Temperature RMSE (1.35 °C), Synchronized Data Points (1,248), Active Buoys (36).
  - Regional accuracy progress breakdown (Arabian Sea 89%, Bay of Bengal 84%, Indian Ocean South 86%, Western Pacific 90%, Global Ocean 87%).
  - Multi-hazard alert feed (high deviation warning, data gaps, model ingestion updates).
- **3D Ocean Explorer (Card 1)**:
  - Bathymetric depth-sliced Indian Ocean basin view.
  - Vertical depth level selectors (0m to 6000m).
  - Measurement, region selection, and rotation toolbars.
- **Model vs Observation Comparison (Card 2)**:
  - Side-by-side numerical comparison between ROMS model and Buoy observations with highlighted temperature difference (`+1.2 °C`).
  - Oceanographic Inverted Depth Profile Chart (Chart.js) charting 0m to 1000m depth vs Temperature curves with realistic thermocline behavior.
- **AI Anomaly Detection & Insights (Card 3)**:
  - Thermal anomaly radar heatmap in the Bay of Bengal & Andaman Sea with concentric deviation rings.
  - AI diagnostic card identifying root causes (*Strong ocean current*, *Upwelling event*, *Model limitation*) with 92% confidence score.
  - Deep-dive diagnostic modal with physical mechanism attribution and actionable dispatch protocols.
- **Comprehensive View Tabs**:
  - `Dashboard`: Master dashboard featuring the 3D Digital Twin Globe, Ocean Explorer, Comparison, and Anomaly cards.
  - `3D Globe`: Dedicated full-window 3D digital twin explorer.
  - `Data Explorer`: Multi-source tabular query tool for NetCDF4 grids and CSV in-situ observations.
  - `Comparison`: Model validation lab with scatter correlation plots, RMSE profiles, and multi-buoy inspection.
  - `Alerts`: Disaster management early warning center for cyclone pre-conditioning and marine heatwaves.
  - `Reports`: Automated oceanographic bulletin and validation report generator with PDF/print export.
  - `REST API Docs`: In-app interactive documentation explorer with cURL generators and live endpoint testing.
- **Standards-Compliant API Documentation**:
  - Interactive Swagger UI at `/docs` with live execution and schema models.
  - Formatted ReDoc specification at `/redoc`.
  - Machine-readable OpenAPI 3.1 specification at `/openapi.json`.

---

## Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, Vite, Three.js (WebGL), Chart.js, react-chartjs-2, Tailwind CSS, Lucide Icons |
| **Backend** | Python 3.12, FastAPI, Uvicorn, CORS Middleware, Pydantic |
| **Data Processing** | xarray, NetCDF4, NumPy, Pandas |
| **Data Formats** | NetCDF4 (`.nc4`), In-situ CSVs (Argo, Gliders, MODIS), RESTful JSON |

---

## How to Run

### Option 1: Unified Single-Command Runner (Full Stack)

Run the Python runner from the workspace root:

```bash
python3 run.py
```

Then open your browser at:
- **Web Application**: `http://localhost:8080`
- **FastAPI Interactive Docs**: `http://localhost:8080/docs`

### Option 2: Run Backend & Frontend in Development Mode

**1. Start the FastAPI Backend**:
```bash
python3 -m uvicorn main:app --app-dir backend --host 0.0.0.0 --port 8080 --reload
```

```bash
cd frontend
npm run dev
```
Open `http://localhost:5173`. Vite proxies `/api` requests to `http://localhost:8080`.

---


```
sih2026/
├── backend/
│   ├── config.py              # Path configurations & limits
│   ├── data_loader.py         # NetCDF & CSV ingestion with xarray/pandas
│   ├── main.py                # FastAPI REST endpoints & static mounting
│   └── requirements.txt       # Python dependencies
├── frontend/
│   ├── dist/                  # Production build assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx             # Top bar with tabs, time badge, theme toggle
│   │   │   ├── GlobeView.jsx          # 3D WebGL Globe, thermal overlay, flow particles
│   │   │   ├── OceanExplorerCard.jsx  # 3D Ocean Explorer with depth pills & bathymetry
│   │   │   ├── ComparisonCard.jsx     # Model vs Obs stats & Inverted Depth Chart
│   │   │   ├── AnomalyCard.jsx        # AI Anomaly radar & diagnostic card
│   │   │   ├── DataExplorerView.jsx   # NetCDF/CSV tabular data explorer
│   │   │   ├── ComparisonLabView.jsx  # Scatter correlation & depth profile lab
│   │   │   ├── AlertsCenterView.jsx   # Disaster management alerts dashboard
│   │   │   ├── ReportsView.jsx        # Validation bulletin generator
│   │   │   └── Footer.jsx             # Footer with SIH credits
│   │   ├── services/
│   │   │   └── api.js                 # API client with automatic graceful fallbacks
│   │   ├── App.jsx                    # Master application coordinator
│   │   ├── index.css                  # Glassmorphism, animations & Tailwind styles
│   │   └── main.jsx                   # React DOM root
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── run.py                     # Unified full-stack application launcher
├── t3z_2026.nc4               # Model temperature NetCDF
├── s3z_2026.nc4               # Model salinity NetCDF
├── u3z_2026.nc4               # Model zonal current NetCDF
├── v3z_2026.nc4               # Model meridional current NetCDF
├── argo_clean.csv             # Cleaned Argo profiling float telemetry
├── glider_clean.csv           # Cleaned autonomous underwater glider data
├── currents_clean.csv         # Cleaned ocean current vector data
├── salinity_clean.csv         # Cleaned model salinity data
├── temperature_clean.csv      # Cleaned model temperature data
└── chlorophyll_clean.csv      # Cleaned MODIS satellite chlorophyll data
```

