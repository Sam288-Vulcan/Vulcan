import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ShieldCheck,
  HardDrive,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  initDriveAuth,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  pushBackupToDrive,
  pullBackupFromDrive,
  getLastSyncedTimestamp,
  formatSyncTimestamp,
  getDriveAccessToken,
  isGoogleDriveConnected,
  BACKUP_FILENAME,
} from '../utils/googleDrive.ts';

interface CloudSyncCardProps {
  onDataRestored?: () => void;
}

export const CloudSyncCard: React.FC<CloudSyncCardProps> = ({ onDataRestored }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<number | null>(() =>
    getLastSyncedTimestamp()
  );
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [showPullConfirm, setShowPullConfirm] = useState<boolean>(false);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(!!token);
      },
      () => {
        setHasToken(false);
      }
    );

    // Initial check
    if (getDriveAccessToken()) {
      setHasToken(true);
    }

    return () => unsubscribe();
  }, []);

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Connect Google Drive via Google Identity Services
  const handleConnect = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const result = await signInWithGoogleDrive();
      if (result) {
        setCurrentUser(result.user);
        setHasToken(true);
        showStatus(
          'success',
          `Connected to Google Drive as ${result.user.email || 'user'}. Running initial sync...`
        );

        // Perform initial push to ensure cloud backup exists
        try {
          const res = await pushBackupToDrive();
          setLastSynced(res.timestamp);
          showStatus(
            'success',
            'Connected & initial backup pushed to Google Drive!'
          );
        } catch (pushErr) {
          console.warn('Initial push note:', pushErr);
        }
      }
    } catch (err: any) {
      console.error('Connection failed:', err);
      showStatus(
        'error',
        err.message || 'Failed connecting to Google Drive. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Disconnect Google Drive
  const handleDisconnect = async () => {
    setIsProcessing(true);
    try {
      await signOutGoogleDrive();
      setCurrentUser(null);
      setHasToken(false);
      showStatus('info', 'Disconnected from Google Drive. Local data remains saved.');
    } catch (err: any) {
      showStatus('error', err.message || 'Failed disconnecting.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Push to Cloud
  const handlePush = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await pushBackupToDrive();
      setLastSynced(res.timestamp);
      showStatus(
        'success',
        `Successfully backed up all Vulcan data to Google Drive!`
      );
    } catch (err: any) {
      showStatus('error', err.message || 'Failed pushing data to Google Drive.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Manual Pull from Cloud
  const handlePullConfirm = async () => {
    setShowPullConfirm(false);
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const payload = await pullBackupFromDrive();
      if (payload) {
        setLastSynced(Date.now());
        if (onDataRestored) {
          onDataRestored();
        }
        showStatus(
          'success',
          `Restored ${Object.keys(payload.dailyWorkouts || {}).length} workouts and ${
            payload.accuniqMetrics?.length || 0
          } Accuniq scans from Google Drive!`
        );
      } else {
        showStatus(
          'info',
          'No backup file found in Google Drive AppData yet. Try "Push to Cloud" first.'
        );
      }
    } catch (err: any) {
      showStatus('error', err.message || 'Failed pulling data from Google Drive.');
    } finally {
      setIsProcessing(false);
    }
  };

  const isConnected = hasToken && currentUser;

  return (
    <div className="bg-[#1e1e1e] border border-zinc-800/90 rounded-[12px] p-5 sm:p-6 shadow-xl space-y-5 relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-[#03dac6]/5 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-tr from-[#03dac6]/20 to-[#bb86fc]/20 text-[#03dac6]">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Cloud Sync & Storage
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#03dac6]/20 text-[#03dac6] border border-[#03dac6]/30">
                Google Drive v3
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Secure, private cloud auto-sync for your workouts, exercise library, and Accuniq scans.
            </p>
          </div>
        </div>

        {/* Connection status indicator */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#03dac6]/15 border border-[#03dac6]/30 text-[#03dac6] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#03dac6] animate-pulse" />
              <span>Connected & Auto-Sync Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <span>Disconnected (Offline Only)</span>
            </span>
          )}
        </div>
      </div>

      {/* Status Message / Toast */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs sm:text-sm animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-[#03dac6]/10 border-[#03dac6]/40 text-[#03dac6]'
              : statusMessage.type === 'error'
              ? 'bg-red-500/10 border-red-500/40 text-red-400'
              : 'bg-zinc-800 border-zinc-700 text-zinc-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Connection State View */}
      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#141414] border border-zinc-800 text-xs sm:text-sm text-zinc-300 space-y-2">
            <p className="leading-relaxed">
              Authenticate with your Google Account to enable automatic cloud backup. Vulcan writes strictly to your private{' '}
              <strong className="text-white">Google Drive AppData folder</strong> (<code className="text-[#03dac6] bg-zinc-900 px-1 py-0.5 rounded">{BACKUP_FILENAME}</code>), ensuring total privacy—Vulcan cannot view or edit any of your personal Drive files.
            </p>
            <div className="flex items-center gap-2 text-zinc-400 text-xs pt-1">
              <ShieldCheck className="w-4 h-4 text-[#03dac6]" />
              <span>Encrypted transfer via Google Identity Services & OAuth 2.0</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Official Google Material Sign-In Style Button */}
            <button
              type="button"
              onClick={handleConnect}
              disabled={isProcessing}
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white text-zinc-800 font-semibold text-xs sm:text-sm hover:bg-zinc-100 active:scale-95 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              aria-label="Connect Google Drive"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              <span>{isProcessing ? 'Connecting...' : 'Connect Google Drive'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User Account Info Bar */}
          <div className="p-3.5 rounded-xl bg-[#141414] border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google User'}
                  className="w-10 h-10 rounded-full border border-[#03dac6]/40 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#bb86fc] to-[#03dac6] text-black font-bold flex items-center justify-center text-sm">
                  {currentUser?.displayName
                    ? currentUser.displayName.slice(0, 2).toUpperCase()
                    : 'GD'}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  {currentUser?.displayName || 'Google Drive User'}
                </p>
                <p className="text-xs text-zinc-400">{currentUser?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors border border-zinc-700"
              aria-label="Disconnect Google Drive"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              <span>Disconnect</span>
            </button>
          </div>

          {/* Sync Metadata & Auto-Sync Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-[#121212] rounded-xl border border-zinc-800 flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#03dac6] flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Last Cloud Sync
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {formatSyncTimestamp(lastSynced)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-[#121212] rounded-xl border border-zinc-800 flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-[#bb86fc] flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Auto-Sync Behavior
                </span>
                <span className="text-xs font-semibold text-zinc-300">
                  Background push on every saved workout & scan
                </span>
              </div>
            </div>
          </div>

          {/* Manual Control Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePush}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#03dac6] hover:bg-[#1ae5d3] text-black font-extrabold text-xs sm:text-sm shadow-md shadow-[#03dac6]/20 active:scale-95 transition-all disabled:opacity-50"
              aria-label="Push to Cloud"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{isProcessing ? 'Pushing...' : 'Push to Cloud'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPullConfirm(true)}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs sm:text-sm active:scale-95 transition-all disabled:opacity-50"
              aria-label="Pull from Cloud"
            >
              <CloudDownload className="w-4 h-4 text-[#bb86fc]" />
              <span>Pull from Cloud</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Pull from Cloud */}
      {showPullConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#1e1e1e] border border-zinc-800 rounded-[16px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#bb86fc]/20 text-[#bb86fc]">
                <CloudDownload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Pull from Google Drive?</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  This will download and replace local storage with your cloud backup.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 bg-zinc-900/90 p-3 rounded-lg border border-zinc-800">
              Any unsaved changes on this device will be replaced with the data stored on Google Drive.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPullConfirm(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePullConfirm}
                className="px-4 py-2 rounded-lg bg-[#bb86fc] hover:bg-[#c99eff] text-black text-xs font-bold shadow-md shadow-[#bb86fc]/20"
              >
                Yes, Restore Cloud Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
