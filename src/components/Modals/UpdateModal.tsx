import React, { useState, useRef } from 'react';
import { DownloadCloud, Sparkles, X, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { AppVersionInfo, CURRENT_APP_VERSION } from '../../services/versionService';

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: AppVersionInfo | null;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, updateInfo, onClose }) => {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen || !updateInfo) return null;

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus('Nagsisimula ang download mula sa Google Drive...');
    setDownloadError(null);

    const targetUrl = updateInfo.downloadUrl || 'https://uno-pungot-server.onrender.com/download/uno-latest.apk';

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(targetUrl, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      // Check total size if provided by headers (approx 888 MB / 931 MB fallback)
      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 931163738;

      if (!response.body) {
        // Fallback: direct window open if body stream is not available
        window.open(targetUrl, '_system');
        setIsDownloading(false);
        setDownloadProgress(null);
        return;
      }

      const reader = response.body.getReader();
      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
        const receivedMb = (receivedBytes / (1024 * 1024)).toFixed(1);
        const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

        setDownloadProgress(percent);
        setDownloadStatus(`Dina-download: ${receivedMb} MB / ${totalMb} MB (${percent}%)`);
      }

      setDownloadProgress(100);
      setDownloadStatus('Tapos na ang download! Binubuksan ang APK installer...');

      // Combine chunks and trigger file save/installation
      const blob = new Blob(chunks as any[], { type: 'application/vnd.android.package-archive' });
      const blobUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = `UNO-Pungot-v${updateInfo.latestVersion}.apk`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 30000);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        setDownloadStatus('Kinansela ang pag-download.');
      } else {
        console.error('Download stream error:', err);
        setDownloadError('Maaaring i-block ng browser ang cross-origin background streaming. Pindutin ang "Buksan sa Browser" upang i-download nang direkta.');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenDirectInBrowser = () => {
    const directUrl = updateInfo.downloadUrl || 'https://uno-pungot-server.onrender.com/download/uno-latest.apk';
    window.open(directUrl, '_system');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(16,185,129,0.3)] flex flex-col gap-5">
        
        {/* Dismiss Button */}
        <button
          onClick={() => {
            if (isDownloading && abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer z-10 shadow"
          title="Isara"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center shadow-lg border-2 border-white/90 shrink-0">
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
        <div className="space-y-2 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 max-h-36 overflow-y-auto">
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

        {/* Live Download Progress Section */}
        {downloadProgress !== null && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/40 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                {downloadProgress < 100 ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                {downloadStatus}
              </span>
              <span className="text-white font-mono font-black text-sm">{downloadProgress}%</span>
            </div>

            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Fallback Notice */}
        {downloadError && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-2 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {!isDownloading && downloadProgress !== 100 ? (
            <button
              onClick={handleStartDownload}
              className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <DownloadCloud className="w-5 h-5 text-slate-950" />
              <span>I-Download Ngayon (May Progress)</span>
            </button>
          ) : downloadProgress === 100 ? (
            <button
              onClick={handleStartDownload}
              className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-950" />
              <span>I-Download Ulit</span>
            </button>
          ) : (
            <button
              disabled
              className="flex-1 py-3 px-5 rounded-2xl bg-slate-800 text-emerald-400 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 opacity-80 cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Dina-download sa App...</span>
            </button>
          )}

          {/* Direct External Browser Fallback */}
          <button
            onClick={handleOpenDirectInBrowser}
            className="py-3 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
            title="Buksan ang download link sa browser"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Buksan sa Browser</span>
          </button>

          <button
            onClick={() => {
              if (isDownloading && abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              onClose();
            }}
            className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Mamaya Na
          </button>
        </div>

      </div>
    </div>
  );
};
