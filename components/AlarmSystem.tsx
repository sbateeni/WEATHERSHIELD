
import React, { useEffect, useRef, useState } from 'react';
import { AlertSeverity } from '../types';

interface AlarmSystemProps {
  activeSeverity: AlertSeverity | null;
}

const AlarmSystem: React.FC<AlarmSystemProps> = ({ activeSeverity }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [shouldPlay, setShouldPlay] = useState(false);

  // التحكم في مدة الـ 15 ثانية
  useEffect(() => {
    if (activeSeverity) {
      setShouldPlay(true);
      const timer = setTimeout(() => {
        setShouldPlay(false);
      }, 15000); // 15 ثانية

      return () => {
        clearTimeout(timer);
        setShouldPlay(false);
      };
    } else {
      setShouldPlay(false);
    }
  }, [activeSeverity]);

  const playAlarm = (frequency: number, duration: number) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  useEffect(() => {
    if (!activeSeverity || !shouldPlay) return;

    let interval: any;
    if (activeSeverity === AlertSeverity.CRITICAL || activeSeverity === AlertSeverity.HIGH) {
      interval = setInterval(() => {
        playAlarm(880, 0.4); 
        setTimeout(() => playAlarm(660, 0.4), 200);
      }, 800);
    } else if (activeSeverity === AlertSeverity.MEDIUM) {
      interval = setInterval(() => {
        playAlarm(440, 0.5);
      }, 2500);
    }

    return () => clearInterval(interval);
  }, [activeSeverity, shouldPlay]);

  return null;
};

export default AlarmSystem;
