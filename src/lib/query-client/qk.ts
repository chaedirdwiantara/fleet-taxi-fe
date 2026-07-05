// Query-key factory — one factory, no ad-hoc key strings anywhere
// (frontend-kickoff.md §8). Grid search params flow straight into
// qk.fleet.grid(...) so URL ↔ cache stay in lockstep.

export type Platform = 'gojek' | 'grab';

export const qk = {
  // separate auth surfaces (admin console vs partner portal)
  adminSession: ['session', 'admin'] as const,
  partnerSession: ['session', 'partner'] as const,

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

  partner: {
    me: ['partner', 'me'] as const,
    dashboard: ['partner', 'dashboard'] as const,
    orders: (p: { page: number; pageSize: number }) => ['partner', 'orders', p] as const,
    order: (id: string) => ['partner', 'order', id] as const,
  },
} as const;
