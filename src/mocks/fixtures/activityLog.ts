// Deterministic activity-log fixture (audit trail across both audiences).

const ACTIONS = [
  'auth.login.success',
  'auth.login.failure',
  'auth.logout',
  'auth.password_change',
  'mutation.create',
  'mutation.update',
  'mutation.delete',
] as const;

const ACTORS = [
  { email: 'admin@fleet-taxi.id', name: 'Super Admin', audience: 'admin', partnerId: null },
  { email: 'staff@fleet-taxi.id', name: 'Staff Admin', audience: 'admin', partnerId: null },
  { email: 'bhisa@partner.id', name: 'BHISA Rental', audience: 'partner', partnerId: 1 },
] as const;

const PATHS: Record<string, string> = {
  'auth.login.success': '/admin/auth/login',
  'auth.login.failure': '/admin/auth/login',
  'auth.logout': '/admin/auth/logout',
  'auth.password_change': '/auth/change-password',
  'mutation.create': '/admin/fleet/gojek/imports',
  'mutation.update': '/admin/fleet/gojek/targets/B1000XYZ',
  'mutation.delete': '/partner/portal/plates/3',
};

export function makeActivityLogs(count = 137) {
  return Array.from({ length: count }, (_, i) => {
    const actor = ACTORS[i % ACTORS.length];
    const action = ACTIONS[i % ACTIONS.length];
    const failed = action === 'auth.login.failure';
    const day = 28 - (i % 28);
    return {
      id: count - i,
      audience: actor.audience,
      actorId: failed ? null : (i % ACTORS.length) + 1,
      actorEmail: actor.email,
      actorName: failed ? null : actor.name,
      partnerId: actor.partnerId,
      action,
      method: action.startsWith('auth') ? 'POST' : action.endsWith('delete') ? 'DELETE' : 'POST',
      path: PATHS[action],
      resourceSummary: action === 'mutation.update' ? '{"plate":"B1000XYZ"}' : null,
      status: failed ? 'failure' : 'success',
      statusCode: failed ? 401 : 200,
      ip: `10.0.0.${(i % 40) + 1}`,
      userAgent: 'Mozilla/5.0',
      createdAt: `2026-06-${String(day).padStart(2, '0')}T0${i % 10}:1${i % 6}:00.000Z`,
    };
  });
}
