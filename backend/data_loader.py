from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import xarray as xr

from config import DATASET_PATHS, MAX_RESPONSE_POINTS, NETCDF_DIRECTORY, NETCDF_PATTERN


def _json_value(value: Any) -> Any:
    if isinstance(value, np.ndarray) and value.ndim == 0:
        value = value.item()
    if isinstance(value, (np.integer, np.floating)):
        value = value.item()
    if isinstance(value, (np.datetime64, pd.Timestamp)):
        return pd.Timestamp(value).isoformat()
    if pd.isna(value):
        return None
    return value


def _safe_min_max(values: Any) -> tuple[Any, Any]:
    try:
        array = np.asarray(values)
        if np.issubdtype(array.dtype, np.number):
            array = array[np.isfinite(array)]
        if array.size == 0:
            return None, None
        return _json_value(array.min()), _json_value(array.max())
    except (TypeError, ValueError):
        return None, None


def _sample_indices(size: int, max_points: int) -> np.ndarray:
    if size <= max_points:
        return np.arange(size)
    return np.linspace(0, size - 1, max_points, dtype=int)


def _records(frame: pd.DataFrame, max_points: int) -> list[dict[str, Any]]:
    if len(frame) > max_points:
        frame = frame.iloc[_sample_indices(len(frame), max_points)]
    frame = frame.replace({np.nan: None})
    return [{str(key): _json_value(value) for key, value in row.items()} for row in frame.to_dict(orient="records")]


def _variable_metadata(variable: xr.DataArray) -> dict[str, Any]:
    minimum, maximum = _safe_min_max(variable.values)
    return {
        "name": variable.name,
        "dimensions": list(variable.dims),
        "shape": list(variable.shape),
        "dtype": str(variable.dtype),
        "units": variable.attrs.get("units"),
        "minimum": minimum,
        "maximum": maximum,
    }


class DataCatalog:
    def __init__(self) -> None:
        self.netcdf_files = sorted(NETCDF_DIRECTORY.glob(NETCDF_PATTERN))
        self.csv_files = {name: path for name, path in DATASET_PATHS.items() if path.exists()}
        self.netcdf_variables: dict[str, Path] = {}
        self.netcdf_metadata: dict[str, dict[str, Any]] = {}
        self.csv_metadata: dict[str, dict[str, Any]] = {}
        self._inspect_files()

    def _inspect_files(self) -> None:
        for path in self.netcdf_files:
            try:
                with xr.open_dataset(path, decode_times=True) as dataset:
                    for name, variable in dataset.data_vars.items():
                        self.netcdf_variables[name] = path
                        self.netcdf_metadata[name] = _variable_metadata(variable)
            except Exception:
                continue
        for name, path in self.csv_files.items():
            try:
                sample = pd.read_csv(path, nrows=10_000, low_memory=False)
                self.csv_metadata[name] = {
                    "name": name,
                    "format": "csv",
                    "path": path.name,
                    "columns": list(sample.columns),
                    "sample_rows": len(sample),
                    "dtypes": {column: str(dtype) for column, dtype in sample.dtypes.items()},
                }
            except Exception:
                continue

    def datasets(self) -> list[dict[str, Any]]:
        result = []
        for path in self.netcdf_files:
            try:
                with xr.open_dataset(path, decode_times=True) as dataset:
                    result.append({"name": path.stem, "format": "netcdf", "path": path.name,
                                   "dimensions": {key: int(value) for key, value in dataset.sizes.items()},
                                   "variables": list(dataset.data_vars), "coordinates": list(dataset.coords),
                                   "attributes": {key: _json_value(value) for key, value in dataset.attrs.items()}})
            except Exception as exc:
                result.append({"name": path.stem, "format": "netcdf", "path": path.name, "error": str(exc)})
        result.extend(self.csv_metadata.values())
        return result

    def variables(self) -> list[dict[str, Any]]:
        result = [dict(metadata, source="netcdf", dataset=self.netcdf_variables[name].name)
                  for name, metadata in self.netcdf_metadata.items()]
        result.extend(dict(metadata, source="csv", dataset=name) for name, metadata in self.csv_metadata.items())
        return result

    def resolve_variable(self, requested: str) -> tuple[str, Path]:
        aliases = {"temperature": "water_temp", "temp": "water_temp", "u": "water_u",
                   "v": "water_v", "current_u": "water_u", "current_v": "water_v"}
        actual = aliases.get(requested.lower(), requested)
        if actual not in self.netcdf_variables:
            raise KeyError(requested)
        return actual, self.netcdf_variables[actual]

    def ocean_data(self, requested: str, filters: dict[str, Any], max_points: int) -> dict[str, Any]:
        actual, path = self.resolve_variable(requested)
        with xr.open_dataset(path, decode_times=True) as dataset:
            variable = dataset[actual]
            for coordinate in ("time", "depth"):
                value = filters.get(coordinate)
                if value is not None and coordinate in variable.coords:
                    variable = variable.sel({coordinate: value}, method="nearest")
            for coordinate, low_key, high_key in (("lat", "lat_min", "lat_max"), ("lon", "lon_min", "lon_max"), ("depth", "depth_min", "depth_max")):
                if coordinate in variable.coords:
                    low, high = filters.get(low_key), filters.get(high_key)
                    if low is not None:
                        variable = variable.where(variable[coordinate] >= low, drop=True)
                    if high is not None:
                        variable = variable.where(variable[coordinate] <= high, drop=True)
            singleton_dimensions = {dimension: 0 for dimension in variable.dims if variable.sizes[dimension] == 1}
            if singleton_dimensions:
                variable = variable.isel(singleton_dimensions, drop=True)
            while variable.ndim > 2:
                largest = max(variable.dims, key=lambda dim: variable.sizes[dim])
                variable = variable.isel({largest: _sample_indices(variable.sizes[largest], max_points)})
            frame = variable.to_dataframe(name=actual).reset_index().dropna(subset=[actual])
            return {"variable": actual, "metadata": self.netcdf_metadata[actual], "count": len(frame), "data": _records(frame, max_points)}

    def observation_data(self, dataset_name: str, max_points: int, identifier: str | None = None) -> dict[str, Any]:
        if dataset_name not in self.csv_files:
            raise FileNotFoundError(dataset_name)
        frame = read_csv(dataset_name)
        if identifier is not None:
            id_column = next((column for column in ("PLATFORM_NUMBER", "platform_number", "id", "ID") if column in frame.columns), None)
            if id_column is None:
                raise KeyError(f"No identifier column exists in {dataset_name}")
            frame = frame[frame[id_column].astype(str) == str(identifier)]
            if frame.empty:
                raise KeyError(identifier)
        return {"dataset": dataset_name, "count": len(frame), "columns": list(frame.columns), "data": _records(frame, max_points)}

    def profile(self, variable: str, latitude: float, longitude: float, max_points: int) -> dict[str, Any]:
        actual, path = self.resolve_variable(variable)
        with xr.open_dataset(path, decode_times=True) as dataset:
            selected = dataset[actual].sel(lat=latitude, lon=longitude, method="nearest")
            if "depth" not in selected.dims:
                selected = selected.expand_dims(depth=[float(dataset.depth.values[0])] if "depth" in dataset.coords else [0.0])
            frame = selected.to_dataframe(name=actual).reset_index().dropna(subset=[actual])
            return {"variable": actual, "latitude": _json_value(selected.lat.values), "longitude": _json_value(selected.lon.values), "data": _records(frame, max_points)}

    def value_at(self, variable: str, latitude: float, longitude: float, depth: float, time: str | None) -> Any:
        actual, path = self.resolve_variable(variable)
        with xr.open_dataset(path, decode_times=True) as dataset:
            selected = dataset[actual].sel(lat=latitude, lon=longitude, method="nearest")
            if "depth" in selected.coords:
                selected = selected.sel(depth=depth, method="nearest")
            if time is not None and "time" in selected.coords:
                selected = selected.sel(time=time, method="nearest")
            value = selected.values
            return None if np.asarray(value).size == 0 or not np.isfinite(value).all() else _json_value(np.asarray(value).reshape(-1)[0])


@lru_cache(maxsize=8)
def read_csv(dataset_name: str) -> pd.DataFrame:
    return pd.read_csv(DATASET_PATHS[dataset_name], low_memory=False)


catalog = DataCatalog()
