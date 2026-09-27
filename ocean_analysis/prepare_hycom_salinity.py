import xarray as xr
import pandas as pd

# ============================================================
# HYCOM SALINITY PREPROCESSING
# ============================================================

input_file = r"A:\sih2026\s3z_2026.nc4"
output_file = r"A:\sih2026\salinity_clean.csv"

print("Opening HYCOM salinity dataset...")

# Open NetCDF
ds = xr.open_dataset(input_file)

print("Dataset opened successfully!")

# ------------------------------------------------------------
# Select salinity variable
# ------------------------------------------------------------

salinity = ds["salinity"]

# Convert to DataFrame
df = salinity.to_dataframe().reset_index()

print("Original rows:", len(df))

# ------------------------------------------------------------
# Remove missing values
# ------------------------------------------------------------

before = len(df)

df = df.dropna(
    subset=["salinity"]
)

after = len(df)

print("Rows before cleaning:", before)
print("Rows after cleaning:", after)
print("Rows removed:", before - after)

# ------------------------------------------------------------
# Save cleaned dataset
# ------------------------------------------------------------

df.to_csv(
    output_file,
    index=False
)

print("\n========================================")
print("HYCOM SALINITY PROCESSING COMPLETE")
print("========================================")

print("Output:", output_file)
print("Final rows:", len(df))

print("\nColumns:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())