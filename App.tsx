
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLiveWeatherData, resolveLocationCoords } from './services/geminiService';
import { fetchOpenMeteoData } from './services/weatherApiService';
import { saveLocation, getSavedLocation } from './services/dbService';
import { WeatherData, LocationState, AlertSeverity } from './types';
import LiveMap from './components/LiveMap';
import AlarmSystem from './components/AlarmSystem';
import Settings from './components/Settings';

type TabType = 'home' | 'agent' | 'maps' | 'alerts' | 'settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [location, setLocation] = useState<LocationState>({
    lat: null, lng: null, address: 'جاري التحديد...', loading: true, error: null
  });
  const [isAlarmMuted, setIsAlarmMuted] = useState(false);

  const updateWeather = useCallback(async (lat: number, lng: number, manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const rawData = await fetchOpenMeteoData(lat, lng);
      const shouldCallAI = manual || !weather || (lastSyncTime && (new Date().getTime() - lastSyncTime.getTime() > 1800000));
      
      if (shouldCallAI) {
        const data = await fetchLiveWeatherData(lat, lng, rawData);
        setWeather(data);
        setLastSyncTime(new Date());
      } else {
        setWeather(prev => prev ? {
          ...prev, temp: rawData.temp, humidity: rawData.humidity,
          windSpeed: rawData.windSpeed, timestamp: new Date().toLocaleTimeString('ar-SA')
        } : null);
      }
      setLocation(prev => ({ ...prev, loading: false, error: null }));
    } catch (err) {
      setLocation(prev => ({ ...prev, error: 'فشل المزامنة', loading: false }));
    } finally {
      if (manual) setTimeout(() => setIsRefreshing(false), 800);
    }
  }, [weather, lastSyncTime]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setLocation(prev => ({ ...prev, loading: true }));
    try {
      const resolved = await resolveLocationCoords(searchQuery);
      const newLoc = { lat: resolved.lat, lng: resolved.lng, address: resolved.name, loading: false, error: null };
      setLocation(newLoc);
      updateWeather(resolved.lat, resolved.lng, true);
      await saveLocation(newLoc);
    } catch (err) {
      setLocation(prev => ({ ...prev, error: 'لم يتم العثور على الموقع', loading: false }));
    }
  };

  const requestLocation = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude, address: 'الموقع الحالي', loading: false, error: null });
        updateWeather(latitude, longitude, true);
      },
      () => setLocation(prev => ({ ...prev, error: "GPS معطل", loading: false })),
      { enableHighAccuracy: true }
    );
  }, [updateWeather]);

  useEffect(() => {
    const init = async () => {
      const saved = await getSavedLocation();
      if (saved?.lat && saved?.lng) {
        setLocation({ lat: saved.lat, lng: saved.lng, address: saved.address || 'موقع محفوظ', loading: false, error: null });
        updateWeather(saved.lat, saved.lng, true);
      } else {
        requestLocation();
      }
    };
    init();
  }, []);

  const activeHighestSeverity = (weather?.alerts || []).reduce((max, alert) => {
    const weights = { [AlertSeverity.LOW]: 1, [AlertSeverity.MEDIUM]: 2, [AlertSeverity.HIGH]: 3, [AlertSeverity.CRITICAL]: 4 };
    const sev = alert.severity as AlertSeverity;
    return (weights[sev] || 0) > (max ? weights[max] : 0) ? sev : max;
  }, null as AlertSeverity | null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 pb-32 font-['Tajawal']">
      
      <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600/10 backdrop-blur-md border-b border-red-500/20 py-2 overflow-hidden flex items-center">
         <div className="bg-red-600 text-white text-[8px] font-black px-3 py-1 rounded-l-lg z-10 whitespace-nowrap shadow-lg">عاجل: المخاطر</div>
         <div className="animate-marquee whitespace-nowrap flex gap-10 text-[10px] font-bold text-red-500/80 mr-4">
            <span>⚠️ تنبيه: منخفض جوي قادم من الشمال</span>
            <span>📡 رصد نشاط زلزالي في القطاع الغربي</span>
            <span>🚨 تحذير: جودة الهواء منخفضة في المناطق الصناعية</span>
            <span>🛡️ درع الطقس: النظام في حالة تأهب قصوى</span>
         </div>
      </div>

      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mt-12 mb-10 gap-6 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center border border-blue-400/30 shadow-2xl">
             <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white italic">WEATHER<span className="text-blue-500">SHIELD</span></h1>
            <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase">مركز العمليات: {lastSyncTime?.toLocaleTimeString('ar-SA') || 'SCANNING'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button onClick={() => setIsAlarmMuted(!isAlarmMuted)} className={`px-6 py-3 rounded-full font-black text-[10px] border transition-all ${isAlarmMuted ? 'bg-red-600 border-red-400 shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
             {isAlarmMuted ? 'إنذار صامت' : 'إنذار نشط'}
           </button>
           <button onClick={() => setActiveTab('settings')} className="px-4 py-3 rounded-full bg-slate-800 text-slate-200 font-black text-[10px]">⚙️ إعدادات</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
                <form onSubmit={handleSearch} className="mb-4">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث عن قطاع..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 focus:border-blue-500 text-right font-black" />
                </form>
                <div className="flex gap-2">
                   <button onClick={requestLocation} className="flex-1 py-3 bg-slate-950 rounded-xl text-[9px] font-black text-slate-500 border border-slate-800 hover:bg-slate-800 transition-colors">تحديد الموقع</button>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden group">
                <p className="text-2xl font-black text-white mb-6 truncate">{weather?.location || location.address}</p>
                <div className="flex items-end gap-2 mb-10">
                  <span className="text-[100px] font-black leading-none tracking-tighter group-hover:text-blue-500 transition-colors">{weather?.temp ?? '--'}</span>
                  <span className="text-4xl text-slate-600 mb-2">°م</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                    <p className="text-slate-700 text-[8px] font-black uppercase">الرطوبة</p>
                    <p className="font-black text-2xl text-blue-500">{weather?.humidity}%</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center">
                    <p className="text-slate-700 text-[8px] font-black uppercase">الرياح</p>
                    <p className="font-black text-xl text-green-500">{weather?.windSpeed}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-10 backdrop-blur-3xl">
                   <h3 className="text-xl font-black text-white mb-6 uppercase">التحليل البيئي</h3>
                   <p className="text-slate-300 font-bold leading-relaxed text-lg mb-6">{weather?.riskAnalysis || "بانتظار التحليل الاستراتيجي..."}</p>
                   <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex justify-between">
                      <div>
                         <p className="text-[10px] font-black text-slate-500">جودة الهواء</p>
                         <p className="font-black" style={{ color: weather?.aqi?.color }}>{weather?.aqi?.label}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-500">النشاط الزلزالي</p>
                         <p className="font-black text-slate-300">{weather?.seismic?.activity}</p>
                      </div>
                   </div>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] p-8">
                   <h3 className="text-sm font-black text-green-500 mb-6 uppercase tracking-widest">الإجراءات الوقائية</h3>
                   <ul className="space-y-4">
                      {weather?.protocols.slice(0, 4).map((p, i) => (
                        <li key={i} className="flex gap-3 text-slate-400 font-bold text-sm">
                           <span className="text-green-500">✔</span> {p}
                        </li>
                      )) || <li className="text-slate-700 italic">بانتظار البيانات...</li>}
                   </ul>
                </div>
              </div>

              <LiveMap lat={location.lat} lng={location.lng} severity={activeHighestSeverity} />
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex flex-col md:flex-row justify-between items-baseline mb-10 gap-4">
                <h2 className="text-4xl font-black text-white italic underline decoration-blue-500">سجل التهديدات النشطة</h2>
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest bg-slate-900 px-4 py-2 rounded-full border border-slate-800">توقيت النظام: ميلادي</span>
             </div>
             {weather?.alerts && weather.alerts.length > 0 ? (
               weather.alerts.map(alert => (
                 <div key={alert.id} className="bg-slate-900 border-r-8 p-8 rounded-3xl shadow-xl flex flex-col md:flex-row gap-6 items-center group hover:bg-slate-800/80 transition-all duration-300" 
                      style={{ borderRightColor: alert.severity === 'CRITICAL' ? '#ef4444' : '#f97316' }}>
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 ${alert.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>
                       <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <div className="flex-1">
                       <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="px-3 py-1 rounded-full text-[8px] font-black bg-white/10 uppercase">{alert.type}</span>
                          <span className="text-[10px] font-black text-red-500 uppercase">{alert.severity}</span>
                          <div className="flex items-center gap-1.5 text-slate-500 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 ml-auto">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                             <span className="text-[10px] font-black font-mono">{alert.timestamp}</span>
                          </div>
                       </div>
                       <h3 className="text-2xl font-black text-white mb-2">{alert.title}</h3>
                       <p className="text-slate-400 font-bold leading-relaxed">{alert.description}</p>
                    </div>
                 </div>
               ))
             ) : (
               <div className="text-center py-20 bg-slate-900/50 rounded-[3rem] border border-slate-800 border-dashed">
                  <p className="text-slate-600 font-black uppercase tracking-widest text-lg">لا توجد تهديدات نشطة في هذا القطاع</p>
                  <p className="text-slate-700 text-sm mt-2 font-bold">النظام يراقب باستمرار على مدار الساعة</p>
               </div>
             )}
          </div>
        )}

        {activeTab === 'maps' && (
          <LiveMap lat={location.lat} lng={location.lng} isFullPage={true} severity={activeHighestSeverity} />
        )}

        {activeTab === 'agent' && (
          <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 p-12 rounded-[3rem] shadow-2xl">
             <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center animate-pulse">
                   <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <div>
                   <h2 className="text-4xl font-black text-white italic">نظام الاستخبارات Gemini</h2>
                   <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">تحديث البيانات: {weather?.timestamp}</p>
                </div>
             </div>
             <div className="space-y-10">
                <div className="prose prose-invert max-w-none">
                   <p className="text-2xl text-slate-300 font-bold leading-relaxed mb-10">{weather?.riskAnalysis}</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                         <h4 className="text-blue-500 font-black mb-4 uppercase">توقعات البنية التحتية</h4>
                         <p className="text-slate-400 font-bold">{weather?.infrastructureImpact}</p>
                      </div>
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                         <h4 className="text-green-500 font-black mb-4 uppercase">مصادر البيانات</h4>
                         <p className="text-slate-400 font-bold">تم الدمج بين رادارات RainViewer وبيانات Open-Meteo و USGS.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto mt-6">
            <Settings />
          </div>
        )}
      </main>

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-xl bg-slate-900/90 backdrop-blur-3xl border border-slate-700/50 p-2 rounded-full grid grid-cols-4 items-center shadow-2xl z-50">
        {[
          { id: 'home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'الرئيسية' },
          { id: 'agent', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: 'الذكاء' },
          { id: 'maps', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', label: 'الخرائط' },
          { id: 'alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'الإنذارات' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} 
                  className={`flex flex-col items-center py-3 transition-all rounded-full relative group ${activeTab === tab.id ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={tab.icon}/></svg>
            <span className="text-[7px] font-black mt-1 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{tab.label}</span>
            {tab.id === 'alerts' && weather?.alerts && weather.alerts.length > 0 && (
              <span className="absolute top-2 right-1/4 w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
            )}
          </button>
        ))}
      </footer>

      <AlarmSystem activeSeverity={isAlarmMuted ? null : activeHighestSeverity} />
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;
