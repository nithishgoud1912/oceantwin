import xarray as xr
import pandas as pd
import numpy as np

# ============================================================
# HYCOM U/V CURRENT PREPROCESSING
# ============================================================

u_file = r"A:\sih2026\u3z_2026.nc4"
v_file = r"A:\sih2026\v3z_2026.nc4"

output_file = r"A:\sih2026\currents_clean.csv"

print("Opening U-current...")
u_ds = xr.open_dataset(u_file)

print("Opening V-current...")
v_ds = xr.open_dataset(v_file)

u = u_ds["water_u"]
v = v_ds["water_v"]

print("\nU dimensions:")
print(u.dims)
print(u.shape)

print("\nV dimensions:")
print(v.dims)
print(v.shape)

# ============================================================
# REMOVE TIME/DEPTH FROM COORDINATE ALIGNMENT
# ============================================================

print("\nSelecting first time and depth...")

u = u.isel(time=0, depth=0)
v = v.isel(time=0, depth=0)

# ============================================================
# INTERPOLATE V ONTO U GRID
# ============================================================

print("Aligning V-current to U grid...")

v_aligned = v.interp(
    lat=u.lat,
    lon=u.lon,
    method="nearest"
)

# ============================================================
# CALCULATE CURRENT SPEED
# ============================================================

print("Calculating current speed...")

current_speed = np.sqrt(
    u.values ** 2 + v_aligned.values ** 2
)

# ============================================================
# CREATE DATAFRAME DIRECTLY
# ============================================================

print("Creating dataframe...")

lat_values = u.lat.values
lon_values = u.lon.values

lat_grid, lon_grid = np.meshgrid(
    lat_values,
    lon_values,
    indexing="ij"
)

df = pd.DataFrame({
    "lat": lat_grid.ravel(),
    "lon": lon_grid.ravel(),
    "u_current": u.values.ravel(),
    "v_current": v_aligned.values.ravel(),
    "current_speed": current_speed.ravel()
})

# ============================================================
# REMOVE INVALID VALUES
# ============================================================

before = len(df)

df = df.replace(
    [np.inf, -np.inf],
    np.nan
)

df = df.dropna(
    subset=[
        "u_current",
        "v_current"
    ]
)

after = len(df)

print("\nRows before cleaning:", before)
print("Rows after cleaning:", after)
print("Rows removed:", before - after)

# ============================================================
# ADD TIME AS A SINGLE VALUE
# ============================================================

time_value = str(
    u_ds["time"].values[0]
)

df["time"] = time_value

# Arrange columns
df = df[
    [
        "time",
        "lat",
        "lon",
        "u_current",
        "v_current",
        "current_speed"
    ]
]

# ============================================================
# SAVE
# ============================================================

df.to_csv(
    output_file,
    index=False
)

print("\n========================================")
print("CURRENT PROCESSING COMPLETE")
print("========================================")

print("Output:", output_file)
print("Final rows:", len(df))

print("\nColumns:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())

# ============================================================
# CLOSE DATASETS
# ============================================================

u_ds.close()
v_ds.close()