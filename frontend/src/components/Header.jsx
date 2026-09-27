import React from 'react';
import { Waves, Calendar, Sun, Moon, User, ChevronDown, Sparkles } from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  isDark,
  setIsDark,
  selectedDate = "2026-08-30",
  onDateChange = () => {},
  formattedDate = "30 Aug 2026"
}) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'globe', label: '3D Globe' },
    { id: 'explorer', label: 'Data Explorer' },
    { id: 'comparison', label: 'Comparison' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'reports', label: 'Reports' },
    { id: 'api_docs', label: 'REST API Docs' },
  ];

  const isLive = selectedDate === "2026-08-30";
  const isForecast = selectedDate > "2026-08-30";

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-2xl border-b border-white/[0.12] px-4 lg:px-8 py-3 flex items-center justify-between shadow-[0_10px_30px_-10px_rgba(0,0,0,0.95)]">
      {/* Brand & Logo (Minimalist Black & White Luxury Aesthetic) */}
      <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
        <div className="w-10 h-10 rounded-2xl bg-white p-[1.5px] shadow-lg shadow-white/10 group-hover:shadow-white/25 transition-shadow">
          <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center">
            <Waves className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white font-sans">
              Ocean<span className="text-zinc-400">Twin</span>
            </span>
            <span className="text-[9.5px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
              SIH 26067
            </span>
          </div>
          <p className="text-[10.5px] text-zinc-400 font-medium tracking-tight">
            Intelligent 3D Ocean Digital Twin & Observation Platform
          </p>
        </div>
      </div>

      {/* Center Nav Tabs (Clean Black & White Pills) */}
      <nav className="hidden md:flex items-center gap-1 bg-zinc-950 p-1 rounded-2xl border border-white/[0.12] shadow-inner">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-black bg-white shadow-md shadow-white/10 font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute -bottom-1 left-3 right-3 h-[2px] bg-white rounded-full shadow-[0_0_8px_#ffffff]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* INTERACTIVE DATE PICKER SELECTOR */}
        <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-white/[0.16] hover:border-white/40 transition-all shadow-sm group">
          <Calendar className="w-3.5 h-3.5 text-white shrink-0 group-hover:scale-105 transition-transform" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-white font-mono text-[11px] font-bold outline-none cursor-pointer [color-scheme:dark]"
            title="Click to select analysis date"
          />
          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase tracking-wider hidden sm:inline ${
            isLive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            isForecast ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
            'bg-zinc-800 text-zinc-300 border border-zinc-700'
          }`}>
            {isLive ? 'Live' : isForecast ? 'Forecast' : 'Hindcast'}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-xl bg-zinc-950 border border-white/[0.12] text-white hover:bg-white/[0.08] hover:border-white/30 transition-all shadow-sm"
          title="Toggle High Contrast"
        >
          {isDark ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-white" />}
        </button>

        {/* User Profile */}
        <div className="w-8.5 h-8.5 rounded-xl bg-white/20 p-[1.5px] cursor-pointer hover:shadow-lg hover:shadow-white/20 transition-all">
          <div className="w-full h-full rounded-xl bg-black flex items-center justify-center text-white hover:bg-zinc-900">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
