// Gojek Fleet Partner Portal sync — super_admin console feature.
// Mirrors BE `gojek-portal-sync/gojek-portal-sync-presenter.ts`.

export type SyncTrigger = 'schedule' | 'manual';
export type SyncStatus = 'running' | 'success' | 'failed';

export type GojekPortalSyncSettings = {
  email: string | null;
  /** A password is on file — its value is never sent to the browser. */
  hasPassword: boolean;
  isEnabled: boolean;
  /** HH:mm WIB, 30-minute steps. */
  runAt: string;
  /** 1..7 */
  lookbackDays: number;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
  updatedByName: string | null;
  /** GOJEK_PORTAL_ENCRYPTION_KEY is registered on the server. */
  encryptionConfigured: boolean;
};

export type GojekPortalSyncSettingsInput = {
  email: string;
  /** Empty = keep the stored password. */
  password?: string;
  isEnabled: boolean;
  runAt: string;
  lookbackDays: number;
};

export type GojekPortalSyncRun = {
  id: number;
  trigger: SyncTrigger;
  status: SyncStatus;
  dateFrom: string;
  dateTo: string;
  reportId: number | null;
  filename: string | null;
  importedRows: number | null;
  skippedRows: number | null;
  importIds: number[];
  message: string | null;
  triggeredBy: number | null;
  triggeredByName: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type GojekPortalSyncStatus = {
  isEnabled: boolean;
  hasCredentials: boolean;
  encryptionConfigured: boolean;
  lastVerifiedAt: string | null;
  lastSuccess: GojekPortalSyncRun | null;
  lastRun: GojekPortalSyncRun | null;
  runningRun: GojekPortalSyncRun | null;
  todayScheduledAttempts: number;
  nextScheduledAt: string | null;
};

export const TRIGGER_LABELS: Record<SyncTrigger, string> = {
  schedule: 'Jadwal',
  manual: 'Manual',
};

export const STATUS_LABELS: Record<SyncStatus, string> = {
  running: 'Berjalan',
  success: 'Berhasil',
  failed: 'Gagal',
};

export const MAX_LOOKBACK_DAYS = 7;
export const MAX_RANGE_DAYS = 31;

/** Every HH:00 / HH:30 of the day — the only schedule times the backend accepts. */
export const RUN_AT_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  return `${h}:${i % 2 === 0 ? '00' : '30'}`;
});
