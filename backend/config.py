from pathlib import Path
import os

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = Path(os.environ.get('OCEANTWIN_DATA_DIR', PROJECT_ROOT)).resolve()
MAX_RESPONSE_POINTS = 10_000
DEFAULT_RESPONSE_POINTS = 5_000

DATASET_PATHS = {
    "argo": PROJECT_ROOT / "argo_clean.csv",
    "glider": PROJECT_ROOT / "glider_clean.csv",
    "temperature": PROJECT_ROOT / "temperature_clean.csv",
    "salinity": PROJECT_ROOT / "salinity_clean.csv",
    "currents": PROJECT_ROOT / "currents_clean.csv",
    "chlorophyll": PROJECT_ROOT / "chlorophyll_clean.csv",
}
NETCDF_DIRECTORY = PROJECT_ROOT
NETCDF_PATTERN = "*.nc4"
