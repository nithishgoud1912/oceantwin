# Ocean Visualization Backend

FastAPI backend for the NetCDF model outputs and cleaned observation CSVs in the project root. The catalog inspects files at startup, discovers variables and metadata with xarray/pandas, and reads model subsets per request.

## Setup

From `A:\\sih2026\\backend`:

```powershell
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The API is at `http://127.0.0.1:8000`; Swagger is `/docs` and ReDoc is `/redoc`.

## Endpoints

- `GET /`, `/api/health`, `/api/datasets`, `/api/variables`
- `GET /api/variables/{variable}` for model-variable metadata
- `GET /api/ocean/{variable}?lat_min=5&lat_max=20&lon_min=70&lon_max=90&depth=0&max_points=5000`
- `GET /api/observations/argo` and `/api/observations/glider`
- `GET /api/observations/argo/{PLATFORM_NUMBER}`; the glider CSV has no identifier column, so its id route reports a useful 404
- `GET /api/profile?variable=water_temp&latitude=15&longitude=80`
- `GET /api/model-vs-observation`

Responses are capped at 10,000 points. Malformed individual datasets are reported in metadata without preventing the service from starting.
