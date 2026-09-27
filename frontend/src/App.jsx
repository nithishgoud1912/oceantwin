import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import GlobeView from './components/GlobeView';
import OceanExplorerCard from './components/OceanExplorerCard';
import ComparisonCard from './components/ComparisonCard';
import AnomalyCard from './components/AnomalyCard';
import DataExplorerView from './components/DataExplorerView';
import ComparisonLabView from './components/ComparisonLabView';
import AlertsCenterView from './components/AlertsCenterView';
import ReportsView from './components/ReportsView';
import ApiDocsView from './components/ApiDocsView';
import Footer from './components/Footer';
import {
  fetchOverview,
  fetchBuoys,
  fetchComparisonDetail,
  fetchAnomalies,
  fallbackData
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDark, setIsDark] = useState(true);
  const [currentTime, setCurrentTime] = useState('30 Aug 2026, 12:00 UTC');

  // Backend & Dynamic Depth state
  const [selectedDepth, setSelectedDepth] = useState(50);
  const [overviewData, setOverviewData] = useState(fallbackData.overview);
  const [buoysData, setBuoysData] = useState(fallbackData.buoys);
  const [selectedBuoy, setSelectedBuoy] = useState(fallbackData.buoys.featured);
  const [comparisonData, setComparisonData] = useState(fallbackData.comparison);
  const [anomaliesData, setAnomaliesData] = useState(fallbackData.anomalies);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2026-08-30");

  const formatDisplayDate = (dStr) => {
    try {
      const d = new Date(dStr + "T12:00:00Z");
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  // Date Change Handler: Updates Overview, Comparison, Buoys & Globe
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    fetchOverview(selectedDepth, newDate).then(setOverviewData);
    fetchComparisonDetail(selectedBuoy?.id || 'INCOIS-BOB-023', selectedDepth, newDate).then(setComparisonData);
    fetchBuoys(newDate).then((data) => {
      if (data && data.buoys) {
        setBuoysData(data);
        if (data.featured) {
          setSelectedBuoy(data.featured);
        }
      }
    });
  };

  // Dynamic Depth Handler: Updates Overview, Comparison, Globe & Cards synchronously!
  const handleDepthChange = (newDepth) => {
    setSelectedDepth(newDepth);
    fetchOverview(newDepth, selectedDate).then(setOverviewData);
    fetchComparisonDetail(selectedBuoy?.id || 'INCOIS-BOB-023', newDepth, selectedDate).then(setComparisonData);
  };

  // Initial Load from FastAPI backend
  useEffect(() => {
    fetchOverview(50, selectedDate).then(setOverviewData);
    fetchBuoys(selectedDate).then((data) => {
      if (data && data.buoys) {
        setBuoysData(data);
        if (data.featured) {
          setSelectedBuoy(data.featured);
        }
      }
    });
    fetchComparisonDetail('INCOIS-BOB-023', 50, selectedDate).then(setComparisonData);
    fetchAnomalies().then(setAnomaliesData);
  }, []);

  const handleBuoySelect = (buoy) => {
    setSelectedBuoy(buoy);
    fetchComparisonDetail(buoy.id, selectedDepth, selectedDate).then(setComparisonData);
  };

  const handlePointSelect = (pointData) => {
    if (!pointData || !pointData.point || !pointData.telemetry) return;
    setComparisonData((prev) => ({
      ...prev,
      location: `${pointData.point.lat_str}, ${pointData.point.lon_str}`,
      depth: pointData.point.depth,
      time: pointData.point.timestamp,
      model: {
        ...prev.model,
        temperature: pointData.telemetry.temperature_model,
        salinity: pointData.telemetry.salinity,
        current_speed: pointData.telemetry.current_speed,
      },
      observation: {
        ...prev.observation,
        name: `Coordinate (${pointData.point.lat_str}, ${pointData.point.lon_str})`,
        temperature: pointData.telemetry.temperature_observed,
        salinity: pointData.telemetry.salinity,
        current_speed: pointData.telemetry.current_speed,
      },
      difference: {
        ...prev.difference,
        temperature: pointData.telemetry.temperature_diff,
      }
    }));

    const elem = document.getElementById('comparison-section');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewDetails = (buoy) => {
    handleBuoySelect(buoy);
    const elem = document.getElementById('comparison-section');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Top Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        formattedDate={formatDisplayDate(selectedDate)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-3 md:p-5 lg:p-6 space-y-6">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* HERO 3D DIGITAL TWIN GLOBE (DYNAMICALLY CONTROLLED BY DEPTH & POINT SELECTION) */}
            <GlobeView
              buoys={buoysData.buoys || []}
              selectedBuoy={selectedBuoy}
              setSelectedBuoy={handleBuoySelect}
              overviewData={overviewData}
              onViewDetails={handleViewDetails}
              depth={selectedDepth}
              onDepthChange={handleDepthChange}
              onSelectPoint={handlePointSelect}
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
            />

            {/* BOTTOM 3-CARD INTERACTIVE ANALYSIS ROW (SYNCHRONIZED WITH DEPTH) */}
            <div id="comparison-section" className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: 3D Ocean Explorer */}
              <OceanExplorerCard
                depth={selectedDepth}
                onSelectDepth={handleDepthChange}
              />

              {/* Card 2: Model vs Observation Comparison */}
              <ComparisonCard
                data={comparisonData}
                depth={selectedDepth}
                date={selectedDate}
              />

              {/* Card 3: Anomaly Detection (AI Insights) */}
              <AnomalyCard
                data={anomaliesData}
                depth={selectedDepth}
                onOpenFullAnalysis={() => setShowAnalysisModal(true)}
              />
            </div>
          </div>
        )}

        {/* TAB 2: DEDICATED 3D GLOBE VIEW */}
        {activeTab === 'globe' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">3D Ocean Digital Twin Fullscreen Explorer</h2>
                <p className="text-xs text-zinc-400">High-fidelity WebGL projection of temperature, salinity, currents, and profilers</p>
              </div>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-white border border-zinc-700 font-medium"
              >
                Back to Dashboard
              </button>
            </div>
            <div className="h-[750px]">
              <GlobeView
                buoys={buoysData.buoys || []}
                selectedBuoy={selectedBuoy}
                setSelectedBuoy={handleBuoySelect}
                overviewData={overviewData}
                onViewDetails={handleViewDetails}
                depth={selectedDepth}
                onDepthChange={handleDepthChange}
                onSelectPoint={handlePointSelect}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
              />
            </div>
          </div>
        )}

        {/* TAB 3: DATA EXPLORER VIEW */}
        {activeTab === 'explorer' && (
          <DataExplorerView />
        )}

        {/* TAB 4: COMPARISON LAB VIEW */}
        {activeTab === 'comparison' && (
          <ComparisonLabView
            comparisonData={comparisonData}
            buoysData={buoysData}
          />
        )}

        {/* TAB 5: ALERTS VIEW */}
        {activeTab === 'alerts' && (
          <AlertsCenterView
            alerts={overviewData.alerts || []}
          />
        )}

        {/* TAB 6: REPORTS VIEW */}
        {activeTab === 'reports' && (
          <ReportsView
            overviewData={overviewData}
            comparisonData={comparisonData}
          />
        )}

        {/* TAB 7: REST API DOCS VIEW */}
        {activeTab === 'api_docs' && (
          <ApiDocsView />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* AI Anomaly Deep-Dive Diagnostic Modal (Monochrome Luxury Theme) */}
      {showAnalysisModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-black border border-white/20 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                <h3 className="font-extrabold text-white text-base">
                  AI Deep-Dive Oceanographic Diagnostic Report
                </h3>
              </div>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-400 font-bold uppercase text-[10px] block">Target Anomaly Core</span>
                <p className="text-white font-mono font-medium">
                  Bay of Bengal Coastal Kelvin Wave Corridor (12.4° N, 89.1° E) • Layer: {selectedDepth}m
                </p>
                <p className="text-zinc-400 text-[11px]">
                  Magnitude: +2.8 °C thermal divergence above climatological baseline.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-white uppercase text-[11px] mb-1.5">Attribution Breakdown</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                    <span className="text-xl font-mono font-extrabold text-white">45%</span>
                    <span className="block text-[10.5px] text-zinc-400 mt-0.5">Anticyclonic Eddy</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                    <span className="text-xl font-mono font-extrabold text-white">30%</span>
                    <span className="block text-[10.5px] text-zinc-400 mt-0.5">Barrier Layer Shoaling</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
                    <span className="text-xl font-mono font-extrabold text-white">17%</span>
                    <span className="block text-[10.5px] text-zinc-400 mt-0.5">Sub-grid Bathymetry</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-white font-bold text-[11px] block">Actionable Recommendation</span>
                <p className="text-zinc-300">
                  Deploy targeted autonomous glider transect across 89°E meridian to sample vertical thermohaline microstructure. Adjust ROMS vertical mixing parameterization (KPP boundary layer scheme) for high freshwater river runoff.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-700"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setShowAnalysisModal(false);
                  setActiveTab('reports');
                }}
                className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 shadow-md shadow-white/20"
              >
                Export Official Incident Bulletin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
