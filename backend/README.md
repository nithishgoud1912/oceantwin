# OceanTwin backend

Run from the repository root:

```powershell
py -m pip install -r backend\requirements-dev.txt
py -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8080
```

The API discovers NetCDF fields and registered observation tables at startup. Set `OCEANTWIN_DATA_DIR` to another archive. Set `OCEANTWIN_WATCH=1` to refresh periodically. Uploads and adapter registration require `OCEANTWIN_WRITE_TOKEN`; without it, the service is read-only.

Every response is source-backed and includes provenance or an explicit unavailable/error state. The implementation supports rectilinear latitude/longitude grids, bounded reads, Argo pressure-to-depth conversion with TEOS-10, table adapters, WMS 1.1.1 and WCS 1.0.0 subsets, and independent model-observation matching.
