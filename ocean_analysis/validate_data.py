import pandas as pd
import os

BASE = r"A:\sih2026"

files = {
    "Argo": "argo_clean.csv",
    "Glider": "glider_clean.csv",
    "Temperature": "temperature_clean.csv",
    "Salinity": "salinity_clean.csv",
    "Currents": "currents_clean.csv",
    "Chlorophyll": "chlorophyll_clean.csv"
}

print("=" * 60)
print("SIH OCEAN DATA VALIDATION")
print("=" * 60)

for name, filename in files.items():

    path = os.path.join(BASE, filename)

    print(f"\n--- {name} ---")

    if not os.path.exists(path):
        print("❌ FILE NOT FOUND")
        continue

    df = pd.read_csv(path)

    print("File:", filename)
    print("Rows:", len(df))
    print("Columns:", list(df.columns))

    # Missing values
    missing = df.isna().sum().sum()

    print("Missing values:", missing)

    # Coordinate validation
    lat_columns = [
        c for c in df.columns
        if c.lower() in ["lat", "latitude"]
    ]

    lon_columns = [
        c for c in df.columns
        if c.lower() in ["lon", "longitude"]
    ]

    if lat_columns:
        lat = pd.to_numeric(
            df[lat_columns[0]],
            errors="coerce"
        )

        print(
            "Latitude range:",
            lat.min(),
            "to",
            lat.max()
        )

    if lon_columns:
        lon = pd.to_numeric(
            df[lon_columns[0]],
            errors="coerce"
        )

        print(
            "Longitude range:",
            lon.min(),
            "to",
            lon.max()
        )

    print("✅ Read successfully")

print("\n" + "=" * 60)
print("VALIDATION COMPLETE")
print("=" * 60)