
import React from 'react';

const WeatherLegend: React.FC = () => {
  const levels = [
    { color: '#9333ea', label: '200+', val: 'purple' },
    { color: '#c026d3', label: '150', val: 'magenta' },
    { color: '#db2777', label: '100', val: 'pink' },
    { color: '#991b1b', label: '80', val: 'darkred' },
    { color: '#dc2626', label: '60', val: 'red' },
    { color: '#ea580c', label: '40', val: 'orange' },
    { color: '#facc15', label: '20', val: 'yellow' },
    { color: '#a3e635', label: '10', val: 'lime' },
    { color: '#22c55e', label: '5', val: 'green' },
    { color: '#10b981', label: '2', val: 'emerald' },
    { color: '#0ea5e9', label: '1', val: 'blue' },
    { color: '#67e8f9', label: '0.5', val: 'cyan' },
  ];

  return (
    <div className="bg-black/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl flex flex-col gap-1 w-24">
      <div className="text-[10px] font-bold text-center mb-1 text-slate-300 border-b border-slate-800 pb-1">[مم]</div>
      {levels.map((level, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <div 
            className="w-4 h-3 rounded-sm border border-white/10 transition-transform group-hover:scale-110" 
            style={{ backgroundColor: level.color }}
          ></div>
          <span className="text-[9px] font-mono text-slate-400">{level.label}</span>
        </div>
      ))}
    </div>
  );
};

export default WeatherLegend;
