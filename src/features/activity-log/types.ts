// Activity log (audit trail) — admin console + partner portal accounts.

export type ActivityLogAudience = 'admin' | 'partner';

export type ActivityLogAction =
  | 'auth.login.success'
  | 'auth.login.failure'
  | 'auth.logout'
  | 'auth.password_change'
  | 'mutation.create'
  | 'mutation.update'
  | 'mutation.delete';

export type ActivityLog = {
  id: number;
  audience: ActivityLogAudience;
  actorId: number | null;
  actorEmail: string;
  actorName: string | null;
  partnerId: number | null;
  action: string;
  method: string;
  path: string;
  resourceSummary: string | null;
  status: 'success' | 'failure';
  statusCode: number | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type ActivityLogFilters = {
  audience?: ActivityLogAudience;
  actor?: string;
  action?: ActivityLogAction;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export const ACTION_LABELS: Record<ActivityLogAction, string> = {
  'auth.login.success': 'Login berhasil',
  'auth.login.failure': 'Login gagal',
  'auth.logout': 'Logout',
  'auth.password_change': 'Ganti password',
  'mutation.create': 'Membuat data',
  'mutation.update': 'Mengubah data',
  'mutation.delete': 'Menghapus data',
};
