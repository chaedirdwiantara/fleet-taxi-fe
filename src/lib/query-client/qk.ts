// Query-key factory — one factory, no ad-hoc key strings anywhere
// (frontend-kickoff.md §8). Grid search params flow straight into
// qk.fleet.grid(...) so URL ↔ cache stay in lockstep.

export type Platform = 'gojek' | 'grab';
/** Row subject of a monitoring pivot; part of every grid/cell key because the
 * server returns different rows per mode. */
export type MonitoringMode = 'plate' | 'driver';

export const qk = {
  // separate auth surfaces (admin console vs partner portal)
  adminSession: ['session', 'admin'] as const,
  partnerSession: ['session', 'partner'] as const,

  // super_admin user-management area (create + list admin/partner accounts)
  admin: {
    users: (type: 'admin' | 'partner') => ['admin', 'users', type] as const,
    partners: ['admin', 'partners'] as const,
    // Plate Registration — the console's own plate registry (super_admin).
    // Mutating it changes the admin fleet scope, so it invalidates qk.fleet.all.
    plates: ['admin', 'plates'] as const,
    // Activity log (super_admin only) — audit trail across both audiences.
    activityLogs: (p: {
      page: number;
      audience?: string;
      actor?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
    }) => ['admin', 'activity-logs', p] as const,
  },

  fleet: {
    all: ['fleet'] as const, // invalidation prefix for every admin fleet query
    grid: (p: {
      platform: Platform;
      month: number;
      year: number;
      rentalPartner: string[];
      q?: string;
      vehicleType?: string[];
      mode?: MonitoringMode;
    }) => ['fleet', p.platform, 'grid', p] as const,
    cell: (p: {
      platform: Platform;
      key: string;
      day: number;
      month: number;
      year: number;
      mode?: MonitoringMode;
    }) => ['fleet', p.platform, 'cell', p] as const,
    imports: (platform: Platform) => ['fleet', platform, 'imports'] as const,
    importStatus: (platform: Platform, id: string) => ['fleet', platform, 'imports', id] as const,
    summary: (p: {
      platform: Platform;
      month: number;
      year: number;
      dateFrom?: string;
      dateTo?: string;
      rentalPartner?: string;
    }) => ['fleet', p.platform, 'summary', p] as const,
    target: (platform: Platform, plate: string) => ['fleet', platform, 'target', plate] as const,
    detail: (platform: Platform, detailId: number) =>
      ['fleet', platform, 'detail', detailId] as const,
    exceptions: (p: { month: number; year: number }) =>
      ['fleet', 'gojek', 'exceptions', p] as const,
  },

  // Partner portal: registered plates (Daftarkan Plat) + own scoped fleet views.
  partner: {
    me: ['partner', 'me'] as const,
    plates: ['partner', 'plates'] as const,
    checkpoint: {
      list: (p: {
        page: number;
        plate?: string;
        handoverType?: string;
        status?: string;
        month?: number;
        year?: number;
      }) => ['partner', 'checkpoint', 'list', p] as const,
      detail: (id: number) => ['partner', 'checkpoint', 'detail', id] as const,
      comparison: (id: number) => ['partner', 'checkpoint', 'comparison', id] as const,
    },
    // Cicilan — installment rules per driver, history derived by BE.
    cicilan: {
      all: ['partner', 'cicilan'] as const, // invalidation prefix for every cicilan query
      list: (p: {
        status?: string;
        search?: string;
        sortBy: string;
        sortOrder: string;
        page: number;
        pageSize: number;
      }) => ['partner', 'cicilan', 'list', p] as const,
      recap: (id: number) => ['partner', 'cicilan', 'recap', id] as const,
      driverOptions: ['partner', 'cicilan', 'driver-options'] as const,
      // Car Ownership Program report — nested under `cicilan` on purpose: it
      // reads the same rules, so any cicilan mutation must invalidate it too.
      cop: {
        list: (p: {
          status?: string;
          search?: string;
          sortBy: string;
          sortOrder: string;
          page: number;
          pageSize: number;
        }) => ['partner', 'cicilan', 'cop', 'list', p] as const,
      },
    },
    fleet: {
      all: ['partner', 'fleet'] as const, // invalidation prefix for every portal fleet query
      grid: (p: {
        platform: Platform;
        month: number;
        year: number;
        mode?: MonitoringMode;
        q?: string;
        vehicleType?: string[];
      }) => ['partner', 'fleet', p.platform, 'grid', p] as const,
      cell: (p: {
        platform: Platform;
        key: string;
        day: number;
        month: number;
        year: number;
        mode?: MonitoringMode;
      }) => ['partner', 'fleet', p.platform, 'cell', p] as const,
      // All Fleet Monitoring: the combined Gojek + Grab + Rental matrix.
      allGrid: (p: { month: number; year: number; mode: MonitoringMode }) =>
        ['partner', 'fleet', 'all', 'grid', p] as const,
      allCell: (p: {
        key: string;
        day: number;
        month: number;
        year: number;
        mode: MonitoringMode;
      }) => ['partner', 'fleet', 'all', 'cell', p] as const,
      summary: (p: {
        platform: Platform;
        month: number;
        year: number;
        dateFrom?: string;
        dateTo?: string;
      }) => ['partner', 'fleet', p.platform, 'summary', p] as const,
      exceptions: (p: { month: number; year: number }) =>
        ['partner', 'fleet', 'gojek', 'exceptions', p] as const,
    },
    // Driver management (roster auto-synced from Fleet Monitoring).
    driver: {
      drivers: (p: {
        q?: string;
        plate?: string;
        active?: string;
        resigned?: string;
        page: number;
      }) => ['partner', 'driver', 'list', p] as const,
      detail: (id: number) => ['partner', 'driver', 'detail', id] as const,
      /** Roster slice behind a name picker (server-side search term). */
      picker: (q: string) => ['partner', 'driver', 'picker', q] as const,
    },
    // Rental Monitoring (own rental transactions + COGS presets).
    rental: {
      list: (p: {
        month: number;
        year: number;
        region?: string;
        search?: string;
        sortBy: string;
        sortOrder: string;
      }) => ['partner', 'rental', 'list', p] as const,
      cogsDefaults: ['partner', 'rental', 'cogs-defaults'] as const,
      taxSettings: ['partner', 'rental', 'tax-settings'] as const,
    },
  },
} as const;
