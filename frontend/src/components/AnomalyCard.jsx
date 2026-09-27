import React from 'react';
import { AlertTriangle, Sparkles, ChevronRight, CheckCircle } from 'lucide-react';

export default function AnomalyCard({ data = {}, onOpenFullAnalysis = () => {}, depth = 50 }) {
  const causes = data.primary_causes || [
    { title: 'Strong ocean current', pct: 45 },
    { title: 'Upwelling event', pct: 30 },
    { title: 'Model limitation', pct: 17 },
  ];
  const confidence = data.confidence_score || 92;

  return (
    <div className="bg-black/90 backdrop-blur-2xl rounded-2xl p-4 flex flex-col justify-between border border-white/[0.14] shadow-2xl relative overflow-hidden">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <h3 className="text-xs font-black tracking-wider text-white uppercase">
              AI ANOMALY DETECTION
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-extrabold shadow-sm">
            CONFIDENCE: {confidence}%
          </span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Spatial deviation heatmap in Bay of Bengal at <strong className="text-white">{depth} m</strong> depth.
        </p>
      </div>

      {/* Center Radar / Spatial Heatmap Graphic */}
      <div className="relative my-3 rounded-xl overflow-hidden bg-[#050505] border border-zinc-800 h-44 flex items-center justify-center">
        {/* Concentric radar rings */}
        <div className="absolute w-36 h-36 rounded-full border border-white/[0.08]" />
        <div className="absolute w-24 h-24 rounded-full border border-white/[0.12]" />
        <div className="absolute w-12 h-12 rounded-full border border-white/[0.2]" />

        {/* Heatmap blob */}
        <div className="absolute w-28 h-20 rounded-full bg-gradient-to-tr from-red-600/60 via-amber-500/40 to-white/20 blur-xl animate-pulse" />

        {/* Center Hotspot Marker */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-4 h-4 rounded-full bg-white border-2 border-black animate-radar shadow-lg" />
          <span className="text-[10px] font-mono font-extrabold text-white mt-1 bg-black/90 px-2 py-0.5 rounded border border-white/20">
            {depth <= 50 ? '+2.8 °C Anomaly' : depth <= 200 ? '+1.6 °C Anomaly' : '+0.4 °C Residual'}
          </span>
        </div>

        {/* Location tag */}
        <div className="absolute bottom-2 left-2 text-[9.5px] font-mono text-zinc-400 bg-black/80 px-1.5 py-0.5 rounded border border-zinc-800">
          12.4° N, 89.1° E (Bay of Bengal)
        </div>
      </div>

      {/* AI Insight Card */}
      <div className="p-3 rounded-xl bg-[#050505] border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wide">
              AI Insight Attribution
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-white bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-700">
            Depth: {depth}m
          </span>
        </div>

        {/* Attribution Causes */}
        <div className="space-y-1.5">
          {causes.map((cause) => (
            <div key={cause.title} className="space-y-0.5">
              <div className="flex justify-between text-[10.5px]">
                <span className="text-zinc-300">{cause.title}</span>
                <span className="font-mono text-white font-semibold">{cause.pct}%</span>
              </div>
              <div className="w-full h-1 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${cause.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={onOpenFullAnalysis}
          className="w-full mt-2 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-[11px] transition-all flex items-center justify-center gap-1 shadow-sm"
        >
          <span>Deep-Dive Diagnostic</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
