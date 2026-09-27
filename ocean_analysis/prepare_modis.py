import xarray as xr
import pandas as pd
import glob
import os

# ============================================================
# MODIS CHLOROPHYLL-A PREPROCESSING
# ============================================================

input_folder = r"A:\sih2026\arch1"
output_file = r"A:\sih2026\chlorophyll_clean.csv"

# Indian Ocean region
LAT_MIN = 0
LAT_MAX = 30

LON_MIN = 50
LON_MAX = 100

# ------------------------------------------------------------
# Find MODIS files
# ------------------------------------------------------------

files = glob.glob(
    os.path.join(
        input_folder,
        "AQUA_MODIS*.nc"
    )
)

print("MODIS files found:", len(files))

for file in files:
    print(file)

if not files:
    raise FileNotFoundError(
        "No MODIS NetCDF files found."
    )

# ------------------------------------------------------------
# Process each file
# ------------------------------------------------------------

all_data = []

for file in files:

    print("\nOpening:")
    print(file)

    ds = xr.open_dataset(file)

    # --------------------------------------------------------
    # Extract Indian Ocean region
    # --------------------------------------------------------

    region = ds[
        "chlor_a"
    ].sel(
        lat=slice(LAT_MAX, LAT_MIN),
        lon=slice(LON_MIN, LON_MAX)
    )

    print(
        "Region size:",
        region.shape
    )

    # --------------------------------------------------------
    # Convert to DataFrame
    # --------------------------------------------------------

    df = region.to_dataframe(
        name="chlorophyll"
    ).reset_index()

    # --------------------------------------------------------
    # Remove missing values
    # --------------------------------------------------------

    df = df.dropna(
        subset=["chlorophyll"]
    )

    # --------------------------------------------------------
    # Add observation date
    # --------------------------------------------------------

    filename = os.path.basename(file)

    # Extract date from filename
    date = filename.split(".")[1]

    df["date"] = pd.to_datetime(
        date,
        format="%Y%m%d",
        errors="coerce"
    )

    all_data.append(df)

    ds.close()

# ------------------------------------------------------------
# Combine all MODIS dates
# ------------------------------------------------------------

print("\nCombining MODIS datasets...")

final_df = pd.concat(
    all_data,
    ignore_index=True
)

# ------------------------------------------------------------
# Arrange columns
# ------------------------------------------------------------

final_df = final_df[
    [
        "date",
        "lat",
        "lon",
        "chlorophyll"
    ]
]

# ------------------------------------------------------------
# Sort
# ------------------------------------------------------------

final_df = final_df.sort_values(
    by=["date", "lat", "lon"]
)

# ------------------------------------------------------------
# Save
# ------------------------------------------------------------

final_df.to_csv(
    output_file,
    index=False
)

print("\n========================================")
print("MODIS PROCESSING COMPLETE")
print("========================================")

print("Output:")
print(output_file)

print("Total observations:")
print(len(final_df))

print("\nColumns:")
print(final_df.columns.tolist())

print("\nFirst 5 rows:")
print(final_df.head())