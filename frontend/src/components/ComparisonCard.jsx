import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ComparisonCard({ data = {}, depth = 50 }) {
  const model = data.model || { name: 'ROMS', temperature: 28.0, salinity: 35.1, current_speed: 0.65 };
  const obs = data.observation || { name: 'Buoy (INCOIS-BOB-023)', temperature: 29.2, salinity: 34.7, current_speed: 0.58 };
  const diff = data.difference || { temperature: 1.2, salinity: -0.4, current_speed: 0.07 };
  const profile = data.profile || [
    { depth: 0, model_temp: 28.8, obs_temp: 29.8 },
    { depth: 50, model_temp: 28.0, obs_temp: 29.2 },
    { depth: 100, model_temp: 25.4, obs_temp: 26.5 },
    { depth: 200, model_temp: 18.2, obs_temp: 19.4 },
    { depth: 250, model_temp: 15.6, obs_temp: 16.8 },
    { depth: 500, model_temp: 11.2, obs_temp: 11.9 },
    { depth: 750, model_temp: 8.1, obs_temp: 8.5 },
    { depth: 1000, model_temp: 6.3, obs_temp: 6.5 },
  ];

  // Inverted Depth Profile Chart (Depth 0m at top down to 1000m at bottom)
  const chartData = {
    labels: profile.map((p) => `${p.depth}m`),
    datasets: [
      {
        label: 'ROMS (Model)',
        data: profile.map((p) => p.model_temp),
        borderColor: '#a1a1aa',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointBackgroundColor: '#a1a1aa',
        pointRadius: 3,
        tension: 0.3,
      },
      {
        label: 'INCOIS Buoy (Obs)',
        data: profile.map((p) => p.obs_temp),
        borderColor: '#ffffff',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        fill: true,
        borderWidth: 2.2,
        pointBackgroundColor: '#ffffff',
        pointRadius: 3.5,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#e4e4e7',
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          font: { size: 10, family: 'Plus Jakarta Sans', weight: '600' },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#e4e4e7',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 8,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.raw} °C`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#a1a1aa', font: { size: 9, family: 'JetBrains Mono' } },
        title: { display: true, text: 'Depth (m)', color: '#71717a', font: { size: 9.5 } },
      },
      y: {
        min: 5,
        max: 35,
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: {
          stepSize: 5,
          color: '#a1a1aa',
          font: { size: 9, family: 'JetBrains Mono' },
          callback: (val) => `${val}°C`,
        },
        title: { display: true, text: 'Temp (°C)', color: '#71717a', font: { size: 9.5 } },
      },
    },
  };

  return (
    <div className="bg-black/90 backdrop-blur-2xl rounded-2xl p-4 flex flex-col justify-between border border-white/[0.14] shadow-2xl relative overflow-hidden">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-xs font-black tracking-wider text-white uppercase">
              MODEL vs OBSERVATION
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {data.date_str && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-700 font-bold">
                {data.date_str}
              </span>
            )}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-extrabold shadow-sm">
              DEPTH: {depth} m
            </span>
          </div>
        </div>
        <p className="text-[11px] text-zinc-400">
          Validation metrics for <span className="text-white font-mono">{obs.name || 'INCOIS-BOB-023'}</span> at {depth}m.
        </p>
      </div>

      {/* Numerical Stats Table */}
      <div className="my-3 rounded-xl overflow-hidden bg-[#050505] border border-zinc-800 p-2.5 text-xs">
        <div className="grid grid-cols-4 pb-1.5 mb-1.5 border-b border-zinc-800 text-[10px] font-mono font-bold text-zinc-400">
          <span>PARAM</span>
          <span className="text-center">ROMS</span>
          <span className="text-center">BUOY</span>
          <span className="text-right">DIFF</span>
        </div>

        {/* Temperature row */}
        <div className="grid grid-cols-4 py-1 items-center text-[11px]">
          <span className="text-zinc-300 font-medium">Temp.</span>
          <span className="text-center font-mono text-zinc-400">{model.temperature} °C</span>
          <span className="text-center font-mono text-white font-bold">{obs.temperature} °C</span>
          <span className="text-right font-mono font-bold text-white flex items-center justify-end gap-0.5">
            <ArrowUpRight className="w-3 h-3 text-white" />
            {diff.temperature > 0 ? `+${diff.temperature}` : diff.temperature} °C
          </span>
        </div>

        {/* Salinity row */}
        <div className="grid grid-cols-4 py-1 items-center text-[11px] border-t border-zinc-900">
          <span className="text-zinc-300 font-medium">Salinity</span>
          <span className="text-center font-mono text-zinc-400">{model.salinity}</span>
          <span className="text-center font-mono text-white font-bold">{obs.salinity}</span>
          <span className="text-right font-mono text-zinc-400">
            {diff.salinity > 0 ? `+${diff.salinity}` : diff.salinity} PSU
          </span>
        </div>

        {/* Current Speed row */}
        <div className="grid grid-cols-4 py-1 items-center text-[11px] border-t border-zinc-900">
          <span className="text-zinc-300 font-medium">Velocity</span>
          <span className="text-center font-mono text-zinc-400">{model.current_speed} m/s</span>
          <span className="text-center font-mono text-white font-bold">{obs.current_speed} m/s</span>
          <span className="text-right font-mono text-zinc-400">
            {diff.current_speed > 0 ? `+${diff.current_speed}` : diff.current_speed} m/s
          </span>
        </div>
      </div>

      {/* Inverted Vertical Profile Chart */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            VERTICAL DEPTH PROFILE (0–1000m)
          </span>
          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
            <CheckCircle2 className="w-3 h-3 text-white" />
            <span>Active: {depth}m</span>
          </div>
        </div>
        <div className="h-32 w-full">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
