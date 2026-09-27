import React from 'react';
import { ShieldCheck, Compass, Radio } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-8 pt-6 pb-8 border-t border-slate-800/80 bg-[#040813] text-center text-xs text-slate-400">
      <div className="max-w-6xl mx-auto px-4 space-y-3">
        {/* Main Tagline from Preview */}
        <p className="text-sm md:text-base font-medium text-slate-300 tracking-wide font-sans">
          An interactive, intelligent and insightful platform for smarter ocean monitoring and better decision making.
        </p>

        {/* Hackathon Details & Insights from PDF */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] text-slate-400 font-mono">
          <span className="flex items-center gap-1 text-cyan-400">
            <Radio className="w-3.5 h-3.5" /> SMART INDIA HACKATHON 2026
          </span>
          <span>•</span>
          <span>PS ID: <strong className="text-slate-200">SIH 26067</strong></span>
          <span>•</span>
          <span>OceanTwin (Disaster Management)</span>
          <span>•</span>
          <span className="text-slate-200">Team Phoenix (ID: 50)</span>
          <span>•</span>
          <span className="text-emerald-400 font-semibold">INCOIS / ERDDAP / GEBCO Integrated</span>
        </div>
      </div>
    </footer>
  );
}

