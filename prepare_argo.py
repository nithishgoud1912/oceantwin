import pandas as pd

# ============================================================
# ARGO DATA PREPROCESSING
# ============================================================

input_file = r"A:\sih2026\Indian_ARGO_Floats_6746_f575_1fa8.csv"
output_file = r"A:\sih2026\argo_clean.csv"

print("Opening Argo dataset...")

# Read CSV
df = pd.read_csv(
    input_file,
    low_memory=False
)

print("Dataset loaded successfully!")
print("Original rows:", len(df))

# ------------------------------------------------------------
# Select required columns
# ------------------------------------------------------------

required_columns = [
    "PLATFORM_NUMBER",
    "CYCLE_NUMBER",
    "time",
    "latitude",
    "longitude",
    "PRES",
    "TEMP",
    "PSAL"
]

df = df[required_columns]

# ------------------------------------------------------------
# Convert numerical columns
# ------------------------------------------------------------

numeric_columns = [
    "latitude",
    "longitude",
    "PRES",
    "TEMP",
    "PSAL"
]

for column in numeric_columns:
    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )

# ------------------------------------------------------------
# Convert time
# ------------------------------------------------------------

df["time"] = pd.to_datetime(
    df["time"],
    errors="coerce"
)

# ------------------------------------------------------------
# Remove invalid rows
# ------------------------------------------------------------

before = len(df)

df = df.dropna(
    subset=[
        "latitude",
        "longitude",
        "PRES",
        "TEMP",
        "PSAL"
    ]
)

after = len(df)

print("\nRows before cleaning:", before)
print("Rows after cleaning:", after)
print("Rows removed:", before - after)

# ------------------------------------------------------------
# Sort data
# ------------------------------------------------------------

df = df.sort_values(
    by=[
        "PLATFORM_NUMBER",
        "CYCLE_NUMBER",
        "PRES"
    ]
)

# ------------------------------------------------------------
# Save cleaned data
# ------------------------------------------------------------

df.to_csv(
    output_file,
    index=False
)

print("\n========================================")
print("ARGO PROCESSING COMPLETE")
print("========================================")

print("Output:", output_file)
print("Final rows:", len(df))

print("\nColumns:")
print(df.columns.tolist())

print("\nFirst 5 rows:")
print(df.head())