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
import { partnerMe, adminMe, seedPartnerPlates } from './fixtures/partner';

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
type MockUser = typeof partnerMe | typeof adminMe;
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
    let rows = grid.rows;
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
      importedBy: `${params.platform}-admin@fleet-taxi.id`,
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
