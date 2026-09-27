import React, { useState } from 'react';
import {
  Code,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  Send,
  Database,
  Layers,
  Activity,
  Radio,
  Compass,
  FileCode,
  Sparkles
} from 'lucide-react';

export default function ApiDocsView() {
  const [copiedId, setCopiedId] = useState(null);
  const [activeEndpointId, setActiveEndpointId] = useState('overview');
  const [liveResponse, setLiveResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const executeLiveCall = async (path) => {
    setIsLoading(true);
    try {
      const res = await fetch(path);
      const data = await res.json();
      setLiveResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setLiveResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const endpointCategories = [
    {
      category: 'Validation & Comparison',
      icon: Activity,
      endpoints: [
        {
          id: 'overview',
          method: 'GET',
          path: '/api/overview',
          title: 'Dashboard Overview KPIs',
          description: 'Fetches real-time accuracy metrics (87%), temperature RMSE (1.35°C), active buoys (36), regional accuracy, and disaster alerts.',
          responseExample: {
            timestamp: "30 Aug 2026, 12:00 UTC",
            last_updated: "2 min ago",
            kpi: { accuracy_overall: 87.0, rmse_temp: 1.35, data_points: 1248, active_buoys: 36 },
            accuracy_by_region: [
              { region: "Arabian Sea", accuracy: 89 },
              { region: "Bay of Bengal", accuracy: 84 },
              { region: "Indian Ocean (South)", accuracy: 86 }
            ],
            alerts: [{ id: "alt-01", title: "High Deviation Detected", message: "Temperature deviation > 3°C", severity: "high" }]
          }
        },
        {
          id: 'comp_detail',
          method: 'GET',
          path: '/api/comparison/detail?buoy_id=INCOIS-BOB-023',
          title: 'Vertical Profile & Stats Comparison',
          description: 'Fetches side-by-side numerical differences and inverted depth profile curves (0 to 1000m depth) comparing ROMS model vs Buoy observations.',
          params: [{ name: 'buoy_id', type: 'string', default: 'INCOIS-BOB-023', desc: 'Identifier of profiler' }],
          responseExample: {
            location: "13.15° N, 88.67° E",
            depth: 50,
            model: { name: "ROMS", temperature: 28.0, salinity: 35.1, current_speed: 0.65 },
            observation: { name: "Buoy (INCOIS-BOB-023)", temperature: 29.2, salinity: 34.7, current_speed: 0.58 },
            difference: { temperature: 1.2, salinity: -0.4, current_speed: 0.07 },
            profile: [{ depth: 0, model_temp: 28.8, obs_temp: 29.8 }, { depth: 50, model_temp: 28.0, obs_temp: 29.2 }]
          }
        },
        {
          id: 'model_vs_obs',
          method: 'GET',
          path: '/api/model-vs-observation?variable=temperature&latitude=13.15&longitude=88.67&depth=50.0',
          title: 'Point-by-Point Spatial Validation',
          description: 'Calculates Euclidean nearest match between numerical model array and in-situ observed CTD record.',
          params: [
            { name: 'variable', type: 'string', desc: 'temperature | salinity' },
            { name: 'latitude', type: 'float', desc: 'Target latitude' },
            { name: 'longitude', type: 'float', desc: 'Target longitude' },
            { name: 'depth', type: 'float', desc: 'Depth in meters' }
          ],
          responseExample: {
            variable: "water_temp",
            model_value: 28.0,
            observed_value: 29.2,
            difference: 1.2,
            percentage_difference: 4.1
          }
        }
      ]
    },
    {
      category: 'Observational Fleet & Buoys',
      icon: Radio,
      endpoints: [
        {
          id: 'buoys',
          method: 'GET',
          path: '/api/buoys',
          title: 'Active In-Situ Float Fleet',
          description: 'Returns active Argo buoys across Indian Ocean, Arabian Sea, and Bay of Bengal with live coordinates, battery, and drift track.',
          responseExample: {
            count: 6,
            featured: {
              id: "INCOIS-BOB-023",
              name: "Bay of Bengal Deep Float 023",
              status: "Live",
              location: "13.15° N, 88.67° E",
              temperature: 29.2,
              salinity: 34.7,
              depth: 50,
              track: [{ lat: 10.4, lon: 86.1 }, { lat: 13.15, lon: 88.67 }]
            }
          }
        },
        {
          id: 'argo_data',
          method: 'GET',
          path: '/api/observations/argo?max_points=500',
          title: 'Cleaned Argo Dataset Query',
          description: 'Queries in-situ CTD profiles from the Indian Ocean ERDDAP archive.',
          params: [{ name: 'max_points', type: 'integer', default: 5000, desc: 'Maximum points to return' }],
          responseExample: { dataset: "argo", count: 500, columns: ["PLATFORM_NUMBER", "time", "latitude", "longitude", "PRES", "TEMP", "PSAL"] }
        },
        {
          id: 'glider_data',
          method: 'GET',
          path: '/api/observations/glider?max_points=500',
          title: 'Autonomous Underwater Glider Telemetry',
          description: 'Fetches high-resolution spatial transects from autonomous ocean gliders.',
          params: [{ name: 'max_points', type: 'integer', default: 5000, desc: 'Sampling limit' }],
          responseExample: { dataset: "glider", count: 500, columns: ["TIME", "LATITUDE", "LONGITUDE", "DEPTH", "TEMP", "PSAL", "CPHL"] }
        }
      ]
    },
    {
      category: 'Ocean Model Grids (NetCDF4)',
      icon: Database,
      endpoints: [
        {
          id: 'ocean_slice',
          method: 'GET',
          path: '/api/ocean/water_temp?depth=50&lat_min=5&lat_max=22&lon_min=60&lon_max=95&max_points=500',
          title: '4D NetCDF Grid Slice',
          description: 'Subsets 4D NetCDF model variables (temperature, salinity, currents) by depth slice and bounding box.',
          params: [
            { name: 'variable', type: 'string', desc: 'water_temp | salinity | water_u | water_v' },
            { name: 'depth', type: 'float', desc: 'Depth in meters (e.g. 50)' },
            { name: 'lat_min / lat_max', type: 'float', desc: 'Latitude bounds' },
            { name: 'lon_min / lon_max', type: 'float', desc: 'Longitude bounds' }
          ],
          responseExample: {
            variable: "water_temp",
            count: 500,
            data: [{ time: "2026-08-30T09:00:00", lat: 13.15, lon: 88.67, depth: 50, water_temp: 28.0 }]
          }
        },
        {
          id: 'streamlines',
          method: 'GET',
          path: '/api/currents/streamlines',
          title: 'Ocean Current Velocity Field',
          description: 'Generates u and v vector fields across the Indian Ocean basin to power 3D dynamic particle streamlines.',
          responseExample: {
            count: 180,
            vectors: [{ lat: 14.0, lon: 88.0, u: 0.42, v: 0.38, speed: 0.566 }]
          }
        }
      ]
    },
    {
      category: 'AI Anomaly Detection & Hazards',
      icon: Sparkles,
      endpoints: [
        {
          id: 'anomalies',
          method: 'GET',
          path: '/api/anomalies',
          title: 'Thermal Anomalies & AI Attribution',
          description: 'Returns AI-detected sea surface temperature spikes, possible physical causes, and confidence score (92%).',
          responseExample: {
            region: "Bay of Bengal & Andaman Sea",
            confidence_score: 92,
            max_deviation: "+3.4 °C",
            severity: "HIGH",
            possible_causes: ["Strong ocean current", "Upwelling event", "Model limitation"],
            hotspots: [{ lat: 13.5, lon: 89.5, intensity: 0.96, radius_km: 210, label: "Hotspot Alpha" }]
          }
        }
      ]
    },
    {
      category: 'System & Discovery',
      icon: Layers,
      endpoints: [
        {
          id: 'health',
          method: 'GET',
          path: '/api/health',
          title: 'System Health & Ingestion Counter',
          description: 'Verifies operational status and reports total indexed NetCDF and CSV datasets.',
          responseExample: { status: "ok", netcdf_files: 4, csv_files: 6, variables: 4 }
        },
        {
          id: 'datasets_list',
          method: 'GET',
          path: '/api/datasets',
          title: 'Catalog Datasets Discovery',
          description: 'Enumerate all NetCDF4 files and in-situ CSV datasets available on local storage.',
          responseExample: { count: 10, datasets: [{ name: "t3z_2026", format: "netcdf" }, { name: "argo", format: "csv" }] }
        }
      ]
    }
  ];

  // Find active endpoint
  let currentEndpoint = null;
  for (const cat of endpointCategories) {
    const found = cat.endpoints.find((e) => e.id === activeEndpointId);
    if (found) {
      currentEndpoint = found;
      break;
    }
  }
  if (!currentEndpoint) currentEndpoint = endpointCategories[0].endpoints[0];

  const curlCommand = `curl -X GET "http://localhost:8000${currentEndpoint.path}" \\
  -H "Accept: application/json"`;

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              OceanTwin REST API Interactive Documentation
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
              v2.0.0 (OpenAPI 3.1)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Standardized RESTful interfaces serving 4D NetCDF ocean numerical models, real-time in-situ Argo profiling buoys, and AI hazard intelligence
          </p>
        </div>

        {/* External Swagger / ReDoc Links */}
        <div className="flex items-center gap-3">
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all group"
          >
            <span>Swagger UI</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="/redoc"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all shadow-md shadow-cyan-500/20 group"
          >
            <span>ReDoc Spec</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>

      {/* Main 2-Column Documentation Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Endpoints Tree (4 Cols) */}
        <div className="lg:col-span-4 glass-panel rounded-2xl p-4 space-y-4 max-h-[720px] overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            API Endpoints Catalog
          </h3>

          <div className="space-y-4">
            {endpointCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300 px-1 py-1">
                  <cat.icon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{cat.category}</span>
                </div>

                <div className="space-y-1 pl-2">
                  {cat.endpoints.map((ep) => {
                    const isSelected = activeEndpointId === ep.id;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => {
                          setActiveEndpointId(ep.id);
                          setLiveResponse(null);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                            : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-sans font-semibold text-[11px] block truncate text-slate-200">
                            {ep.title}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {ep.path.split('?')[0]}
                          </span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300">
                          {ep.method}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Endpoint Detail, cURL, and Live Interactive Tester (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Endpoint Details Card */}
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold font-mono text-xs border border-emerald-500/30">
                    {currentEndpoint.method}
                  </span>
                  <span className="font-mono text-cyan-300 font-semibold text-xs md:text-sm">
                    {currentEndpoint.path}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{currentEndpoint.title}</h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{currentEndpoint.description}</p>
              </div>

              {/* Try It Out Button */}
              <button
                onClick={() => executeLiveCall(currentEndpoint.path)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-cyan-500/30 disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Executing...' : 'Try It Live'}</span>
              </button>
            </div>

            {/* Query Parameters Table (if any) */}
            {currentEndpoint.params && currentEndpoint.params.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Query Parameters
                </h4>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#040a16]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[10.5px]">
                      <tr>
                        <th className="py-2 px-3">Parameter</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Default</th>
                        <th className="py-2 px-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-[11px]">
                      {currentEndpoint.params.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-cyan-300 font-semibold">{p.name}</td>
                          <td className="py-2 px-3 text-amber-300">{p.type}</td>
                          <td className="py-2 px-3 text-slate-400">{p.default !== undefined ? String(p.default) : '-'}</td>
                          <td className="py-2 px-3 text-slate-300 font-sans">{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* cURL Example Snippet */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>cURL Command</span>
                </span>
                <button
                  onClick={() => copyToClipboard(curlCommand, 'curl')}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 font-mono transition-colors"
                >
                  {copiedId === 'curl' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#030712] border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
                <pre>{curlCommand}</pre>
              </div>
            </div>

            {/* Response Payload Viewer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{liveResponse ? 'Live Server Response (200 OK)' : 'Expected Response Schema'}</span>
                </span>
                <button
                  onClick={() => copyToClipboard(liveResponse || JSON.stringify(currentEndpoint.responseExample, null, 2), 'resp')}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-300 font-mono transition-colors"
                >
                  {copiedId === 'resp' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#030712] border border-slate-800 font-mono text-[11px] text-slate-200 max-h-72 overflow-y-auto leading-relaxed shadow-inner">
                <pre>{liveResponse || JSON.stringify(currentEndpoint.responseExample, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

