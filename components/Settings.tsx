import React, { useEffect, useState } from 'react';

export default function Settings() {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle'|'saved'|'cleared'|'error'>('idle');

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') || '' : '';
      setKey(saved);
    } catch (err) {
      setStatus('error');
    }
  }, []);

  const save = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('GEMINI_API_KEY', key);
        setStatus('saved');
        setTimeout(() => setStatus('idle'), 1500);
      }
    } catch (err) {
      setStatus('error');
    }
  };

  const clearKey = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('GEMINI_API_KEY');
        setKey('');
        setStatus('cleared');
        setTimeout(() => setStatus('idle'), 1500);
      }
    } catch (err) {
      setStatus('error');
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setKey(text);
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8">
      <h2 className="text-2xl font-black text-white mb-4">إعدادات API</h2>
      <p className="text-slate-400 mb-6">أدخل مفتاح Gemini API هنا وسيتم حفظه في متصفحك محليًا فقط.</p>

      <label className="block text-slate-300 text-xs font-black mb-2">مفتاح API</label>
      <div className="flex gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="ادخل مفتاح الـ API"
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-100"
        />
        <button onClick={pasteFromClipboard} className="px-4 py-3 bg-slate-800 rounded-xl font-black text-[10px]">لصق</button>
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={save} className="px-6 py-3 bg-blue-600 rounded-xl font-black">حفظ</button>
        <button onClick={clearKey} className="px-6 py-3 bg-red-600 rounded-xl font-black">مسح</button>
      </div>

      <div className="mt-4 text-sm text-slate-400">
        {status === 'saved' && <div className="text-green-400">تم الحفظ محليًا ✅</div>}
        {status === 'cleared' && <div className="text-yellow-400">تمت الإزالة</div>}
        {status === 'error' && <div className="text-red-400">حدث خطأ أثناء العملية</div>}
      </div>

      <div className="mt-6 text-xs text-slate-500">ملاحظة: تخزين المفتاح في المتصفح مناسب للتجارب، لكنه أقل أمانًا مقارنةً بتخزينه في خادم خاص.</div>
    </div>
  );
}
