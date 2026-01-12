
import React, { useEffect, useRef, useState } from 'react';
import WeatherLegend from './WeatherLegend';
import { AlertSeverity } from '../types';

interface LiveMapProps {
  lat: number | null;
  lng: number | null;
  isFullPage?: boolean;
  severity?: AlertSeverity | null;
}

type MapLayer = 'radar' | 'wind' | 'temp' | 'pressure' | 'clouds';

const LiveMap: React.FC<LiveMapProps> = ({ lat, lng, isFullPage = false, severity = null }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const activeLayerRef = useRef<any>(null);
  const riskCircleRef = useRef<any>(null);
  const [currentLayer, setCurrentLayer] = useState<MapLayer>('radar');
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const fetchRadarMetadata = async () => {
    try {
      const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      const data = await response.json();
      if (data?.radar?.past?.length > 0) {
        setRadarTimestamp(data.radar.past[data.radar.past.length - 1].time);
      }
    } catch (error) {
      console.error("Radar API Error:", error);
    }
  };

  useEffect(() => {
    fetchRadarMetadata();
    const interval = setInterval(fetchRadarMetadata, 300000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (s: AlertSeverity | null) => {
    switch (s) {
      case AlertSeverity.CRITICAL: return '#ef4444';
      case AlertSeverity.HIGH: return '#f97316';
      case AlertSeverity.MEDIUM: return '#eab308';
      default: return '#3b82f6';
    }
  };

  // تبديل الطبقات
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;
    const L = (window as any).L;

    if (activeLayerRef.current) {
      mapInstanceRef.current.removeLayer(activeLayerRef.current);
    }

    let layerUrl = '';
    let options: any = { opacity: 0.7, zIndex: 100 };

    switch (currentLayer) {
      case 'radar':
        if (radarTimestamp) {
          layerUrl = `https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/{z}/{x}/{y}/4/1_1.png`;
        }
        break;
      case 'wind':
        layerUrl = `https://maps.open-meteo.com/v1/wind_speed_10m/{z}/{x}/{y}.png`;
        break;
      case 'temp':
        layerUrl = `https://maps.open-meteo.com/v1/temperature_2m/{z}/{x}/{y}.png`;
        break;
      case 'pressure':
        layerUrl = `https://maps.open-meteo.com/v1/pressure_msl/{z}/{x}/{y}.png`;
        break;
      case 'clouds':
        layerUrl = `https://maps.open-meteo.com/v1/cloud_cover/{z}/{x}/{y}.png`;
        break;
    }

    if (layerUrl) {
      activeLayerRef.current = L.tileLayer(layerUrl, options).addTo(mapInstanceRef.current);
    }
  }, [currentLayer, radarTimestamp, isMapReady]);

  useEffect(() => {
    if (!mapContainerRef.current || !lat || !lng || typeof (window as any).L === 'undefined') return;
    const L = (window as any).L;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([lat, lng], isFullPage ? 9 : 7);

      // استخدام خريطة الأقمار الصناعية من Esri
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(map);

      // إضافة طبقة أسماء المدن والحدود (Hybrid) لتسهيل القراءة
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'shadowPane', // وضع الأسماء في طبقة عليا لتبقى واضحة
        zIndex: 500
      }).addTo(map);

      mapInstanceRef.current = map;
      setIsMapReady(true);
    } else {
      mapInstanceRef.current.setView([lat, lng], isFullPage ? 9 : 7);
    }

    if (riskCircleRef.current) mapInstanceRef.current.removeLayer(riskCircleRef.current);
    riskCircleRef.current = L.circle([lat, lng], {
      color: getSeverityColor(severity),
      fillColor: getSeverityColor(severity),
      fillOpacity: 0.15,
      radius: severity === AlertSeverity.CRITICAL ? 50000 : 25000,
      weight: 2,
      dashArray: '5, 10'
    }).addTo(mapInstanceRef.current);

    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 rounded-full opacity-60 animate-ping" style="background-color: ${getSeverityColor(severity)}"></div>
              <div class="w-4 h-4 rounded-full border-2 border-white shadow-xl z-10" style="background-color: ${getSeverityColor(severity)}"></div>
            </div>`,
      iconSize: [32, 32], iconAnchor: [16, 16]
    });
    L.marker([lat, lng], { icon: customIcon }).addTo(mapInstanceRef.current);
  }, [lat, lng, isFullPage, severity]);

  if (!lat || !lng) {
    return (
      <div className={`${isFullPage ? 'h-[70vh]' : 'h-96'} w-full bg-slate-900 rounded-3xl flex items-center justify-center border border-slate-800`}>
        <div className="text-center animate-pulse">
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">جاري مزامنة الرادار العالمي...</p>
        </div>
      </div>
    );
  }

  const statusColor = getSeverityColor(severity);

  return (
    <div className={`relative w-full ${isFullPage ? 'h-[75vh]' : 'h-[550px]'} bg-black rounded-[2.5rem] overflow-hidden border-2 shadow-2xl transition-all duration-500`}
         style={{ borderColor: `${statusColor}44` }}>
      
      <div ref={mapContainerRef} className="w-full h-full z-0"></div>

      {/* Layer Switcher HUD */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 backdrop-blur-3xl p-2 rounded-2xl border border-white/10 z-30 pointer-events-auto">
        {[
          { id: 'radar', label: 'رادار', icon: '📡' },
          { id: 'wind', label: 'رياح', icon: '💨' },
          { id: 'temp', label: 'حرارة', icon: '🌡️' },
          { id: 'clouds', label: 'سحب', icon: '☁️' },
          { id: 'pressure', label: 'ضغط', icon: '📉' }
        ].map(layer => (
          <button
            key={layer.id}
            onClick={() => setCurrentLayer(layer.id as MapLayer)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap ${currentLayer === layer.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <span>{layer.icon}</span>
            <span>{layer.label}</span>
          </button>
        ))}
      </div>

      <div className="absolute top-6 right-6 flex flex-col gap-3 z-20 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-2xl px-5 py-3 rounded-2xl border shadow-2xl transition-colors duration-500"
             style={{ borderColor: `${statusColor}66` }}>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: statusColor }}></span>
            <span className="font-black text-[10px] uppercase tracking-widest" style={{ color: statusColor }}>
              نظام الاستخبارات الجوية
            </span>
          </div>
          <div className="mt-2 font-mono text-[9px] text-slate-200 font-bold bg-black/40 px-2 py-1 rounded">
             LOC: {lat.toFixed(2)}, {lng.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="absolute left-6 bottom-10 z-30 hidden lg:block opacity-60 hover:opacity-100 transition-opacity">
        <WeatherLegend />
      </div>

      {/* Crosshair Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 border-[40px] border-transparent">
         <div className="w-full h-full border border-white/10 rounded-[2rem] relative">
            <div className="absolute top-1/2 left-0 w-4 h-px bg-white/30"></div>
            <div className="absolute top-1/2 right-0 w-4 h-px bg-white/30"></div>
            <div className="absolute top-0 left-1/2 w-px h-4 bg-white/30"></div>
            <div className="absolute bottom-0 left-1/2 w-px h-4 bg-white/30"></div>
         </div>
      </div>
    </div>
  );
};

export default LiveMap;
