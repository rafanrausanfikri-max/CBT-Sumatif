import React from 'react';
import { ShieldCheck, User, Users, BellRing, Lock, Monitor, Smartphone } from 'lucide-react';
import { AppMode } from '../types';

interface NavbarProps {
  mode: AppMode;
  onModeChange: (newMode: AppMode) => void;
  unreadViolationsCount: number;
  isInExam: boolean;
  onOpenAdminLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  onModeChange,
  unreadViolationsCount,
  isInExam,
  onOpenAdminLogin
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg tracking-tight text-slate-100">CBT Sumatif Pro</h1>
              <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded-full border border-indigo-500/30 font-medium">
                v2.6 Secure
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Sistem Asesmen Sumatif Anti-Kecurangan Real-Time
            </p>
          </div>
        </div>

        {/* Device Compatibility Status & Mode Switcher */}
        <div className="flex items-center space-x-3">
          {/* Compatibility Badges */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs text-slate-300">
            <div className="flex items-center space-x-1" title="Kompatibel Android & iOS">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">Mobile</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center space-x-1" title="Kompatibel Laptop & PC Desktop">
              <Monitor className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-medium">Desktop</span>
            </div>
          </div>

          {!isInExam ? (
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => onModeChange('student')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'student'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Portal Siswa</span>
              </button>

              <button
                onClick={() => {
                  if (mode === 'student') {
                    onOpenAdminLogin();
                  } else {
                    onModeChange('admin');
                  }
                }}
                className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Dashboard Guru</span>
                {unreadViolationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadViolationsCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-semibold animate-pulse">
              <Lock className="w-3.5 h-3.5" />
              <span>Sesi Ujian Aktif (Lockdown)</span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
