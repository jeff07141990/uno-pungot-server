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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[96vh] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400/80 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(245,158,11,0.3)] flex flex-col justify-between">
        
        {/* Dismiss X Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer z-10 shadow"
          title="Isara"
        >
          <X className="w-5 h-5" />
        </button>

        {/* SIDE-BY-SIDE CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8 items-center my-auto">
          
          {/* LEFT SIDE: Heading, Description & Benefits List */}
          <div className="md:col-span-7 text-left space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg border-2 border-white/90 shrink-0">
                <ShieldCheck className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Account Protection Update</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide leading-tight mt-0.5">
                  I-SAVE ANG IYONG ACCOUNT!
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              I-bind ang iyong account sa <b className="text-white">Google</b> para <span className="text-amber-300 font-bold">hindi mawala ang iyong Coins, Level, at Game Records</span> kahit mag-update o mag-restart ng cellphone!
            </p>

            {/* Benefits list */}
            <div className="p-3 sm:p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/90 space-y-2 text-xs">
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <span className="text-emerald-400 font-black text-sm">✓</span>
                <span>Permanente ang Level, XP, at Virtual Peso Coins</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <span className="text-emerald-400 font-black text-sm">✓</span>
                <span>Naka-save sa internal storage ng cellphone (Walang data limit)</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <span className="text-emerald-400 font-black text-sm">✓</span>
                <span>Hindi magre-reset kahit ma-close sa gitna ng laban</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Action Buttons & Error Message */}
          <div className="md:col-span-5 flex flex-col justify-center space-y-3 sm:space-y-3.5">
            {error && (
              <div className="p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold leading-relaxed text-center shadow">
                {error}
              </div>
            )}

            {/* Google Bind Primary Button */}
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs sm:text-sm shadow-[0_0_25px_rgba(255,255,255,0.4)] transition flex items-center justify-center gap-3 active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? 'Kinokonekta sa Google...' : 'I-bind ang Aking Google Account'}</span>
            </button>

            {/* Stay as Guest Styled Full Button */}
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow"
            >
              <span>🎮</span>
              <span>Manatili bilang Guest (Maglaro Agad)</span>
            </button>

            <p className="text-[10px] text-slate-400 text-center leading-tight">
              Maaari mo pa ring i-bind ang iyong Google account kahit kailan sa pamamagitan ng iyong Profile menu sa Home Screen.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
