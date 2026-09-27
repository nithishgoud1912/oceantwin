import React, { useState, useEffect } from 'react';
import { Database, Filter, Download, Search, RefreshCw, Table, FileSpreadsheet } from 'lucide-react';
import { fetchDatasets } from '../services/api';

export default function DataExplorerView() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('t3z_2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [depthFilter, setDepthFilter] = useState('50');

  useEffect(() => {
    fetchDatasets().then((data) => {
      if (data && data.datasets) {
        setDatasets(data.datasets);
      }
    });
  }, []);

  // Sample data rows matching the backend datasets
  const mockTableData = [
    { time: '2026-08-30 11:30:00', lat: 13.15, lon: 88.67, depth: 50.0, temp: 29.2, sal: 34.7, current_u: 0.42, current_v: 0.38 },
    { time: '2026-08-30 11:15:00', lat: 16.42, lon: 67.85, depth: 50.0, temp: 27.8, sal: 36.2, current_u: 0.31, current_v: 0.28 },
    { time: '2026-08-30 11:00:00', lat: -0.50, lon: 78.30, depth: 50.0, temp: 28.9, sal: 34.9, current_u: 0.58, current_v: 0.43 },
    { time: '2026-08-30 10:45:00', lat: 18.20, lon: 89.40, depth: 50.0, temp: 29.6, sal: 32.9, current_u: 0.35, current_v: 0.37 },
    { time: '2026-08-30 11:20:00', lat: 11.20, lon: 93.80, depth: 50.0, temp: 29.1, sal: 33.6, current_u: 0.25, current_v: 0.29 },
    { time: '2026-08-30 09:50:00', lat: -14.20, lon: 82.50, depth: 50.0, temp: 24.6, sal: 35.4, current_u: 0.18, current_v: 0.22 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">Multi-Source Ocean Data Explorer</h2>
          </div>
          <p className="text-xs text-slate-400">
            Query and filter synchronized NetCDF4 numerical models (ROMS/HYCOM) and in-situ observational datasets (INCOIS Argo, Gliders, MODIS)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Exporting active dataset to CSV...')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all shadow-md shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Dataset Selectors & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Datasets List Card */}
        <div className="glass-panel rounded-2xl p-4 md:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Available Datasets</span>
            <span className="text-[10px] text-cyan-400 font-mono">{datasets.length} Loaded</span>
          </h3>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {datasets.map((ds) => {
              const isSelected = selectedDataset === ds.name;
              return (
                <button
                  key={ds.name}
                  onClick={() => setSelectedDataset(ds.name)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                      : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <div className="truncate">
                    <div className="font-mono">{ds.name}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{ds.format} format</div>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                    ds.format === 'netcdf' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {ds.format}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Controls & Data Preview Table */}
        <div className="glass-panel rounded-2xl p-4 md:col-span-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search coordinates, variables, platform ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/80 rounded-xl border border-slate-700/60 text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">Depth:</label>
              <select
                value={depthFilter}
                onChange={(e) => setDepthFilter(e.target.value)}
                className="bg-slate-900 text-slate-200 text-xs rounded-lg border border-slate-700 px-2.5 py-1.5 focus:outline-none"
              >
                <option value="0">0 m (Surface)</option>
                <option value="50">50 m (Subsurface)</option>
                <option value="100">100 m</option>
                <option value="250">250 m</option>
                <option value="500">500 m</option>
                <option value="1000">1000 m (Deep)</option>
              </select>
            </div>
          </div>

          {/* Table View */}
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#040915]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Lat / Lon</th>
                  <th className="py-2.5 px-3">Depth</th>
                  <th className="py-2.5 px-3">Water Temp</th>
                  <th className="py-2.5 px-3">Salinity</th>
                  <th className="py-2.5 px-3">Currents (u, v)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {mockTableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-300">{row.time}</td>
                    <td className="py-2.5 px-3 text-cyan-300">{row.lat.toFixed(2)}°N, {row.lon.toFixed(2)}°E</td>
                    <td className="py-2.5 px-3 text-slate-400">{row.depth} m</td>
                    <td className="py-2.5 px-3 text-amber-300 font-bold">{row.temp} °C</td>
                    <td className="py-2.5 px-3 text-slate-300">{row.sal} PSU</td>
                    <td className="py-2.5 px-3 text-slate-400">{row.current_u} m/s, {row.current_v} m/s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

