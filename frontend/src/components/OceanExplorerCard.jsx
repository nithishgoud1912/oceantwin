import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, ZoomIn, SquareDashed, Ruler, Info } from 'lucide-react';

export default function OceanExplorerCard({ depth = 50, onSelectDepth = () => {} }) {
  const depthLevels = [
    { label: '0 m', value: 0 },
    { label: '50 m', value: 50 },
    { label: '100 m', value: 100 },
    { label: '200 m', value: 200 },
    { label: '500 m', value: 500 },
    { label: '1000 m', value: 1000 },
    { label: '2000 m', value: 2000 },
    { label: '4000 m', value: 4000 },
    { label: '6000 m', value: 6000 },
  ];

  const [isRotating, setIsRotating] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Render animated Indian Ocean bathymetric slice
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let offset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Deep dark sea bathymetric background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      // Bathymetric depth contour lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(w * 0.45, h * 0.55, 40 + i * 35 * zoomLevel, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(w * 0.45, h * 0.35);
      ctx.scale(zoomLevel, zoomLevel);

      // Thermal field depending on depth
      const thermalAlpha = depth <= 50 ? 0.75 : depth <= 200 ? 0.5 : depth <= 500 ? 0.25 : 0.08;
      const heatGrad = ctx.createRadialGradient(50, 40, 5, 50, 40, 90);
      heatGrad.addColorStop(0, `rgba(235, 45, 30, ${thermalAlpha})`);
      heatGrad.addColorStop(0.35, `rgba(255, 140, 0, ${thermalAlpha * 0.85})`);
      heatGrad.addColorStop(0.7, `rgba(240, 220, 20, ${thermalAlpha * 0.6})`);
      heatGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = heatGrad;
      ctx.beginPath();
      ctx.ellipse(50, 40, 80, 60, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Land outline (India Subcontinent) - Lush Green
      ctx.fillStyle = '#2e7d32';
      ctx.strokeStyle = '#4caf50';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-45, -60);
      ctx.lineTo(0, -90);
      ctx.lineTo(55, -70);
      ctx.lineTo(40, -10);
      ctx.lineTo(0, 55); // Kanyakumari
      ctx.lineTo(-40, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sri Lanka
      ctx.fillStyle = '#2e7d32';
      ctx.strokeStyle = '#4caf50';
      ctx.beginPath();
      ctx.ellipse(15, 65, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Animated current vector arrows / streamlines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      offset = (offset + 0.5) % 30;

      const drawArrow = (x, y, angle, length) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(length, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(length, 0);
        ctx.lineTo(length - 4, -3);
        ctx.lineTo(length - 4, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      drawArrow(30 + Math.sin(offset * 0.1) * 5, 20, 0.4, 22);
      drawArrow(60, 45, 0.8, 20);
      drawArrow(40, 75, 1.4, 18);
      drawArrow(-50, 20, -0.3, 20);
      drawArrow(-40, 60, -0.9, 18);

      // Depth level contour slice line
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [isRotating, zoomLevel, depth]);

  return (
    <div className="bg-black/90 backdrop-blur-2xl rounded-2xl p-4 flex flex-col justify-between border border-white/[0.14] shadow-2xl relative overflow-hidden">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white" />
            <h3 className="text-xs font-black tracking-wider text-white uppercase">
              3D OCEAN EXPLORER
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-extrabold shadow-sm">
            LAYER: {depth} m
          </span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Bathymetric depth slice of the Indian Ocean basin & current vectors.
        </p>
      </div>

      {/* 2.5D Canvas Area */}
      <div className="relative my-3 rounded-xl overflow-hidden bg-[#050505] border border-zinc-800 h-44 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={420}
          height={190}
          className="w-full h-full object-cover"
        />

        {/* Floating depth indicator badge */}
        <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded-md text-[10px] font-mono text-white border border-zinc-700">
          Depth: <span className="font-bold text-white">{depth} m</span>
        </div>

        {/* Floating toolbar buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/80 p-1 rounded-lg border border-zinc-700">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            title="Rotate View"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => (z >= 1.4 ? 1 : z + 0.2))}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            title="Select Region"
          >
            <SquareDashed className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            title="Measure"
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
            title="Layer Info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dynamic Depth Level Pills (Clicking updates the entire app!) */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            DEPTH LEVEL SELECTOR
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            Click to slice
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {depthLevels.map((lvl) => {
            const isSelected = depth === lvl.value;
            return (
              <button
                key={lvl.label}
                onClick={() => onSelectDepth(lvl.value)}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-medium transition-all ${
                  isSelected
                    ? 'bg-white text-black font-extrabold shadow-md shadow-white/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {lvl.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
