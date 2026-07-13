// Query-key factory — one factory, no ad-hoc key strings anywhere
// (frontend-kickoff.md §8). Grid search params flow straight into
// qk.fleet.grid(...) so URL ↔ cache stay in lockstep.

export type Platform = 'gojek' | 'grab';

export const qk = {
  // separate auth surfaces (admin console vs partner portal)
  adminSession: ['session', 'admin'] as const,
  partnerSession: ['session', 'partner'] as const,

  // super_admin user-management area (create + list admin/partner accounts)
  admin: {
    users: (type: 'admin' | 'partner') => ['admin', 'users', type] as const,
    partners: ['admin', 'partners'] as const,
  },

  fleet: {
    grid: (p: { platform: Platform; month: number; year: number; rentalPartner: string[]; plate?: string }) =>
      ['fleet', p.platform, 'grid', p] as const,
    cell: (p: { platform: Platform; key: string; day: number; month: number; year: number }) =>
      ['fleet', p.platform, 'cell', p] as const,
    imports: (platform: Platform) => ['fleet', platform, 'imports'] as const,
    importStatus: (platform: Platform, id: string) => ['fleet', platform, 'imports', id] as const,
    performers: (p: { platform: Platform; month: number; year: number }) =>
      ['fleet', p.platform, 'performers', p] as const,
    summary: (p: {
      platform: Platform;
      month: number;
      year: number;
      day?: number;
      rentalPartner?: string;
    }) => ['fleet', p.platform, 'summary', p] as const,
    target: (platform: Platform, plate: string) =>
      ['fleet', platform, 'target', plate] as const,
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
    // Debt Summary — the list params (filters/sort/pagination) key the cache.
    debt: {
      list: (p: {
        status?: string;
        cabang?: string;
        koordinator?: string;
        search?: string;
        sortBy: string;
        sortOrder: string;
        page: number;
        pageSize: number;
      }) => ['partner', 'debt', 'list', p] as const,
      filters: ['partner', 'debt', 'filters'] as const,
    },
    fleet: {
      grid: (p: { platform: Platform; month: number; year: number }) =>
        ['partner', 'fleet', p.platform, 'grid', p] as const,
      cell: (p: { platform: Platform; key: string; day: number; month: number; year: number }) =>
        ['partner', 'fleet', p.platform, 'cell', p] as const,
      summary: (p: { month: number; year: number; day?: number }) =>
        ['partner', 'fleet', 'gojek', 'summary', p] as const,
      exceptions: (p: { month: number; year: number }) =>
        ['partner', 'fleet', 'gojek', 'exceptions', p] as const,
    },
    // Driver management (roster auto-synced from Fleet Monitoring).
    driver: {
      drivers: (p: { q?: string; plate?: string; active?: string; resigned?: string; page: number }) =>
        ['partner', 'driver', 'list', p] as const,
      detail: (id: number) => ['partner', 'driver', 'detail', id] as const,
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
    },
  },
} as const;
