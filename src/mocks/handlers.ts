import { http, HttpResponse } from 'msw';
import {
  makeGojekGrid,
  makeGrabGrid,
  makeGojekGlobalSummary,
  makeGojekCharts,
  makeDriverActivity,
  makePerformers,
  scopeGojekGrid,
  scopeGrabGrid,
  importBatches,
} from './fixtures/fleet';
import { partnerMe, adminMe, superAdminMe, seedPartnerPlates } from './fixtures/partner';

// Single mock layer for dev (VITE_USE_MSW=true) and tests (frontend-kickoff.md §9).
// All responses use the standard envelope from PROJECT-BRIEF.md §6.
// Paths start with `*` so the same handlers match both the dev proxy base
// (/api/...) and the absolute test base (http://localhost:3000/...).

const ok = <T>(data: T, meta?: { page: number; pageSize: number; total: number }) =>
  HttpResponse.json(meta ? { success: true, data, meta } : { success: true, data });

const err = (status: number, code: string, message: string) =>
  HttpResponse.json({ success: false, error: { code, message } }, { status });

const int = (v: string | null, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// ---- Mock cookie-session state ----------------------------------------------
// Emulates the backend's session: `me` is 401 until login. Persisted in
// sessionStorage in the browser (survives HMR/reload); in-memory under Node.
type MockUser = typeof partnerMe | typeof adminMe | typeof superAdminMe;
const SESSION_KEY = 'msw:session-user';
let memoryUser: MockUser | null = null;

const getSessionUser = (): MockUser | null => {
  if (typeof sessionStorage === 'undefined') return memoryUser;
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
  } catch {
    return null;
  }
};

export const setSessionUser = (user: MockUser | null) => {
  memoryUser = user;
  if (typeof sessionStorage !== 'undefined') {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_KEY);
  }
};

// ---- Mock import-batch state (upload → processing → done, rollback) ---------
type MockBatch = Omit<(typeof importBatches)[number], 'status'> & {
  status: 'pending' | 'processing' | 'done' | 'failed';
  error: string | null;
};
const batchState: MockBatch[] = importBatches.map((b) => ({ ...b }));
let nextImportId = 100;

// ---- Mock exception state ----------------------------------------------------
type MockException = {
  id: number;
  vehiclePlate: string;
  exceptionDate: string;
  keterangan: string | null;
  isBebasSetoran: boolean;
};
const exceptionState: MockException[] = [
  { id: 1, vehiclePlate: 'B1003XYZ', exceptionDate: '2026-06-10', keterangan: 'maintenance', isBebasSetoran: true },
  { id: 2, vehiclePlate: 'B1007XYZ', exceptionDate: '2026-06-12', keterangan: 'rental', isBebasSetoran: false },
];
let nextExceptionId = 100;

// A "Manual Payment tanpa plat" synthetic row (backend key manual_<detailId>):
// blank plate → "Tanpa Plat" badge, purple display-only cell, Edit Manual Payment.
const manualNoPlateRow = {
  plateNorm: 'manual_90001',
  plateRaw: '',
  driverName: 'AGUS WIJAYA',
  rentalPartner: '',
  regionName: '-',
  vehicleType: '',
  deliveryBatch: '',
  carId: null,
  detailId: 90001,
  dailyTarget: 488_000,
  days: {
    8: {
      day: 8,
      displayAmount: 81_600,
      countedAmount: 0,
      isManualPayment: true,
      hasDisplayOnlyManualPayment: true,
      exception: null,
      detail: {
        plateNorm: 'manual_90001',
        day: 8,
        displayTotal: 81_600,
        countedTotal: 0,
        hasDisplayOnlyManualPayment: true,
        items: [
          {
            label: 'Manual Payment (Tidak Masuk Setoran)',
            displayAmount: 81_600,
            countedAmount: 0,
            note: 'promo cashback',
            isDisplayOnly: true,
          },
        ],
      },
    },
  },
  summary: { totalDeduction: 0, calculatedTarget: 0, gap: 0, outstanding: 0 },
  driverHistory: ['AGUS WIJAYA'],
};

// ---- Mock partner-plate registration state (Daftarkan Plat) ------------------
type MockPlate = {
  id: number;
  plateNumber: string;
  plateNumberNorm: string;
  vehicleType: string | null;
};
const normPlate = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
let platesState: MockPlate[] = seedPartnerPlates.map((p) => ({ ...p }));
let nextPlateId = 100;
const registeredNorms = () => new Set(platesState.map((p) => p.plateNumberNorm));

/** Reset registered plates to the seed (call between tests for isolation). */
export const resetPartnerPlates = () => {
  platesState = seedPartnerPlates.map((p) => ({ ...p }));
  nextPlateId = 100;
};

// ---- Mock user-management state (super_admin: create/list users & partners) --
type MockPartner = { id: number; code: string; name: string; type: string | null; isActive: boolean; createdAt: string };
type MockManagedUser = {
  id: number;
  email: string;
  fullName: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  roles: string[];
  createdAt: string;
  lastLoginAt: string | null;
  partner: { id: number; code: string; name: string; type: string | null } | null;
};

const seedPartners: MockPartner[] = [
  { id: 7, code: 'BHISA', name: 'Bhisa Shuttle', type: 'shuttle', isActive: true, createdAt: '2026-05-01T03:00:00.000Z' },
];
const seedManagedUsers: MockManagedUser[] = [
  { id: 1, email: 'admin@fleet-taxi.id', fullName: 'Fleet Admin', isActive: true, mustChangePassword: false, roles: ['admin'], createdAt: '2026-05-01T03:00:00.000Z', lastLoginAt: '2026-07-04T09:00:00.000Z', partner: null },
  { id: 42, email: 'ops@bhisa.id', fullName: 'Bhisa Operations', isActive: true, mustChangePassword: false, roles: ['partner'], createdAt: '2026-05-02T03:00:00.000Z', lastLoginAt: null, partner: { id: 7, code: 'BHISA', name: 'Bhisa Shuttle', type: 'shuttle' } },
];

let partnersState: MockPartner[] = seedPartners.map((p) => ({ ...p }));
let managedUsersState: MockManagedUser[] = seedManagedUsers.map((u) => ({ ...u }));
let nextManagedUserId = 1000;
let nextPartnerId = 1000;

/** Reset user-management state to the seed (call between tests for isolation). */
export const resetUserManagement = () => {
  partnersState = seedPartners.map((p) => ({ ...p }));
  managedUsersState = seedManagedUsers.map((u) => ({ ...u }));
  nextManagedUserId = 1000;
  nextPartnerId = 1000;
};

// super_admin gate for the mock user-management endpoints (mirrors CASL on the BE).
const requireSuperAdmin = () => {
  const user = getSessionUser();
  if (!user || !user.roles.includes('super_admin')) {
    return err(403, 'FORBIDDEN', 'Super admin required');
  }
  return null;
};

export const handlers = [
  // ---- Admin fleet — grids -------------------------------------------------
  http.get('*/admin/fleet/gojek/grid', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const grid = makeGojekGrid(month, year);
    // The SERVER returns the filtered pivot (kickoff §5) — emulate that here.
    const partners = url.searchParams.getAll('rentalPartner');
    const plate = url.searchParams.get('plate')?.toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Inject one "Manual Payment tanpa plat" synthetic row so the dashboard shows
    // the purple cell + "Tanpa Plat" badge + Edit Manual Payment action.
    let rows = [manualNoPlateRow, ...grid.rows];
    if (partners.length) rows = rows.filter((r) => partners.includes(r.rentalPartner));
    if (plate) rows = rows.filter((r) => r.plateNorm.includes(plate));
    return ok({ ...grid, rows });
  }),

  // Monthly aggregates for the /admin dashboard (kept off the heavy pivot).
  http.get('*/admin/fleet/gojek/summary', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const dayParam = url.searchParams.get('day');
    const grid = makeGojekGrid(month, year);
    return ok({
      globalSummary: makeGojekGlobalSummary(grid),
      driverActivity: makeDriverActivity(grid, dayParam ? Number(dayParam) : undefined),
      charts: makeGojekCharts(grid),
    });
  }),

  http.get('*/admin/fleet/grab/grid', ({ request }) => {
    const url = new URL(request.url);
    const grid = makeGrabGrid(
      int(url.searchParams.get('month'), 6),
      int(url.searchParams.get('year'), 2026),
    );
    const partners = url.searchParams.getAll('rentalPartner');
    const plate = url.searchParams.get('plate')?.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let rows = grid.rows;
    if (partners.length) rows = rows.filter((r) => partners.includes(r.rentalPartner));
    if (plate) rows = rows.filter((r) => r.plateNumber.includes(plate));
    return ok({ ...grid, rows });
  }),

  http.get('*/admin/fleet/gojek/cell', ({ request }) => {
    const url = new URL(request.url);
    const plate = url.searchParams.get('plate') ?? 'B1000XYZ';
    const day = int(url.searchParams.get('day'), 1);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    // Return the SAME breakdown the pivot cell was built from (brief §2.A).
    const grid = makeGojekGrid(month, year);
    const row = grid.rows.find((r) => r.plateNorm === plate);
    const detail = row?.days[day]?.detail;
    if (detail) return ok(detail);
    return ok({
      plateNorm: plate,
      day,
      displayTotal: 0,
      countedTotal: 0,
      hasDisplayOnlyManualPayment: false,
      items: [],
    });
  }),

  // Grab: driver performance detail (legacy "eye" modal) — whole-month stats.
  http.get('*/admin/fleet/grab/cell', ({ request }) => {
    const url = new URL(request.url);
    const compositeKey = url.searchParams.get('compositeKey') ?? 'B2000GRB|Jakarta|Budi Santoso';
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const grid = makeGrabGrid(month, year);
    const row = grid.rows.find((r) => r.compositeKey === compositeKey) ?? grid.rows[0];
    return ok({
      compositeKey,
      driverName: row.driverName,
      plateNumber: row.plateNumber,
      phone: row.driverPhone,
      onlineHours: row.summary.onlineHours,
      bookings: row.summary.bookings,
      rides: row.summary.rides,
      cancelByDriver: row.summary.cancellations,
      fulfillmentRate: row.summary.fulfillmentRate,
      cancellationRate: row.summary.cancellationRate,
      fare: row.summary.driverFare,
      toll: row.summary.tollAndOthers,
      incentive: row.summary.incentive,
      earning: row.summary.earning,
    });
  }),

  // ---- Admin fleet — imports (stateful: async parse simulated by polling) ----
  http.get('*/admin/fleet/:platform/imports', () =>
    ok([...batchState].sort((a, b) => b.id - a.id)),
  ),

  http.post('*/admin/fleet/:platform/imports', async ({ request, params }) => {
    const fd = await request.formData();
    const file = fd.get('file') as File | string | null;
    const month = Number(fd.get('month'));
    const year = Number(fd.get('year'));
    // duck-type: under vitest the parsed File is undici's, not jsdom's global
    if (!file || typeof file === 'string' || typeof file.name !== 'string' || !month || !year) {
      return err(422, 'VALIDATION_ERROR', 'file, month, dan year wajib diisi');
    }
    const id = nextImportId++;
    batchState.push({
      id,
      filename: file.name,
      periodMonth: month,
      periodYear: year,
      status: 'processing',
      totalRows: 8_000,
      processed: 0,
      percent: 0,
      importedBy: 1,
      uploaderName: `${params.platform} admin`,
      error: null,
      createdAt: new Date().toISOString(),
    });
    return HttpResponse.json({ success: true, data: { importId: id } }, { status: 201 });
  }),

  http.get('*/admin/fleet/:platform/imports/:id', ({ params }) => {
    const batch = batchState.find((b) => String(b.id) === params.id);
    if (!batch) return err(404, 'NOT_FOUND', 'Import batch not found');
    // each status poll advances the "queued job" by 25%
    if (batch.status === 'processing') {
      batch.processed = Math.min(batch.totalRows, batch.processed + batch.totalRows / 4);
      batch.percent = Math.round((batch.processed / batch.totalRows) * 100);
      if (batch.processed >= batch.totalRows) batch.status = 'done';
    }
    return ok({ ...batch });
  }),

  http.delete('*/admin/fleet/:platform/imports/:id', ({ params }) => {
    const idx = batchState.findIndex((b) => String(b.id) === params.id);
    if (idx === -1) return err(404, 'NOT_FOUND', 'Import batch not found');
    batchState.splice(idx, 1); // rollback removes the whole batch
    return HttpResponse.json(
      { success: true, data: { importId: Number(params.id), status: 'rollback_queued' } },
      { status: 202 },
    );
  }),

  // ---- Admin fleet — import detail edit (assign plate / toggle setoran) ------
  http.get('*/admin/fleet/gojek/details/:detailId', ({ params }) =>
    ok({
      id: Number(params.detailId),
      driverName: 'BUDI SANTOSO',
      vehiclePlate: null,
      vehiclePlateNorm: null,
      type: 'Manual Payment',
      isManualPayment: true,
      isManualPaymentSetoran: 1,
      manualPaymentNote: null,
      periodMonth: 7,
      periodYear: 2026,
    }),
  ),
  http.post('*/admin/fleet/gojek/edit-driver', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return ok({ updated: body?.detailId != null ? 1 : 0 });
  }),

  // ---- Admin fleet — targets / exceptions / performers ----------------------
  http.get('*/admin/fleet/:platform/targets/:plate', ({ params }) =>
    ok({
      vehiclePlate: `B ${String(params.plate).replace(/\D/g, '')} XYZ`,
      vehiclePlateNorm: String(params.plate),
      driverName: 'Budi Santoso',
      vehicleType: 'Avanza',
      fleetTarget: 488_000,
      rentalPartner: 'BHISA',
      deliveryBatch: 'B1',
      serviceArea: 'JABODETABEK',
      regionId: 1,
      city: null,
    }),
  ),

  http.put('*/admin/fleet/:platform/targets/:plate', async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return ok({
      vehiclePlate: String(params.plate),
      vehiclePlateNorm: String(params.plate),
      fleetTarget: 488_000,
      ...body,
    });
  }),

  http.get('*/admin/fleet/gojek/exceptions', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    return ok(exceptionState.filter((e) => e.exceptionDate.startsWith(prefix)));
  }),

  http.post('*/admin/fleet/gojek/exceptions', async ({ request }) => {
    const body = (await request.json()) as Partial<MockException>;
    if (!body.vehiclePlate || !body.exceptionDate) {
      return err(422, 'VALIDATION_ERROR', 'vehiclePlate dan exceptionDate wajib diisi');
    }
    const created: MockException = {
      id: nextExceptionId++,
      vehiclePlate: body.vehiclePlate,
      exceptionDate: body.exceptionDate,
      keterangan: body.keterangan ?? null,
      isBebasSetoran: body.isBebasSetoran ?? false,
    };
    exceptionState.push(created);
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.delete('*/admin/fleet/gojek/exceptions/:id', ({ params }) => {
    const idx = exceptionState.findIndex((e) => String(e.id) === params.id);
    if (idx === -1) return err(404, 'NOT_FOUND', 'Exception not found');
    exceptionState.splice(idx, 1);
    return ok({ deleted: true });
  }),

  http.get('*/admin/fleet/:platform/performers', ({ request, params }) => {
    const url = new URL(request.url);
    const platform = params.platform === 'grab' ? 'grab' : 'gojek';
    return ok(
      makePerformers(platform, int(url.searchParams.get('month'), 6), int(url.searchParams.get('year'), 2026)),
    );
  }),

  // ---- Partner portal --------------------------------------------------------
  // ---- Admin auth (separate surface from the partner portal) ----------------
  http.post('*/admin/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return err(422, 'VALIDATION_ERROR', 'email dan password wajib diisi');
    }
    if (body.password === 'wrong') {
      return err(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
    }
    setSessionUser(adminMe); // admin login only ever yields an admin session
    return ok(adminMe);
  }),

  http.post('*/admin/auth/logout', () => {
    setSessionUser(null);
    return ok({ loggedOut: true });
  }),

  http.get('*/admin/auth/me', () => {
    const user = getSessionUser();
    // audience check: only an admin/super_admin session resolves here
    if (!user || !user.roles.some((r) => r === 'admin' || r === 'super_admin')) {
      return err(401, 'UNAUTHENTICATED', 'Admin login required');
    }
    return ok(user);
  }),

  // ---- Partner portal auth --------------------------------------------------
  http.post('*/partner/portal/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return err(422, 'VALIDATION_ERROR', 'email dan password wajib diisi');
    }
    if (body.password === 'wrong') {
      return err(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
    }
    setSessionUser(partnerMe); // partner login only ever yields a partner session
    return ok(partnerMe);
  }),

  http.post('*/partner/portal/logout', () => {
    setSessionUser(null);
    return ok({ loggedOut: true });
  }),

  http.get('*/partner/portal/me', () => {
    const user = getSessionUser();
    // audience check: only a partner session resolves here
    if (!user || !user.roles.includes('partner')) {
      return err(401, 'UNAUTHENTICATED', 'Partner login required');
    }
    return ok(user);
  }),

  // ---- First-login / self-service password change ---------------------------
  http.post('*/auth/change-password', async ({ request }) => {
    const user = getSessionUser();
    if (!user) return err(401, 'UNAUTHENTICATED', 'Not authenticated');
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    if (!body.currentPassword || !body.newPassword) {
      return err(422, 'VALIDATION_ERROR', 'currentPassword dan newPassword wajib diisi');
    }
    if (body.newPassword.length < 8) {
      return err(400, 'VALIDATION_ERROR', 'newPassword minimal 8 karakter');
    }
    if (body.currentPassword === 'wrong') {
      return err(401, 'UNAUTHENTICATED', 'Password saat ini salah');
    }
    const updated = { ...user, mustChangePassword: false };
    setSessionUser(updated);
    return ok(updated);
  }),

  // ---- Admin user management (super_admin only) -----------------------------
  http.get('*/admin/users', ({ request }) => {
    const denied = requireSuperAdmin();
    if (denied) return denied;
    const type = new URL(request.url).searchParams.get('type') === 'partner' ? 'partner' : 'admin';
    const rows = managedUsersState.filter((u) => (type === 'partner' ? u.partner !== null : u.partner === null));
    return ok(rows, { page: 1, pageSize: 50, total: rows.length });
  }),

  http.post('*/admin/users', async ({ request }) => {
    const denied = requireSuperAdmin();
    if (denied) return denied;
    const body = (await request.json()) as { email?: string; fullName?: string; password?: string; roles?: string[] };
    const email = (body.email ?? '').trim().toLowerCase();
    if (!email || !body.fullName?.trim() || !body.roles?.length) {
      return err(422, 'VALIDATION_ERROR', 'email, fullName, dan roles wajib diisi');
    }
    if ((body.password ?? '').length < 8) {
      return err(400, 'VALIDATION_ERROR', 'password minimal 8 karakter');
    }
    if (managedUsersState.some((u) => u.email === email)) {
      return err(409, 'CONFLICT', 'Email already in use');
    }
    const created: MockManagedUser = {
      id: nextManagedUserId++,
      email,
      fullName: body.fullName.trim(),
      isActive: true,
      mustChangePassword: true,
      roles: [...body.roles].sort(),
      createdAt: '2026-07-05T04:00:00.000Z',
      lastLoginAt: null,
      partner: null,
    };
    managedUsersState.push(created);
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get('*/admin/partners', () => {
    const denied = requireSuperAdmin();
    if (denied) return denied;
    return ok([...partnersState].sort((a, b) => a.code.localeCompare(b.code)));
  }),

  http.post('*/admin/partners', async ({ request }) => {
    const denied = requireSuperAdmin();
    if (denied) return denied;
    const body = (await request.json()) as { code?: string; name?: string; type?: string };
    const code = (body.code ?? '').trim().toUpperCase();
    if (!code || !body.name?.trim()) {
      return err(422, 'VALIDATION_ERROR', 'code dan name wajib diisi');
    }
    if (partnersState.some((p) => p.code === code)) {
      return err(409, 'CONFLICT', 'Partner code already in use');
    }
    const created: MockPartner = {
      id: nextPartnerId++,
      code,
      name: body.name.trim(),
      type: body.type?.trim() || null,
      isActive: true,
      createdAt: '2026-07-05T04:00:00.000Z',
    };
    partnersState.push(created);
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.post('*/admin/partners/:id/users', async ({ request, params }) => {
    const denied = requireSuperAdmin();
    if (denied) return denied;
    const partner = partnersState.find((p) => String(p.id) === params.id);
    if (!partner) return err(404, 'NOT_FOUND', 'Partner not found');
    const body = (await request.json()) as { email?: string; fullName?: string; password?: string };
    const email = (body.email ?? '').trim().toLowerCase();
    if (!email || !body.fullName?.trim()) {
      return err(422, 'VALIDATION_ERROR', 'email dan fullName wajib diisi');
    }
    if ((body.password ?? '').length < 8) {
      return err(400, 'VALIDATION_ERROR', 'password minimal 8 karakter');
    }
    if (managedUsersState.some((u) => u.email === email)) {
      return err(409, 'CONFLICT', 'Email already in use');
    }
    const created: MockManagedUser = {
      id: nextManagedUserId++,
      email,
      fullName: body.fullName.trim(),
      isActive: true,
      mustChangePassword: true,
      roles: ['partner'],
      createdAt: '2026-07-05T04:00:00.000Z',
      lastLoginAt: null,
      partner: { id: partner.id, code: partner.code, name: partner.name, type: partner.type },
    };
    managedUsersState.push(created);
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.post('*/admin/partners/:id/api-keys', async ({ params }) => {
    const denied = requireSuperAdmin();
    if (denied) return denied;
    const partner = partnersState.find((p) => String(p.id) === params.id);
    if (!partner) return err(404, 'NOT_FOUND', 'Partner not found');
    const rawKey = `ftk_${'mockkey'.padEnd(40, '0')}`;
    return HttpResponse.json(
      { success: true, data: { id: nextManagedUserId++, keyPrefix: rawKey.slice(0, 12), rawKey } },
      { status: 201 },
    );
  }),

  // ---- Partner portal — Daftarkan Plat (registered plates) -----------------
  http.get('*/partner/portal/plates', () =>
    ok([...platesState].sort((a, b) => a.plateNumberNorm.localeCompare(b.plateNumberNorm))),
  ),

  http.post('*/partner/portal/plates', async ({ request }) => {
    const body = (await request.json()) as { plateNumber?: string; vehicleType?: string };
    const norm = normPlate(body.plateNumber ?? '');
    if (!norm) return err(400, 'VALIDATION_ERROR', 'Nomor plat tidak valid');
    if (platesState.some((p) => p.plateNumberNorm === norm)) {
      return err(409, 'CONFLICT', 'Plat sudah terdaftar');
    }
    const created: MockPlate = {
      id: nextPlateId++,
      plateNumber: (body.plateNumber ?? '').trim(),
      plateNumberNorm: norm,
      vehicleType: body.vehicleType?.trim() || null,
    };
    platesState.push(created);
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.delete('*/partner/portal/plates/:id', ({ params }) => {
    const idx = platesState.findIndex((p) => String(p.id) === params.id);
    if (idx === -1) return err(404, 'NOT_FOUND', 'Plat tidak ditemukan');
    platesState.splice(idx, 1);
    return ok({ deleted: true });
  }),

  // ---- Partner portal — read-only fleet (scoped to registered plates) ------
  http.get('*/partner/portal/fleet/gojek/grid', ({ request }) => {
    const url = new URL(request.url);
    const grid = makeGojekGrid(
      int(url.searchParams.get('month'), 6),
      int(url.searchParams.get('year'), 2026),
    );
    return ok(scopeGojekGrid(grid, registeredNorms()));
  }),

  http.get('*/partner/portal/fleet/gojek/summary', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const dayParam = url.searchParams.get('day');
    const grid = scopeGojekGrid(makeGojekGrid(month, year), registeredNorms());
    return ok({
      globalSummary: makeGojekGlobalSummary(grid),
      driverActivity: makeDriverActivity(grid, dayParam ? Number(dayParam) : undefined),
      charts: makeGojekCharts(grid),
    });
  }),

  http.get('*/partner/portal/fleet/gojek/cell', ({ request }) => {
    const url = new URL(request.url);
    const plate = url.searchParams.get('plate') ?? '';
    const day = int(url.searchParams.get('day'), 1);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    if (!registeredNorms().has(plate)) {
      return err(404, 'NOT_FOUND', 'No transactions for that vehicle/day');
    }
    const detail = makeGojekGrid(month, year).rows.find((r) => r.plateNorm === plate)?.days[day]
      ?.detail;
    if (!detail) return err(404, 'NOT_FOUND', 'No transactions for that vehicle/day');
    return ok(detail);
  }),

  http.get('*/partner/portal/fleet/grab/grid', ({ request }) => {
    const url = new URL(request.url);
    const grid = makeGrabGrid(
      int(url.searchParams.get('month'), 6),
      int(url.searchParams.get('year'), 2026),
    );
    return ok(scopeGrabGrid(grid, registeredNorms()));
  }),

  http.get('*/partner/portal/fleet/grab/cell', ({ request }) => {
    const url = new URL(request.url);
    const compositeKey = url.searchParams.get('compositeKey') ?? '';
    const grid = makeGrabGrid(
      int(url.searchParams.get('month'), 6),
      int(url.searchParams.get('year'), 2026),
    );
    const row = grid.rows.find((r) => r.compositeKey === compositeKey);
    if (!row || !registeredNorms().has(row.plateNumber)) {
      return err(404, 'NOT_FOUND', 'No data for that key');
    }
    return ok({
      compositeKey,
      driverName: row.driverName,
      plateNumber: row.plateNumber,
      phone: row.driverPhone,
      onlineHours: row.summary.onlineHours,
      bookings: row.summary.bookings,
      rides: row.summary.rides,
      cancelByDriver: row.summary.cancellations,
      fulfillmentRate: row.summary.fulfillmentRate,
      cancellationRate: row.summary.cancellationRate,
      fare: row.summary.driverFare,
      toll: row.summary.tollAndOthers,
      incentive: row.summary.incentive,
      earning: row.summary.earning,
    });
  }),
];
