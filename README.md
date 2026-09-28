# OceanTwin

OceanTwin is a browser-based viewer for archived ocean model grids and instrument observations. It reads the files that are actually present, keeps timestamps and missing cells visible, and does not invent forecasts, accuracy scores, alerts, or live-feed status.

## Start here (Windows)

Open PowerShell in this folder and run:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r backend\requirements-dev.txt
py run.py
```

Open http://127.0.0.1:8080. API documentation is at http://127.0.0.1:8080/docs. Stop the server with `Ctrl+C`.

The archive contains HYCOM-style NetCDF grids (`t3z_2026.nc4`, `s3z_2026.nc4`, `u3z_2026.nc4`, `v3z_2026.nc4`), Argo and glider tables, and three MODIS chlorophyll files. The model snapshots and observations have different dates, so comparison correctly reports “unavailable” when no independent records meet its time, distance, depth, unit, and quality limits.

## What the pages do

Explore selects a dataset, timestamp, depth, geographic region, palette, numeric range, linear/log scale, opacity and vertical exaggeration. The globe uses source grid cells. Volume uses source voxels; isosurfaces use marching tetrahedra and omit cells containing missing values. Instrument markers, tracks and profiles retain their historical timestamps. Current arrows appear only when U and V share a timestamp, depth and declared metres-per-second units.

Data provides bounded table searches, pagination and CSV export of the displayed page. Ingestion is read-only unless the server administrator sets `OCEANTWIN_WRITE_TOKEN`. Uploads go under `incoming/`, are validated, and are never used to overwrite an existing filename. A table can be registered with a JSON column adapter; `sources.example.json` is a copyable example. Learn explains the controls and the difference between a model estimate and an observation.

## Source preparation

`ocean_analysis/ingest.py` is the portable converter. It refuses to overwrite output and writes a provenance JSON beside it:

```powershell
py ocean_analysis\ingest.py modis --input arch1 --output incoming\modis_indian_ocean_v2.nc
py ocean_analysis\ingest.py grid --input t3z_2026.nc4 --variable water_temp --output incoming\temperature_export_v2.csv
py ocean_analysis\ingest.py currents --input u3z_2026.nc4 --v-input v3z_2026.nc4 --output incoming\currents_v2.csv
```

The older `prepare_*.py` files now call this converter; they no longer contain machine-specific `A:\sih2026` paths or silently choose the first current timestamp.

## Checks

```powershell
py -m pytest backend\tests -q --basetemp .audit\test-run
cd frontend
npm ci
node --test src\science.test.js
npm run build
```

The API exposes scoped WMS 1.1.1 and WCS 1.0.0 endpoints under `/ogc/wms` and `/ogc/wcs`. They support rectilinear EPSG:4326 grids and bounded NetCDF/PNG requests; they are an interoperability subset, not full OGC certification. Curvilinear grids, operational feeds, air-gap certification and live INCOIS credentials remain deployment work.

## Project map

`backend/scientific_data.py` is the source catalog, coordinate normalizer, observation adapter, profile reader and independent comparison engine. `backend/main.py` exposes the REST API and protected ingestion. `backend/ogc.py` contains the standards subsets. `frontend/src/ScientificApp.jsx` is the workbench, `frontend/src/components/ScientificScene.jsx` is the Three.js renderer, and `frontend/src/science.js` contains tested colour, projection and isosurface math. `backend/tests/` and `frontend/src/science.test.js` are executable acceptance checks.
