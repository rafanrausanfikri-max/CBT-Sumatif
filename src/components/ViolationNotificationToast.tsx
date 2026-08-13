import React, { useEffect, useState, useRef } from 'react';
import { ViolationLog } from '../types';
import { subscribeViolationLogs } from '../services/examService';
import { AlertOctagon, X, Volume2, VolumeX } from 'lucide-react';

export const ViolationNotificationToast: React.FC = () => {
  const [activeToast, setActiveToast] = useState<ViolationLog | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Track IDs of violation logs that have already been shown as toast
  const seenLogIdsRef = useRef<Set<string>>(new Set());
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Synthesize notification chime using Web Audio API
  const playAlertSound = () => {
    if (!soundEnabledRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn('Audio feedback skipped:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeViolationLogs((newLogs) => {
      if (newLogs.length === 0) return;

      const latest = newLogs[0];
      const logId = latest.id || `${latest.timestamp}_${latest.studentName}`;

      // Only display toast if this log hasn't been shown before and is unread
      if (!seenLogIdsRef.current.has(logId) && !latest.read) {
        seenLogIdsRef.current.add(logId);

        // Check if log is recent (within 15 seconds)
        const logTime = new Date(latest.timestamp).getTime();
        const now = Date.now();
        if (now - logTime < 15000) {
          setActiveToast(latest);
          playAlertSound();
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  if (!activeToast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-rose-500/80 rounded-2xl p-4 shadow-2xl shadow-rose-950/50 animate-in slide-in-from-bottom-5 text-slate-100 flex items-start space-x-3">
      <div className="p-2 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 shrink-0">
        <AlertOctagon className="w-5 h-5 animate-pulse" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            Peringatan Pelanggaran Real-Time
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Matikan Suara' : 'Aktifkan Suara'}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setActiveToast(null)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-xs font-bold text-white leading-tight">
          Siswa <span className="text-indigo-300">{activeToast.studentName}</span> ({activeToast.studentClass || 'Siswa'})
        </p>

        <p className="text-[11px] text-rose-300 bg-rose-950/40 p-2 rounded-lg border border-rose-900/60 font-medium">
          {activeToast.description}
        </p>

        <p className="text-[10px] text-slate-500 font-mono">
          {new Date(activeToast.timestamp).toLocaleTimeString('id-ID')}
        </p>
      </div>
    </div>
  );
};
