import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  DailyWorkout,
  CustomExercise,
  UserProfile,
  AccuniqMetric,
} from '../types/workout.ts';
import {
  getDailyWorkouts,
  getExerciseLibrary,
  getUserProfile,
  getAccuniqMetrics,
} from './storage.ts';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Google Drive Scopes requested:
// drive.appdata guarantees privacy: app only reads/writes its private hidden appDataFolder
const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token cache (never stored in localStorage for security)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const STORAGE_KEYS = {
  DAILY_LOGS: 'titanload_daily_logs_v3',
  ACCUNIQ_METRICS: 'titanload_accuniq_metrics_v3',
  EXERCISE_LIBRARY: 'titanload_exercise_library_v3',
  USER_PROFILE: 'titanload_user_profile_v3',
  LAST_SYNCED_AT: 'vulcan_last_synced_at',
  GDRIVE_CONNECTED: 'vulcan_gdrive_connected',
};

export const BACKUP_FILENAME = 'vulcan_app_data.json';

export interface VulcanBackupPayload {
  version: string;
  lastUpdated: number;
  exportedAt: string;
  userProfile: UserProfile;
  dailyWorkouts: Record<string, DailyWorkout>;
  exerciseLibrary: CustomExercise[];
  accuniqMetrics: AccuniqMetric[];
}

/**
 * Initialize Google Auth State Listener.
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not cached yet (e.g. page refresh) - wait for explicit interaction or re-auth
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google Identity Services & Firebase Auth to obtain Google Drive access token.
 */
export const signInWithGoogleDrive = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not retrieve Google Drive OAuth access token.');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem(STORAGE_KEYS.GDRIVE_CONNECTED, 'true');
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out and clear cached credentials.
 */
export const signOutGoogleDrive = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Error signing out:', e);
  } finally {
    cachedAccessToken = null;
    localStorage.removeItem(STORAGE_KEYS.GDRIVE_CONNECTED);
  }
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const isGoogleDriveConnected = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.GDRIVE_CONNECTED) === 'true';
};

export const getLastSyncedTimestamp = (): number | null => {
  const raw = localStorage.getItem(STORAGE_KEYS.LAST_SYNCED_AT);
  return raw ? parseInt(raw, 10) : null;
};

export const setLastSyncedTimestamp = (timestamp: number): void => {
  localStorage.setItem(STORAGE_KEYS.LAST_SYNCED_AT, String(timestamp));
};

/**
 * Formats timestamp for UI status display (e.g. "Today at 9:30 AM", "Yesterday at 4:15 PM")
 */
export function formatSyncTimestamp(timestamp: number | null): string {
  if (!timestamp) return 'Not synced yet';

  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  } else {
    const month = date.toLocaleString('default', { month: 'short' });
    return `${month} ${date.getDate()} at ${timeStr}`;
  }
}

/**
 * Build unified backup payload from current LocalStorage
 */
export function buildBackupPayload(): VulcanBackupPayload {
  const userProfile = getUserProfile();
  const dailyWorkouts = getDailyWorkouts();
  const exerciseLibrary = getExerciseLibrary();
  const accuniqMetrics = getAccuniqMetrics();

  // Find latest modification timestamp
  let latestTs = userProfile.updatedAt || Date.now();
  Object.values(dailyWorkouts).forEach((w) => {
    w.weightliftingEntries.forEach((e) => {
      if (e.timestamp && e.timestamp > latestTs) latestTs = e.timestamp;
    });
    w.cardioEntries.forEach((c) => {
      if (c.timestamp && c.timestamp > latestTs) latestTs = c.timestamp;
    });
  });
  accuniqMetrics.forEach((m) => {
    if (m.timestamp && m.timestamp > latestTs) latestTs = m.timestamp;
  });

  return {
    version: '1.0.0',
    lastUpdated: latestTs,
    exportedAt: new Date().toISOString(),
    userProfile,
    dailyWorkouts,
    exerciseLibrary,
    accuniqMetrics,
  };
}

/**
 * Restore payload into LocalStorage
 */
export function restoreBackupPayload(payload: VulcanBackupPayload): void {
  if (!payload) return;

  if (payload.dailyWorkouts) {
    localStorage.setItem(
      STORAGE_KEYS.DAILY_LOGS,
      JSON.stringify(payload.dailyWorkouts)
    );
  }
  if (payload.exerciseLibrary) {
    localStorage.setItem(
      STORAGE_KEYS.EXERCISE_LIBRARY,
      JSON.stringify(payload.exerciseLibrary)
    );
  }
  if (payload.userProfile) {
    localStorage.setItem(
      STORAGE_KEYS.USER_PROFILE,
      JSON.stringify(payload.userProfile)
    );
  }
  if (payload.accuniqMetrics) {
    localStorage.setItem(
      STORAGE_KEYS.ACCUNIQ_METRICS,
      JSON.stringify(payload.accuniqMetrics)
    );
  }

  setLastSyncedTimestamp(Date.now());
}

/**
 * Find existing vulcan_app_data.json file in Google Drive AppData folder
 */
async function findAppDataFile(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILENAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime,size)`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Drive search error:', errorText);
    throw new Error(`Google Drive API search failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Push current local data to Google Drive AppData folder
 */
export async function pushBackupToDrive(): Promise<{
  success: boolean;
  timestamp: number;
}> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive. Please connect first.');
  }

  const payload = buildBackupPayload();
  const fileId = await findAppDataFile(token);

  if (fileId) {
    // Update existing file
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload, null, 2),
    });

    if (!response.ok) {
      throw new Error(`Failed to update backup file on Drive: ${response.status}`);
    }
  } else {
    // Create new file inside appDataFolder using multipart upload
    const boundary = '-------vulcan-boundary-314159265';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
      parents: ['appDataFolder'],
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(payload, null, 2) +
      closeDelimiter;

    const createUrl =
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed creating backup file on Drive: ${err}`);
    }
  }

  const syncTime = Date.now();
  setLastSyncedTimestamp(syncTime);
  return { success: true, timestamp: syncTime };
}

/**
 * Pull latest backup from Google Drive AppData folder
 */
export async function pullBackupFromDrive(): Promise<VulcanBackupPayload | null> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Drive. Please connect first.');
  }

  const fileId = await findAppDataFile(token);
  if (!fileId) {
    return null;
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download backup file from Drive: ${response.status}`);
  }

  const payload: VulcanBackupPayload = await response.json();
  restoreBackupPayload(payload);
  return payload;
}

/**
 * Check if newer cloud backup exists on Google Drive
 */
export async function checkForNewerCloudBackup(): Promise<{
  hasNewerCloudBackup: boolean;
  cloudPayload?: VulcanBackupPayload;
  cloudDateStr?: string;
}> {
  const token = getDriveAccessToken();
  if (!token) {
    return { hasNewerCloudBackup: false };
  }

  try {
    const fileId = await findAppDataFile(token);
    if (!fileId) {
      return { hasNewerCloudBackup: false };
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { hasNewerCloudBackup: false };
    }

    const cloudPayload: VulcanBackupPayload = await response.json();
    const localPayload = buildBackupPayload();

    // Check if cloud payload has newer changes than local
    if (cloudPayload.lastUpdated > localPayload.lastUpdated) {
      return {
        hasNewerCloudBackup: true,
        cloudPayload,
        cloudDateStr: formatSyncTimestamp(cloudPayload.lastUpdated),
      };
    }

    return { hasNewerCloudBackup: false, cloudPayload };
  } catch (e) {
    console.warn('Silent check for cloud backup failed:', e);
    return { hasNewerCloudBackup: false };
  }
}

/**
 * Background auto-sync trigger: non-blocking, pushes updated payload if connected
 */
export function triggerBackgroundAutoSync(): void {
  const token = getDriveAccessToken();
  if (!token) return;

  // Run in background without throwing unhandled exceptions
  pushBackupToDrive()
    .then(() => {
      console.log('Vulcan auto-synced to Google Drive successfully.');
    })
    .catch((err) => {
      console.warn('Vulcan background auto-sync failed:', err);
    });
}
