import React from 'react';
import { Point3D } from '../lib/flatness';
import { cn } from '../lib/utils';

interface FlangeVisualizerProps {
  points: Point3D[];
  maxGap: number;
  pointCount?: number;
}

export function FlangeVisualizer({ points, maxGap, pointCount = 36 }: FlangeVisualizerProps) {
  const size = 600;
  const center = size / 2;
  const radius = size * 0.38; 

  return (
    <div className="relative w-full aspect-square flex items-center justify-center p-4 print:p-0" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="60" />
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />
        <circle cx={center} cy={center} r="4" fill="#cbd5e1" />
        <text x={center} y={center + 20} textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">Środek</text>
        
        {points.map((p, i) => {
          // W matematyce kartezjańskiej oś Y rośnie w górę, w SVG rośnie w dół.
          // Odwracamy oś Y (minus), żeby rzutowanie zgadzało się z fizycznym układem.
          const px = center + p.x * radius;
          const py = center - p.y * radius;
          
          const labelRadius = radius + 60;
          const lx = center + p.x * labelRadius;
          const ly = center - p.y * labelRadius;

          const gap = p.gap || 0;
          const ratio = maxGap > 0 ? Math.abs(gap) / maxGap : 0;
          
          // Kolorowanie punktów: #10b981 (Zielony) -> #f59e0b (Żółty) -> #ef4444 (Czerwony)
          let color = '#10b981';
          if (Math.abs(gap) > 0.001) {
            if (ratio < 0.5) {
              const r = Math.round(16 + (245 - 16) * (ratio * 2));
              const g = Math.round(185 + (158 - 185) * (ratio * 2));
              const b = Math.round(129 + (11 - 129) * (ratio * 2));
              color = `rgb(${r}, ${g}, ${b})`;
            } else {
              const r = Math.round(245 + (239 - 245) * ((ratio - 0.5) * 2));
              const g = Math.round(158 + (68 - 158) * ((ratio - 0.5) * 2));
              const b = Math.round(11 + (68 - 11) * ((ratio - 0.5) * 2));
              color = `rgb(${r}, ${g}, ${b})`;
            }
          }
          if (Math.abs(gap) < 0.001) color = '#10b981'; // 0 to perfekcyjny styk - zawsze zielony
          
          const boxW = 46;
          const boxH = 24;

          return (
            <g key={p.id}>
              <line x1={px} y1={py} x2={lx} y2={ly} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
              <circle cx={px} cy={py} r="8" fill={color} stroke="white" strokeWidth="2" />
              
              <text x={lx} y={ly - 15} textAnchor="middle" className="text-xs font-semibold fill-slate-500">
                Nr {p.id.replace('P', '')}
              </text>
              <rect x={lx - boxW/2} y={ly - boxH/2} width={boxW} height={boxH} rx="4" fill="white" stroke={color} strokeWidth="1" />
              <text x={lx} y={ly + 4} textAnchor="middle" className="text-xs font-bold" fill={color} style={{ fill: color }}>
                {Math.abs(gap) < 0.001 ? "0.00" : gap > 0 ? `+${gap.toFixed(2)}` : gap.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
