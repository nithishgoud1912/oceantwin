import React, { useState } from 'react';
import { GitCompare, CheckCircle2, TrendingUp, BarChart2, Layers } from 'lucide-react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Scatter, Bar } from 'react-chartjs-2';

ChartJS.register(LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function ComparisonLabView({ buoys = [] }) {
  const [activeBuoyId, setActiveBuoyId] = useState('INCOIS-BOB-023');
  const [activeParam, setActiveParam] = useState('temperature'); // 'temperature' | 'salinity'

  const selectedBuoy = buoys.find((b) => b.id === activeBuoyId) || buoys[0] || {};

  // Mock scatter points: Model vs Observed temperature
  const scatterPoints = [
    { x: 28.0, y: 29.2 },
    { x: 27.2, y: 27.8 },
    { x: 28.5, y: 28.9 },
    { x: 28.3, y: 29.6 },
    { x: 28.4, y: 29.1 },
    { x: 24.4, y: 24.6 },
    { x: 26.1, y: 26.8 },
    { x: 29.0, y: 29.9 },
    { x: 25.5, y: 26.2 },
    { x: 27.9, y: 28.5 },
    { x: 28.8, y: 29.4 },
    { x: 23.9, y: 24.3 },
  ];

  const scatterData = {
    datasets: [
      {
        label: 'Model vs Obs Pairs',
        data: scatterPoints,
        backgroundColor: '#00f0ff',
        borderColor: '#00f0ff',
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        type: 'line',
        label: '1:1 Ideal Fit',
        data: [
          { x: 22, y: 22 },
          { x: 32, y: 32 },
        ],
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderDash: [5, 5],
        borderWidth: 1.5,
        pointRadius: 0,
      },
    ],
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Model: ${ctx.parsed.x}°C, Obs: ${ctx.parsed.y}°C`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'ROMS Model Value (°C)', color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' },
      },
      y: {
        title: { display: true, text: 'In-situ Observed Value (°C)', color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' },
      },
    },
  };

  // Depth Profile Data for Selected Buoy
  const depthProfile = [
    { depth: 0, model: 28.8, obs: 29.8 },
    { depth: 50, model: 28.0, obs: 29.2 },
    { depth: 100, model: 25.4, obs: 26.5 },
    { depth: 200, model: 18.2, obs: 19.4 },
    { depth: 250, model: 15.6, obs: 16.8 },
    { depth: 500, model: 11.2, obs: 11.9 },
    { depth: 750, model: 8.1, obs: 8.5 },
    { depth: 1000, model: 6.3, obs: 6.5 },
  ];

  const profileChartData = {
    datasets: [
      {
        label: 'ROMS Model',
        data: depthProfile.map((p) => ({ x: p.model, y: p.depth })),
        borderColor: '#38bdf8',
        backgroundColor: '#38bdf8',
        borderWidth: 2,
        tension: 0.3,
      },
      {
        label: 'Observation',
        data: depthProfile.map((p) => ({ x: p.obs, y: p.depth })),
        borderColor: '#10b981',
        backgroundColor: '#10b981',
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  const profileOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#94a3b8' } },
    },
    scales: {
      x: {
        position: 'top',
        title: { display: true, text: 'Temperature (°C)', color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' },
      },
      y: {
        reverse: true,
        title: { display: true, text: 'Depth (m)', color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitCompare className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">Model Validation & Comparison Lab</h2>
          </div>
          <p className="text-xs text-slate-400">
            Statistical cross-validation of hydrodynamic numerical simulations against ground truth Argo profiling floats & Autonomous Gliders
          </p>
        </div>

        {/* Statistical KPIs */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase block">RMSE</span>
            <span className="font-mono text-cyan-400 font-bold text-sm">1.35 °C</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase block">R² Score</span>
            <span className="font-mono text-emerald-400 font-bold text-sm">0.942</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase block">Mean Bias</span>
            <span className="font-mono text-amber-400 font-bold text-sm">-0.38 °C</span>
          </div>
        </div>
      </div>

      {/* Buoy Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-slate-400 font-medium shrink-0">Select Profiler:</span>
        {buoys.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBuoyId(b.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono shrink-0 transition-all ${
              activeBuoyId === b.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {b.id} ({b.region})
          </button>
        ))}
      </div>

      {/* Grid: Scatter Plot + Depth Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scatter Correlation Plot */}
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Model vs Observation Correlation (Scatter)</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              R = 0.97
            </span>
          </div>
          <div className="h-72 w-full pt-2">
            <Scatter data={scatterData} options={scatterOptions} />
          </div>
        </div>

        {/* Vertical Depth Profile */}
        <div className="glass-panel rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Vertical Thermocline Depth Profile ({selectedBuoy.id || activeBuoyId})</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {selectedBuoy.location || '13.15° N, 88.67° E'}
            </span>
          </div>
          <div className="h-72 w-full pt-2">
            <Line data={profileChartData} options={profileOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

