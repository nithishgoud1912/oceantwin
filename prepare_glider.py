import xarray as xr
import pandas as pd
import os

# ============================================================
# GLIDER DATA PREPROCESSING
# ============================================================

# Input Glider NetCDF file
input_file = r"A:\sih2026\archive\bon_glider_june_2021.nc"

# Output file
output_file = r"A:\sih2026\glider_clean.csv"

print("Opening Glider dataset...")
print(input_file)

# ------------------------------------------------------------
# 1. Open NetCDF
# ------------------------------------------------------------

ds = xr.open_dataset(input_file)

print("\nDataset opened successfully!")
print("Total observations:", len(ds.TIME))

# ------------------------------------------------------------
# 2. Select required variables
# ------------------------------------------------------------

df = ds[
    ["TEMP", "PSAL", "CPHL"]
].to_dataframe().reset_index()

# ------------------------------------------------------------
# 3. Keep only required columns
# ------------------------------------------------------------

df = df[
    [
        "TIME",
        "LATITUDE",
        "LONGITUDE",
        "DEPTH",
        "TEMP",
        "PSAL",
        "CPHL"
    ]
]

print("\nRequired variables selected.")

# ------------------------------------------------------------
# 4. Convert numerical columns
# ------------------------------------------------------------

numeric_columns = [
    "LATITUDE",
    "LONGITUDE",
    "DEPTH",
    "TEMP",
    "PSAL",
    "CPHL"
]

for column in numeric_columns:
    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )

# ------------------------------------------------------------
# 5. Remove invalid rows
# ------------------------------------------------------------

print("\nRemoving missing/invalid values...")

before = len(df)

df = df.dropna(
    subset=[
        "LATITUDE",
        "LONGITUDE",
        "DEPTH",
        "TEMP",
        "PSAL"
    ]
)

after = len(df)

print("Rows before cleaning:", before)
print("Rows after cleaning:", after)
print("Rows removed:", before - after)

# ------------------------------------------------------------
# 6. Sort by time and depth
# ------------------------------------------------------------

df = df.sort_values(
    by=["TIME", "DEPTH"]
)

# ------------------------------------------------------------
# 7. Save cleaned dataset
# ------------------------------------------------------------

df.to_csv(
    output_file,
    index=False
)

print("\n========================================")
print("GLIDER PROCESSING COMPLETE")
print("========================================")

print("Output file:")
print(output_file)

print("\nFinal number of observations:", len(df))

print("\nColumns:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())