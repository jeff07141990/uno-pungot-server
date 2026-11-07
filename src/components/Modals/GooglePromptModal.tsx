import React, { useState } from 'react';
import { ShieldCheck, Sparkles, X } from 'lucide-react';
import { signInWithGoogle, firebaseState } from '../../firebase/config';

interface GooglePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GooglePromptModal: React.FC<GooglePromptModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await signInWithGoogle();
      if (user) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Hindi matagumpay ang Google Sign-In.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-[440px] max-h-[92vh] overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-center space-y-2.5 sm:space-y-3.5">
        
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 p-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          title="Isara"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Tag */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg border-2 border-white/80 mb-1.5">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
            <span>Bagong Update: Account Protection</span>
          </div>
        </div>

        <div>
          <h2 className="text-base sm:text-xl font-black text-white tracking-wide leading-tight">
            I-SAVE ANG IYONG ACCOUNT!
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-snug">
            I-bind ang iyong account sa <b className="text-white">Google</b> para <span className="text-amber-300 font-bold">hindi mawala ang iyong Coins, Level, at Game Records</span> kahit mag-update o mag-restart ng cellphone!
          </p>
        </div>

        {/* Benefits list */}
        <div className="p-2 sm:p-3 bg-slate-950/80 rounded-xl border border-slate-800/90 text-left space-y-1.5 text-[10.5px] sm:text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Permanente ang Level, XP, at Virtual Peso Coins</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Naka-save sa internal storage ng cellphone (Walang data limit)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Hindi magre-reset kahit ma-close sa gitna ng laban</span>
          </div>
        </div>

        {error && (
          <div className="p-2 bg-red-950/70 border border-red-500/50 rounded-lg text-red-200 text-[10.5px] sm:text-xs font-semibold leading-tight">
            {error}
          </div>
        )}

        {/* Main Action Button */}
        <div className="pt-1 space-y-1.5">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(255,255,255,0.4)] transition flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loading ? 'Kinokonekta sa Google...' : 'I-bind ang Aking Google Account'}</span>
          </button>

          <button
            onClick={onClose}
            className="text-[10px] sm:text-xs text-slate-400 hover:text-slate-200 font-semibold transition py-0.5 block w-full cursor-pointer"
          >
            Mamaya na (Manatili bilang Guest)
          </button>
        </div>

      </div>
    </div>
  );
};
