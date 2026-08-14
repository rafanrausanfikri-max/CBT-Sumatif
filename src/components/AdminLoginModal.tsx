import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminPin: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminPin
}) => {
  const [inputPin, setInputPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (inputPin.trim() === adminPin) {
      onSuccess();
      setInputPin('');
      onClose();
    } else {
      setErrorMsg('PIN Administrator / Guru salah!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-2xl relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 text-indigo-400">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Login Dashboard Guru</h3>
            <p className="text-xs text-slate-400">Masukkan PIN Otorisasi Pengawas</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              PIN Guru {adminPin === '123456' ? '(Default: 123456)' : ''}
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                placeholder="Masukkan PIN Guru..."
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 font-medium">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition"
          >
            Masuk Dashboard Guru
          </button>
        </form>

      </div>
    </div>
  );
};
