import React, { useState } from 'react';
import { FileText, Download, Printer, Share2, CheckCircle, Clock } from 'lucide-react';

export default function ReportsView() {
  const [selectedReport, setSelectedReport] = useState('daily_bulletin');

  const reportTemplates = [
    {
      id: 'daily_bulletin',
      title: 'INCOIS Daily Ocean State & Validation Bulletin',
      date: '30 Aug 2026',
      audience: 'INCOIS Forecasters & RSMC',
      summary: 'Comprehensive 24-hour validation report comparing ROMS numerical model outputs against 36 active in-situ Indian Ocean Argo floats and coastal tide gauges.',
      highlights: [
        'Overall Model Skill Score: 87.0% (Overall RMSE: 1.35 °C)',
        'Highest Regional Accuracy: Western Pacific (90%) & Arabian Sea (89%)',
        'Bay of Bengal Warm Pool Anomaly: Max deviation of +3.4°C localized around 13.5°N, 89.5°E',
        'Active Platforms: 36 Argo Floats, 2 Autonomous Underwater Gliders'
      ]
    },
    {
      id: 'cyclone_advisory',
      title: 'Cyclone Genesis Pre-Condition & Ocean Heat Content Advisory',
      date: '30 Aug 2026',
      audience: 'Disaster Management & IMD Teams',
      summary: 'Ocean thermal energy assessment for the Bay of Bengal basin. Analyzes Tropical Cyclone Heat Potential (TCHP) and depth of the 26°C isotherm (D26).',
      highlights: [
        'Central Bay of Bengal TCHP exceeds 92 kJ/cm²',
        'Mixed Layer Depth (MLD) estimated at 35m with sharp thermocline barrier',
        'Favorable oceanic pre-conditions for pre-monsoonal storm intensification'
      ]
    },
    {
      id: 'fisheries_advisory',
      title: 'Potential Fishing Zone (PFZ) & Chlorophyll Co-Validation Report',
      date: '30 Aug 2026',
      audience: 'Fisheries Sector & Coastal Communities',
      summary: 'Integration of MODIS satellite Chlorophyll-a frontal zones with thermal gradients and subsurface current convergences.',
      highlights: [
        'Active thermal front detected off Andhra Coast (15.2°N, 81.5°E)',
        'Chlorophyll-a concentrations between 0.45 - 0.82 mg/m³ indicating productive upwelling zone',
        'Advisory issued for optimized artisanal and mechanized fishing operations'
      ]
    }
  ];

  const current = reportTemplates.find((r) => r.id === selectedReport) || reportTemplates[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">Automated Oceanographic Validation Reports</h2>
          </div>
          <p className="text-xs text-slate-400">
            Generate and export standards-compliant bulletins for INCOIS forecasters, researchers, disaster managers, and fisheries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={() => alert(`Exporting ${current.title} to PDF...`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all shadow-md shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reports Navigation Column */}
        <div className="glass-panel rounded-2xl p-4 space-y-3 md:col-span-1">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Report Templates</h3>
          <div className="space-y-2">
            {reportTemplates.map((rep) => {
              const isSelected = selectedReport === rep.id;
              return (
                <button
                  key={rep.id}
                  onClick={() => setSelectedReport(rep.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <div className="font-semibold text-xs leading-snug">{rep.title}</div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>{rep.audience}</span>
                    <span className="font-mono">{rep.date}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Preview Document */}
        <div className="glass-panel rounded-2xl p-8 md:col-span-2 space-y-6 bg-[#040a16] border border-slate-700/80">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block mb-1">
                Official Ocean Validation Document
              </span>
              <h3 className="text-lg font-bold text-white leading-tight">{current.title}</h3>
              <p className="text-xs text-slate-400 mt-1">Target Audience: {current.audience}</p>
            </div>
            <div className="text-right font-mono text-xs text-slate-400">
              <div>Date: {current.date}</div>
              <div className="text-emerald-400 font-semibold mt-0.5">Status: Verified</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Executive Summary</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{current.summary}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Key Findings & Validation Metrics</h4>
            <div className="space-y-2">
              {current.highlights.map((hl, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{hl}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between font-mono">
            <span>OceanTwin Platform • Problem Statement SIH 26067</span>
            <span>Generated: 30 Aug 2026, 12:00 UTC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

