import React from 'react';
import { Cloud, ArrowDownCircle, RefreshCw, X } from 'lucide-react';

interface CloudSyncPromptModalProps {
  isOpen: boolean;
  cloudDateStr?: string;
  onSyncNow: () => void;
  onKeepLocal: () => void;
}

export const CloudSyncPromptModal: React.FC<CloudSyncPromptModalProps> = ({
  isOpen,
  cloudDateStr,
  onSyncNow,
  onKeepLocal,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-sync-title"
    >
      <div className="w-full max-w-md bg-[#1e1e1e] border border-zinc-800 rounded-[16px] p-6 shadow-2xl space-y-4 relative">
        <button
          type="button"
          onClick={onKeepLocal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Dismiss cloud sync prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-[#03dac6]/20 to-[#bb86fc]/20 text-[#03dac6]">
            <Cloud className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 id="cloud-sync-title" className="text-lg font-black text-white">
              Newer cloud backup found. Sync now?
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              A more recent backup from Google Drive is available{cloudDateStr ? ` (${cloudDateStr})` : ''}.
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-300 bg-[#141414] p-3 rounded-xl border border-zinc-800 leading-relaxed">
          Would you like to synchronize and load the newer workout logs and Accuniq body scans from Google Drive onto this device?
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onKeepLocal}
            className="px-4 py-2.5 rounded-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
          >
            Keep Local
          </button>
          <button
            type="button"
            onClick={onSyncNow}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-[12px] bg-gradient-to-r from-[#03dac6] to-[#bb86fc] text-black font-extrabold text-xs sm:text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#03dac6]/20"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Sync Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
