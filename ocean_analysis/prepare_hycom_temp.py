import xarray as xr
import pandas as pd
import os

# ============================================================
# HYCOM TEMPERATURE PREPROCESSING
# ============================================================

input_file = r"A:\sih2026\t3z_2026.nc4"
output_file = r"A:\sih2026\temperature_clean.csv"

print("Opening HYCOM temperature dataset...")

# Open NetCDF
ds = xr.open_dataset(input_file)

print("Dataset opened successfully!")
print(ds)

# ------------------------------------------------------------
# Select temperature variable
# ------------------------------------------------------------

temp = ds["water_temp"]

# Convert to DataFrame
df = temp.to_dataframe().reset_index()

# ------------------------------------------------------------
# Remove missing values
# ------------------------------------------------------------

before = len(df)

df = df.dropna(
    subset=["water_temp"]
)

after = len(df)

print("\nRows before cleaning:", before)
print("Rows after cleaning:", after)
print("Rows removed:", before - after)

# ------------------------------------------------------------
# Rename variable
# ------------------------------------------------------------

df = df.rename(
    columns={
        "water_temp": "temperature"
    }
)

# ------------------------------------------------------------
# Save
# ------------------------------------------------------------

df.to_csv(
    output_file,
    index=False
)

print("\n========================================")
print("HYCOM TEMPERATURE PROCESSING COMPLETE")
print("========================================")

print("Output:", output_file)
print("Final rows:", len(df))

print("\nColumns:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())
