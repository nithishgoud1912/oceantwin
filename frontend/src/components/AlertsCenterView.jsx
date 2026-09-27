import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Bell, ShieldAlert, CheckCircle, Radio } from 'lucide-react';

export default function AlertsCenterView() {
  const [filterSeverity, setFilterSeverity] = useState('all');

  const alerts = [
    {
      id: 'ALT-101',
      title: 'High Thermal Deviation Detected (>3.2°C)',
      category: 'Model Divergence / Pre-Cyclone Warm Pool',
      location: 'Central Bay of Bengal (12.5°N, 89.2°E)',
      time: '10 min ago',
      severity: 'critical',
      description: 'ROMS model sea surface temperature is underpredicting in-situ Argo observations by 3.2°C. High heat content (>85 kJ/cm²) indicates intensified pre-cyclone boundary layer warming.',
      actions: ['Notify IMD Cyclone Forecasting Unit', 'Request rapid-cycle Argo profiling mode', 'Re-run boundary flux model']
    },
    {
      id: 'ALT-102',
      title: 'Marine Heatwave Level 2 Advisory',
      category: 'Ecological & Fisheries Impact',
      location: 'Andaman Sea & Nicobar Shelf',
      time: '45 min ago',
      severity: 'high',
      description: 'SST has exceeded the 90th climatological percentile for 6 consecutive days. Potential risk to coral reef bleaching and pelagic fish migration paths.',
      actions: ['Dispatch advisory to Coastal Fisheries Department', 'Cross-examine with MODIS Chlorophyll-a anomalies']
    },
    {
      id: 'ALT-103',
      title: 'Telemetry Data Gap in South Indian Ocean',
      category: 'Sensor Coverage Gap',
      location: 'South Indian Ocean (14°S to 25°S)',
      time: '2 hours ago',
      severity: 'medium',
      description: 'Zero active Argo float profiles received from SIO sector for over 72 hours. Model uncertainty elevated to ±2.8°C.',
      actions: ['Re-task Indian Ocean glider SG-642 trajectory', 'Increase background covariance in data assimilation']
    },
    {
      id: 'ALT-104',
      title: 'Sensor Drift Warning on Float INCOIS-ARB-014',
      category: 'Instrument Quality Control',
      location: 'Arabian Sea (16.42°N, 67.85°E)',
      time: '4 hours ago',
      severity: 'low',
      description: 'Salinity sensor shows +0.18 PSU drift compared to climatological historical water mass properties below 1000m.',
      actions: ['Flag profile with delayed QC flag 3', 'Apply automated salinity calibration correction']
    },
    {
      id: 'ALT-105',
      title: 'System Ingestion: HYCOM & ROMS Grids Synced',
      category: 'System Status',
      location: 'INCOIS High Performance Computing Node',
      time: '6 hours ago',
      severity: 'info',
      description: 'Successfully harmonized 0.08° global HYCOM ocean currents and INCOIS ROMS high-resolution regional outputs.',
      actions: ['All 3D visualization layers refreshed']
    }
  ];

  const filtered = filterSeverity === 'all'
    ? alerts
    : alerts.filter((a) => a.severity === filterSeverity);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">Disaster Management Early Warning & Alerts</h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time multi-hazard ocean intelligence: marine heatwaves, cyclone warm pools, model deviations, and sensor anomalies
          </p>
        </div>

        {/* Severity Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          {['all', 'critical', 'high', 'medium', 'info'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 text-xs rounded-lg font-medium capitalize transition-all ${
                filterSeverity === sev
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Cards List */}
      <div className="space-y-3">
        {filtered.map((alert) => {
          const isCritical = alert.severity === 'critical';
          const isHigh = alert.severity === 'high';
          const isMedium = alert.severity === 'medium';

          return (
            <div
              key={alert.id}
              className={`glass-panel rounded-2xl p-5 border transition-all ${
                isCritical
                  ? 'border-red-500/40 bg-red-950/15'
                  : isHigh
                  ? 'border-amber-500/30 bg-amber-950/15'
                  : isMedium
                  ? 'border-yellow-500/30 bg-yellow-950/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-3">
                  {isCritical ? (
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                  ) : isHigh ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : isMedium ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{alert.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold ${
                        isCritical
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : isHigh
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isMedium
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-cyan-400 font-mono mt-0.5">{alert.location}</p>
                  </div>
                </div>

                <span className="text-xs text-slate-500 font-mono">{alert.time}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pl-8 mb-3">
                {alert.description}
              </p>

              {/* Recommended Actions */}
              <div className="pl-8 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Action Protocol:</span>
                {alert.actions.map((act, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-700/60 font-medium"
                  >
                    • {act}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

