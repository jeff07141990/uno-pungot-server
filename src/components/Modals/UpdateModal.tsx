import React from 'react';
import { DownloadCloud, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { AppVersionInfo, CURRENT_APP_VERSION } from '../../services/versionService';

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: AppVersionInfo | null;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, updateInfo, onClose }) => {
  if (!isOpen || !updateInfo) return null;

  const handleUpdate = () => {
    let targetUrl = updateInfo.downloadUrl;
    if (!targetUrl || targetUrl.includes('/file/d/')) {
      targetUrl = 'https://drive.google.com/uc?export=download&id=19GnR9qJ17DcFMGZWBZyaOtEuHDBYLGJP';
    }
    // Open system downloader/external browser
    window.open(targetUrl, '_system');

    // Also trigger hidden anchor for direct APK download stream
    try {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = `UNO-Pungot-v${updateInfo.latestVersion}.apk`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {}

    // Close modal immediately so player stays inside the game
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(16,185,129,0.3)] flex flex-col gap-5">
        
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer z-10 shadow"
          title="Mamaya na"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center shadow-lg border-2 border-white/90 shrink-0 animate-bounce">
            <DownloadCloud className="w-7 h-7 text-slate-950" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Bagong Bersyon ang Available!</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide mt-1">
              v{updateInfo.latestVersion} Update
            </h2>
          </div>
        </div>

        {/* Current vs New Version Pill */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Kasalukuyan:</span>
            <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 font-mono font-bold">v{CURRENT_APP_VERSION}</span>
          </div>
          <span className="text-emerald-400 font-bold">➔</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Pinakabago:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">v{updateInfo.latestVersion}</span>
          </div>
        </div>

        {/* Release Notes */}
        <div className="space-y-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mga Bagong Pagbabago:</p>
          <div className="space-y-2 text-sm text-slate-200">
            {updateInfo.releaseNotes.map((note, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleUpdate}
            className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <DownloadCloud className="w-5 h-5 text-slate-950" />
            <span>I-Download & I-Update Ngayon</span>
          </button>
          <button
            onClick={onClose}
            className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Mamaya Na
          </button>
        </div>

      </div>
    </div>
  );
};
