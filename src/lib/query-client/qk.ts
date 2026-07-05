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
    summary: (p: { platform: Platform; month: number; year: number; day?: number }) =>
      ['fleet', p.platform, 'summary', p] as const,
    target: (platform: Platform, plate: string) =>
      ['fleet', platform, 'target', plate] as const,
    exceptions: (p: { month: number; year: number }) =>
      ['fleet', 'gojek', 'exceptions', p] as const,
  },

  // Partner portal: registered plates (Daftarkan Plat) + own scoped fleet views.
  partner: {
    me: ['partner', 'me'] as const,
    plates: ['partner', 'plates'] as const,
    fleet: {
      grid: (p: { platform: Platform; month: number; year: number }) =>
        ['partner', 'fleet', p.platform, 'grid', p] as const,
      cell: (p: { platform: Platform; key: string; day: number; month: number; year: number }) =>
        ['partner', 'fleet', p.platform, 'cell', p] as const,
      summary: (p: { month: number; year: number; day?: number }) =>
        ['partner', 'fleet', 'gojek', 'summary', p] as const,
    },
  },
} as const;
