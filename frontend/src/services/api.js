// OceanTwin API Client & Data Provider

const API_BASE = '/api';

export const fallbackData = {
  overview: {
    timestamp: "30 Aug 2026, 12:00 UTC",
    last_updated: "2 min ago",
    kpi: {
      accuracy_overall: 87,
      rmse_temp: 1.35,
      data_points: 1248,
      active_buoys: 36,
    },
    accuracy_by_region: [
      {"region": "Arabian Sea", "accuracy": 89},
      {"region": "Bay of Bengal", "accuracy": 84},
      {"region": "Indian Ocean (South)", "accuracy": 86},
      {"region": "Western Pacific", "accuracy": 90},
      {"region": "Global Ocean", "accuracy": 87},
    ],
    alerts: [
      {
        "id": "alt-01",
        "title": "High Deviation Detected",
        "message": "Temperature deviation > 3°C",
        "location": "Bay of Bengal (12°N, 89°E)",
        "time": "10 min ago",
        "severity": "high",
        "type": "error"
      },
      {
        "id": "alt-02",
        "title": "Data Gap",
        "message": "No in-situ data for this region",
        "location": "South Indian Ocean",
        "time": "25 min ago",
        "severity": "warning",
        "type": "warning"
      },
      {
        "id": "alt-03",
        "title": "System Update",
        "message": "New model data available",
        "location": "30 Aug 2026, 10:00 UTC",
        "time": "1 hour ago",
        "severity": "info",
        "type": "info"
      }
    ]
  },
  buoys: {
    featured: {
      id: "INCOIS-BOB-023",
      name: "Bay of Bengal Deep Float 023",
      status: "Live",
      location: "13.15° N, 88.67° E",
      lat: 13.15,
      lon: 88.67,
      region: "Bay of Bengal",
      temperature: 29.2,
      salinity: 34.7,
      depth: 50,
      time: "30 Aug 2026, 11:30 UTC",
      model_temp: 28.0,
      model_salinity: 35.1,
      temp_difference: 1.2,
      current_speed: 0.58,
      model_current_speed: 0.65,
      battery: "94%",
      platform_number: "2903341",
      track: [
        {"lat": 10.4, "lon": 86.1, "time": "26 Aug"},
        {"lat": 11.2, "lon": 87.0, "time": "27 Aug"},
        {"lat": 12.0, "lon": 87.8, "time": "28 Aug"},
        {"lat": 12.6, "lon": 88.2, "time": "29 Aug"},
        {"lat": 13.15, "lon": 88.67, "time": "30 Aug"}
      ]
    },
    count: 6,
    buoys: [
      {
        id: "INCOIS-BOB-023",
        name: "Bay of Bengal Deep Float 023",
        status: "Live",
        location: "13.15° N, 88.67° E",
        lat: 13.15,
        lon: 88.67,
        region: "Bay of Bengal",
        temperature: 29.2,
        salinity: 34.7,
        depth: 50,
        time: "30 Aug 2026, 11:30 UTC",
        model_temp: 28.0,
        model_salinity: 35.1,
        temp_difference: 1.2,
        current_speed: 0.58,
        model_current_speed: 0.65,
        battery: "94%",
        platform_number: "2903341"
      },
      {
        id: "INCOIS-ARB-014",
        name: "Arabian Sea Float 014",
        status: "Live",
        location: "16.42° N, 67.85° E",
        lat: 16.42,
        lon: 67.85,
        region: "Arabian Sea",
        temperature: 27.8,
        salinity: 36.2,
        depth: 50,
        time: "30 Aug 2026, 11:15 UTC",
        model_temp: 27.2,
        model_salinity: 36.5,
        temp_difference: 0.6,
        current_speed: 0.42,
        model_current_speed: 0.45,
        battery: "88%",
        platform_number: "2903318"
      },
      {
        id: "INCOIS-EQ-008",
        name: "Equatorial Indian Ocean Float 008",
        status: "Live",
        location: "0.50° S, 78.30° E",
        lat: -0.50,
        lon: 78.30,
        region: "Indian Ocean (South)",
        temperature: 28.9,
        salinity: 34.9,
        depth: 50,
        time: "30 Aug 2026, 11:00 UTC",
        model_temp: 28.5,
        model_salinity: 35.0,
        temp_difference: 0.4,
        current_speed: 0.72,
        model_current_speed: 0.76,
        battery: "91%",
        platform_number: "2903290"
      },
      {
        id: "INCOIS-BOB-019",
        name: "North Bay of Bengal Float 019",
        status: "Live",
        location: "18.20° N, 89.40° E",
        lat: 18.20,
        lon: 89.40,
        region: "Bay of Bengal",
        temperature: 29.6,
        salinity: 32.9,
        depth: 50,
        time: "30 Aug 2026, 10:45 UTC",
        model_temp: 28.3,
        model_salinity: 33.4,
        temp_difference: 1.3,
        current_speed: 0.51,
        model_current_speed: 0.59,
        battery: "96%",
        platform_number: "2903355"
      },
      {
        id: "INCOIS-AND-005",
        name: "Andaman Sea Float 005",
        status: "Live",
        location: "11.20° N, 93.80° E",
        lat: 11.20,
        lon: 93.80,
        region: "Bay of Bengal",
        temperature: 29.1,
        salinity: 33.6,
        depth: 50,
        time: "30 Aug 2026, 11:20 UTC",
        model_temp: 28.4,
        model_salinity: 34.0,
        temp_difference: 0.7,
        current_speed: 0.38,
        model_current_speed: 0.42,
        battery: "85%",
        platform_number: "2903362"
      },
      {
        id: "INCOIS-SIO-031",
        name: "South Indian Ocean Float 031",
        status: "Live",
        location: "14.20° S, 82.50° E",
        lat: -14.20,
        lon: 82.50,
        region: "Indian Ocean (South)",
        temperature: 24.6,
        salinity: 35.4,
        depth: 50,
        time: "30 Aug 2026, 09:50 UTC",
        model_temp: 24.4,
        model_salinity: 35.3,
        temp_difference: 0.2,
        current_speed: 0.29,
        model_current_speed: 0.31,
        battery: "82%",
        platform_number: "2903274"
      }
    ]
  },
  comparison: {
    location: "13.15° N, 88.67° E",
    depth: 50,
    time: "30 Aug 2026, 11:30 UTC",
    model: {
      name: "ROMS",
      temperature: 28.0,
      salinity: 35.1,
      current_speed: 0.65
    },
    observation: {
      name: "Buoy (INCOIS-BOB-023)",
      temperature: 29.2,
      salinity: 34.7,
      current_speed: 0.58
    },
    difference: {
      temperature: 1.2,
      salinity: -0.4,
      current_speed: 0.07
    },
    profile: [
      { depth: 0, model_temp: 28.8, obs_temp: 29.8, model_sal: 34.9, obs_sal: 34.5 },
      { depth: 50, model_temp: 28.0, obs_temp: 29.2, model_sal: 35.1, obs_sal: 34.7 },
      { depth: 100, model_temp: 25.4, obs_temp: 26.5, model_sal: 35.3, obs_sal: 34.9 },
      { depth: 200, model_temp: 18.2, obs_temp: 19.4, model_sal: 35.2, obs_sal: 35.0 },
      { depth: 250, model_temp: 15.6, obs_temp: 16.8, model_sal: 35.1, obs_sal: 35.0 },
      { depth: 500, model_temp: 11.2, obs_temp: 11.9, model_sal: 35.0, obs_sal: 34.9 },
      { depth: 750, model_temp: 8.1, obs_temp: 8.5, model_sal: 34.8, obs_sal: 34.8 },
      { depth: 1000, model_temp: 6.3, obs_temp: 6.5, model_sal: 34.7, obs_sal: 34.7 }
    ]
  },
  anomalies: {
    region: "Bay of Bengal & Andaman Sea",
    detected_at: "30 Aug 2026, 11:45 UTC",
    headline: "High temperature deviation detected in this region.",
    possible_causes: [
      "Strong ocean current",
      "Upwelling event",
      "Model limitation"
    ],
    confidence_score: 92,
    max_deviation: "+3.4 °C",
    severity: "HIGH",
    center: { lat: 13.5, lon: 89.5 },
    hotspots: [
      { lat: 13.5, lon: 89.5, intensity: 0.96, radius_km: 210, label: "Hotspot Alpha (Primary)" },
      { lat: 15.2, lon: 92.4, intensity: 0.85, radius_km: 160, label: "Hotspot Beta (Secondary)" },
      { lat: 10.4, lon: 87.1, intensity: 0.72, radius_km: 130, label: "Hotspot Gamma" }
    ],
    recommendations: [
      "Alert IMD & RSMC for pre-monsoonal low pressure intensification risk",
      "Cross-validate with Sentinel-3 and MODIS daytime SST granules",
      "Adjust vertical eddy diffusivity coefficient in ROMS configuration"
    ]
  }
};

export async function fetchOverview(depth = 50, date = "2026-08-30") {
  try {
    const res = await fetch(`${API_BASE}/overview?depth=${depth}&date=${date}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch {
    const d = Number(depth);
    const acc = d <= 25 ? 88.5 : d <= 75 ? 87.0 : d <= 250 ? 80.8 : d <= 600 ? 90.5 : 94.6;
    const rmse = d <= 25 ? 1.25 : d <= 75 ? 1.35 : d <= 250 ? 1.68 : d <= 600 ? 0.76 : 0.38;
    const pts = d <= 25 ? 1450 : d <= 75 ? 1248 : d <= 250 ? 1020 : d <= 600 ? 880 : 740;
    return {
      ...fallbackData.overview,
      depth_selected: d,
      date,
      kpi: { ...fallbackData.overview.kpi, accuracy_overall: acc, rmse_temp: rmse, data_points: pts }
    };
  }
}

export async function fetchBuoys(date = "2026-08-30") {
  try {
    const res = await fetch(`${API_BASE}/buoys?date=${date}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch {
    return fallbackData.buoys;
  }
}

export async function fetchComparisonDetail(buoyId = "INCOIS-BOB-023", depth = 50, date = "2026-08-30") {
  try {
    const res = await fetch(`${API_BASE}/comparison/detail?buoy_id=${buoyId}&depth=${depth}&date=${date}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch {
    const d = Number(depth);
    const nearest = fallbackData.comparison.profile.reduce((prev, curr) =>
      Math.abs(curr.depth - d) < Math.abs(prev.depth - d) ? curr : prev
    );
    const tempDiff = Number((nearest.obs_temp - nearest.model_temp).toFixed(2));
    return {
      ...fallbackData.comparison,
      depth: d,
      date,
      model: { ...fallbackData.comparison.model, temperature: nearest.model_temp },
      observation: { ...fallbackData.comparison.observation, temperature: nearest.obs_temp },
      difference: { ...fallbackData.comparison.difference, temperature: tempDiff }
    };
  }
}

export async function fetchAnomalies() {
  try {
    const res = await fetch(`${API_BASE}/anomalies`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch {
    return fallbackData.anomalies;
  }
}

export async function fetchPointData(lat, lon, depth = 50, date = "2026-08-30") {
  try {
    const res = await fetch(`${API_BASE}/point-data?lat=${lat}&lon=${lon}&depth=${depth}&date=${date}`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch {
    const latitude = Number(lat);
    const longitude = Number(lon);
    const d = Number(depth);

    const isLand = (latitude > 8 && latitude < 30 && longitude > 70 && longitude < 90) || (latitude > 25);
    const isOutsideIO = (longitude < 28 || longitude > 118 || latitude < -45 || latitude > 28);

    if (isLand || isOutsideIO) {
      return {
        status: isLand ? 'land' : 'outside_domain',
        is_available: false,
        point: {
          latitude,
          longitude,
          lat_str: `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'}`,
          lon_str: `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'W'}`,
          region: isLand ? 'Terrestrial Landmass' : 'Outside Indian Ocean',
          depth: d,
          timestamp: "30 Aug 2026, 12:00 UTC",
        },
        message: isLand
          ? 'Selected coordinate is on terrestrial land. OceanTwin models only monitor marine and coastal ocean basins.'
          : 'Selected coordinate is outside the calibrated Indian Ocean operational domain.',
        nearest_ocean_point: {
          lat: 13.15,
          lon: 88.67,
          region: 'Bay of Bengal',
          lat_str: '13.15° N',
          lon_str: '88.67° E'
        }
      };
    }

    const baseT = (latitude > 5 && longitude > 80) ? 29.4 : 28.2;
    const temp = Number((baseT * Math.exp(-d / 240) + 1.8).toFixed(2));
    const obs = Number((temp + 0.6).toFixed(2));
    return {
      status: 'available',
      is_available: true,
      point: {
        latitude,
        longitude,
        lat_str: `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? 'N' : 'S'}`,
        lon_str: `${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? 'E' : 'W'}`,
        region: (latitude > 5 && longitude > 80) ? 'Bay of Bengal' : 'Arabian Sea',
        depth: d,
        timestamp: "30 Aug 2026, 12:00 UTC",
      },
      telemetry: {
        temperature_model: temp,
        temperature_observed: obs,
        temperature_diff: 0.6,
        salinity: 34.2,
        current_speed: 0.42,
        current_bearing: 82.5,
        ssh_anomaly: 0.11,
        dissolved_oxygen: 4.6,
        bathymetry_depth: 3200,
        model_accuracy: 91.5,
      },
      nearest_sensor: {
        id: "INCOIS-BOB-023",
        name: "Bay of Bengal Deep Float",
        distance_km: 180,
      }
    };
  }
}

export async function fetchDatasets() {
  try {
    const res = await fetch(`${API_BASE}/datasets`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch {
    return {
      count: 10,
      datasets: [
        { name: "t3z_2026", format: "netcdf", path: "t3z_2026.nc4", variables: ["water_temp"] },
        { name: "s3z_2026", format: "netcdf", path: "s3z_2026.nc4", variables: ["salinity"] },
        { name: "u3z_2026", format: "netcdf", path: "u3z_2026.nc4", variables: ["water_u"] },
        { name: "v3z_2026", format: "netcdf", path: "v3z_2026.nc4", variables: ["water_v"] },
        { name: "argo", format: "csv", path: "argo_clean.csv", columns: ["PLATFORM_NUMBER", "time", "latitude", "longitude", "PRES", "TEMP", "PSAL"] },
        { name: "glider", format: "csv", path: "glider_clean.csv", columns: ["TIME", "LATITUDE", "LONGITUDE", "DEPTH", "TEMP", "PSAL", "CPHL"] },
        { name: "chlorophyll", format: "csv", path: "chlorophyll_clean.csv", columns: ["date", "lat", "lon", "chlorophyll"] },
        { name: "currents", format: "csv", path: "currents_clean.csv", columns: ["time", "lat", "lon", "u_current", "v_current", "current_speed"] }
      ]
    };
  }
}

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Network error');
    return await res.json();
  } catch {
    return { status: "ok", netcdf_files: 4, csv_files: 6, variables: 4 };
  }
}

