import { http, HttpResponse } from 'msw';
import {
  makeGojekGrid,
  makeGrabGrid,
  makeGojekGlobalSummary,
  makeExitedDrivers,
  makeGojekCharts,
  makeDriverActivity,
  makeRangeSummary,
  scopeGojekGrid,
  scopeGrabGrid,
  pivotGojekByDriver,
  pivotGrabByDriver,
  importBatches,
} from './fixtures/fleet';
import { makeAllFleetCell, makeAllFleetGrid } from './fixtures/allFleet';
import { makeActivityLogs } from './fixtures/activityLog';
import {
  partnerMe,
  adminMe,
  superAdminMe,
  seedPartnerPlates,
  seedCheckpoints,
  makeCheckpointPoints,
  MOCK_PHOTO_URL,
  type MockCheckpoint,
  type MockCheckpointMedia,
} from './fixtures/partner';
import { seedRentals, seedCogsDefaults, type SeedRental } from './fixtures/rental';
import { seedDrivers, type SeedDriver, type SeedDriverDocument } from './fixtures/driver';
import {
  createInstallment,
  deleteInstallment,
  driverOptions,
  findRecap,
  queryInstallments,
  updateInstallment,
} from './fixtures/depositInstallment';
import type {
  InstallmentSortField,
  InstallmentStatus,
  InstallmentUpsertInput,
} from '@/features/deposit-installment/types';

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

/** Reading mode of a monitoring pivot; anything unexpected falls back to plate,
 * exactly like the backend's parseMonitoringMode. */
const readMode = (url: URL): 'plate' | 'driver' =>
  url.searchParams.get('mode') === 'driver' ? 'driver' : 'plate';

/**
 * The two TableFilterBar params. The SERVER filters the pivot (kickoff §5), so
 * the mock has to as well — the FE never filters rows itself.
 *
 * `q` is normalized twice, as a plate and as a driver name, and a row matches on
 * either; `vehicleType` matches when ANY of the row's plates is of a listed type
 * (in driver mode: "drove such a vehicle"). Both mirror the backend's rules,
 * including the case-insensitive type comparison.
 */
const readGridFilters = (url: URL) => {
  const raw = url.searchParams.get('q') ?? '';
  return {
    plateQuery: raw.toUpperCase().replace(/[^A-Z0-9]/g, ''),
    nameQuery: raw.trim().replace(/\s+/g, ' ').toUpperCase(),
    types: new Set(
      url.searchParams
        .getAll('vehicleType')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  };
};

/**
 * Types behind a Gojek row. A plate row has its own; a driver row has none of
 * its own, so the per-plate types from `availablePlates` are what the filter
 * (and the "PLAT - Tipe" label) read — same as the backend.
 */
const gojekRowTypes = (
  grid: { availablePlates: { plate: string; type: string }[] },
  row: { vehicleType: string; plateHistory?: string[] },
): string[] => {
  const byPlate = new Map(grid.availablePlates.map((p) => [p.plate, p.type]));
  const fromPlates = (row.plateHistory ?? []).map((p) => byPlate.get(p) ?? '').filter(Boolean);
  return fromPlates.length ? fromPlates : [row.vehicleType].filter(Boolean);
};

/** Grab carries the Car Model per plate, so a driver row is covered directly. */
const grabRowTypes = (row: {
  vehicleType: string;
  plateHistory?: { type?: string }[];
}): string[] => {
  const fromPlates = (row.plateHistory ?? []).map((p) => p.type ?? '').filter(Boolean);
  return fromPlates.length ? fromPlates : [row.vehicleType].filter(Boolean);
};

/** Apply those filters to any pivot row, given how to read its plates + types. */
function applyGridFilters<T extends { driverName: string }>(
  rows: T[],
  url: URL,
  read: { plates: (row: T) => string[]; types: (row: T) => string[] },
): T[] {
  const { plateQuery, nameQuery, types } = readGridFilters(url);
  let out = rows;
  if (plateQuery || nameQuery) {
    out = out.filter(
      (r) =>
        (plateQuery !== '' && read.plates(r).some((p) => p.includes(plateQuery))) ||
        (nameQuery !== '' && r.driverName.toUpperCase().includes(nameQuery)),
    );
  }
  if (types.size) {
    out = out.filter((r) => read.types(r).some((t) => types.has(t.trim().toLowerCase())));
  }
  return out;
}

/** The ?dateFrom&dateTo pair, or undefined for whole-period semantics —
 * incoherent pairs are dropped exactly like the backend's parseDateRange. */
const readRange = (url: URL): { dateFrom: string; dateTo: string } | undefined => {
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFrom || !dateTo || !iso.test(dateFrom) || !iso.test(dateTo)) return undefined;
  return dateFrom <= dateTo ? { dateFrom, dateTo } : undefined;
};

// ---- Grab summary aggregates (shared by the admin + partner handlers) --------

type GrabGridFixture = ReturnType<typeof makeGrabGrid>;

/** Whole-month cards + charts for a Grab pivot (mirrors toGrabSummary). */
function grabSummaryOf(grid: GrabGridFixture) {
  const dailyTotals: Record<number, number> = {};
  const byPartnerMap = new Map<string, number>();
  let totalEarning = 0;
  let totalRides = 0;
  for (const row of grid.rows) {
    for (const [d, cell] of Object.entries(row.days)) {
      dailyTotals[Number(d)] = (dailyTotals[Number(d)] ?? 0) + cell.earning;
    }
    byPartnerMap.set(
      row.rentalPartner,
      (byPartnerMap.get(row.rentalPartner) ?? 0) + row.summary.earning,
    );
    totalEarning += row.summary.earning;
    totalRides += row.summary.rides;
  }
  return {
    globalSummary: {
      totalEarning,
      totalDriverFare: grid.rows.reduce((s, r) => s + r.summary.driverFare, 0),
      totalIncentive: grid.rows.reduce((s, r) => s + r.summary.incentive, 0),
      totalRides,
      activeVehicles: grid.rows.length,
    },
    charts: {
      daily: Array.from({ length: grid.daysInMonth }, (_, i) => ({
        day: i + 1,
        total: dailyTotals[i + 1] ?? 0,
      })),
      byPartner: [...byPartnerMap.entries()]
        .map(([partner, total]) => ({ partner, total }))
        .sort((a, b) => b.total - a.total),
    },
  };
}

/**
 * Grab range aggregates, walked day by day so a cross-month range reads each
 * day from its own monthly pivot. Only earning is stored per day in the
 * fixtures, so fare/incentive/rides are apportioned by each row's share of its
 * own month's earning — which still collapses onto the exact month totals when
 * the range covers a whole month, keeping the backend invariant intact.
 */
function makeGrabRangeSummary(
  gridFor: (month: number, year: number) => GrabGridFixture,
  dateFrom: string,
  dateTo: string,
) {
  const partOf = (iso: string) => ({
    year: Number(iso.slice(0, 4)),
    month: Number(iso.slice(5, 7)),
    day: Number(iso.slice(8, 10)),
  });
  const nextDay = (iso: string) => {
    const { year, month, day } = partOf(iso);
    const d = new Date(Date.UTC(year, month - 1, day + 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  };

  const daily: { date: string; total: number }[] = [];
  const byPartnerMap = new Map<string, number>();
  // key → earning inside the window, so per-row shares can be derived after.
  const earnedByKey = new Map<string, { row: GrabGridFixture['rows'][number]; earning: number }>();
  let days = 0;

  for (let date = dateFrom; date <= dateTo; date = nextDay(date)) {
    const { year, month, day } = partOf(date);
    const grid = gridFor(month, year);
    days++;
    let total = 0;
    for (const row of grid.rows) {
      const earning = row.days[day]?.earning ?? 0;
      total += earning;
      if (earning === 0) continue;
      const seen = earnedByKey.get(row.compositeKey);
      if (seen) seen.earning += earning;
      else earnedByKey.set(row.compositeKey, { row, earning });
      byPartnerMap.set(row.rentalPartner, (byPartnerMap.get(row.rentalPartner) ?? 0) + earning);
    }
    daily.push({ date, total });
  }

  let totalEarning = 0;
  let totalDriverFare = 0;
  let totalIncentive = 0;
  let totalRides = 0;
  for (const { row, earning } of earnedByKey.values()) {
    const share = earning === row.summary.earning ? 1 : earning / (row.summary.earning || 1);
    totalEarning += earning;
    totalDriverFare += Math.round(share * row.summary.driverFare);
    totalIncentive += Math.round(share * row.summary.incentive);
    totalRides += Math.round(share * row.summary.rides);
  }

  return {
    fromDate: dateFrom,
    toDate: dateTo,
    days,
    totalEarning,
    totalDriverFare,
    totalIncentive,
    totalRides,
    activeVehicles: earnedByKey.size,
    charts: {
      daily,
      byPartner: [...byPartnerMap.entries()]
        .map(([partner, total]) => ({ partner, total }))
        .sort((a, b) => b.total - a.total),
    },
  };
}

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
  {
    id: 1,
    vehiclePlate: 'B1003XYZ',
    exceptionDate: '2026-06-10',
    keterangan: 'maintenance',
    isBebasSetoran: true,
  },
  {
    id: 2,
    vehiclePlate: 'B1007XYZ',
    exceptionDate: '2026-06-12',
    keterangan: 'rental',
    isBebasSetoran: false,
  },
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
// Overlay the Type a partner entered in Daftarkan Plat onto scoped grid rows
// (matches the backend PortalFleetService overlay).
const overlayPlateTypes = <T extends { rows: { plateNorm: string; vehicleType: string }[] }>(
  grid: T,
): T => {
  const byNorm = new Map(
    platesState.filter((p) => p.vehicleType).map((p) => [p.plateNumberNorm, p.vehicleType!]),
  );
  for (const row of grid.rows) {
    if (!row.vehicleType && byNorm.has(row.plateNorm)) row.vehicleType = byNorm.get(row.plateNorm)!;
  }
  return grid;
};

/** Reset registered plates to the seed (call between tests for isolation). */
export const resetPartnerPlates = () => {
  platesState = seedPartnerPlates.map((p) => ({ ...p }));
  nextPlateId = 100;
};

// ---- Mock checkpoint state (dokumentasi serah terima) -------------------------
const COMPARISON_PAIR: Record<string, string> = {
  return_from_customer: 'delivery_to_customer',
  return_from_driver: 'delivery_to_driver',
};
let checkpointsState: MockCheckpoint[] = structuredClone(seedCheckpoints);
let nextCheckpointId = 100;
let nextCheckpointMediaId = 10_000;
let nextCheckpointPointId = 1_000;
// presigned-but-unconfirmed uploads: mediaId → target row info
const pendingCheckpointMedia = new Map<
  number,
  {
    checkpointId: number;
    pointKey?: string;
    kind: MockCheckpointMedia['kind'];
    contentType: string;
  }
>();

/** Reset checkpoint mocks to the seed (call between tests for isolation). */
export const resetCheckpoints = () => {
  checkpointsState = structuredClone(seedCheckpoints);
  nextCheckpointId = 100;
  nextCheckpointMediaId = 10_000;
  nextCheckpointPointId = 1_000;
  pendingCheckpointMedia.clear();
};

const findCheckpoint = (id: string | readonly string[] | undefined) =>
  checkpointsState.find((c) => String(c.id) === id);

const checkpointSummary = (c: MockCheckpoint) => ({
  id: c.id,
  plateNumber: c.plateNumber,
  handoverType: c.handoverType,
  status: c.status,
  counterpartName: c.counterpartName,
  odometerKm: c.odometerKm,
  createdAt: c.createdAt,
  completedAt: c.completedAt,
  photoCount: c.points.reduce(
    (n, p) => n + p.media.filter((m) => m.kind === 'photo' && m.status === 'uploaded').length,
    0,
  ),
});
// ---- Mock rental-monitoring state (partner portal) ---------------------------
// The mock plays the backend's role here: it derives days/gross/cogs/nett/
// omset and the paid/unpaid summary — the FE only displays those numbers.
let rentalsState: SeedRental[] = seedRentals.map((r) => ({ ...r }));
let nextRentalId = 100;
let cogsDefaultsState = seedCogsDefaults.map((c) => ({ ...c }));

/** Reset rentals + COGS presets to the seed (call between tests). */
export const resetPartnerRentals = () => {
  rentalsState = seedRentals.map((r) => ({ ...r }));
  nextRentalId = 100;
  cogsDefaultsState = seedCogsDefaults.map((c) => ({ ...c }));
};

const DAY_MS = 86_400_000;
const rentalDays = (start: string, end: string) =>
  Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / DAY_MS) + 1);

const presentRental = (r: SeedRental, period?: { month: number; year: number }) => {
  const days = rentalDays(r.startDate, r.endDate);
  const gross = r.pricePerDay * days;
  const cogsTotal = r.cogsPerDay * days;
  const omset = gross + r.additionalCost;
  const nettProfit = omset - cogsTotal;
  let displayStartDate = r.startDate;
  let displayEndDate = r.endDate;
  if (period) {
    const prefix = `${period.year}-${String(period.month).padStart(2, '0')}`;
    const monthStart = `${prefix}-01`;
    const monthEnd = `${prefix}-${String(new Date(period.year, period.month, 0).getDate()).padStart(2, '0')}`;
    if (displayStartDate < monthStart) displayStartDate = monthStart;
    if (displayEndDate > monthEnd) displayEndDate = monthEnd;
  }
  return { ...r, displayStartDate, displayEndDate, days, gross, cogsTotal, nettProfit, omset };
};

type RentalUpsertBody = Partial<
  Omit<SeedRental, 'id' | 'pricePerDay' | 'createdAt' | 'updatedAt'> & {
    price: number;
    priceUnit: 'hari' | 'bulan';
  }
>;

const rentalFromBody = (
  body: RentalUpsertBody,
  id: number,
  createdAt: string,
): SeedRental | null => {
  if (
    !body.plateNumber ||
    !body.startDate ||
    !body.endDate ||
    body.price == null ||
    body.cogsPerDay == null
  ) {
    return null;
  }
  const pricePerDay = body.priceUnit === 'bulan' ? Math.round(body.price / 30) : body.price;
  return {
    id,
    plateNumber: body.plateNumber,
    vehicleType: body.vehicleType ?? null,
    region: body.region ?? null,
    startDate: body.startDate,
    endDate: body.endDate,
    pricePerDay,
    cogsPerDay: body.cogsPerDay,
    cogsType: body.cogsType ?? null,
    additionalCost: body.additionalCost ?? 0,
    additionalCostDescription: body.additionalCostDescription ?? null,
    deposit: body.deposit ?? 0,
    rentalType: body.rentalType ?? null,
    infoSource: body.infoSource ?? null,
    serviceArea: body.serviceArea ?? null,
    customerName: body.customerName ?? null,
    customerPhone: body.customerPhone ?? null,
    paymentStatus: body.paymentStatus ?? 'Belum Dibayar',
    createdAt,
    updatedAt: new Date().toISOString(),
  };
};

// ---- Mock driver-management state (partner portal) ----------------------------
// The mock plays the backend's role: the roster "auto-syncs" from Fleet
// Monitoring on every list load — emulated by serving fixtures that already
// contain gojek/grab-sourced rows. All lifecycle changes ride one PATCH.
let driversState: SeedDriver[] = structuredClone(seedDrivers);
let nextDriverDocId = 10_000;
// presigned-but-unconfirmed documents: docId → owning driver
const pendingDriverDocs = new Map<number, { driverId: number }>();

/** Reset drivers to the seed (call between tests for isolation). */
export const resetDrivers = () => {
  driversState = structuredClone(seedDrivers);
  nextDriverDocId = 10_000;
  pendingDriverDocs.clear();
};

const findDriver = (id: string | readonly string[] | undefined) =>
  driversState.find((d) => String(d.id) === id);

const driverDocViews = (d: SeedDriver) =>
  d.documents.map((doc) => ({
    id: doc.id,
    kind: doc.kind,
    contentType: doc.contentType,
    status: doc.status,
    ...(doc.status === 'uploaded' && {
      url: `/partner/portal/drivers/documents/${doc.id}/file`,
    }),
  }));

const presentDriverSummaryMock = (d: SeedDriver) => ({
  id: d.id,
  driverCode: d.driverCode,
  name: d.name,
  source: d.source,
  plateNumber: d.plateNumber,
  phone: d.phone,
  email: d.email,
  simExpired: d.simExpired,
  isActive: d.isActive,
  depositAmount: d.depositAmount,
  depositReturnStatus: d.depositReturnStatus,
  resignedAt: d.resignedAt,
  joinedAt: d.joinedAt,
});

const presentDriverDetailMock = (d: SeedDriver) => ({
  ...presentDriverSummaryMock(d),
  address: d.address,
  ktpNo: d.ktpNo,
  simNo: d.simNo,
  bankAccount: d.bankAccount,
  depositReturnDecidedAt: d.depositReturnDecidedAt,
  updatedAt: d.updatedAt,
  documents: driverDocViews(d),
});

type DriverPatchBody = Partial<{
  name: string;
  email: string;
  phone: string;
  address: string;
  ktpNo: string;
  simNo: string;
  simExpired: string;
  plateNumber: string;
  bankAccount: string;
  depositAmount: number;
  isActive: boolean;
  resigned: boolean;
  depositReturned: boolean;
}>;

/** Master-data half of the PATCH (validation errors short-circuit). */
const applyDriverMasterData = (d: SeedDriver, body: DriverPatchBody) => {
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (
      name.toLowerCase() !== d.name.toLowerCase() &&
      driversState.some(
        (other) => other.id !== d.id && other.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      return err(409, 'CONFLICT', 'Nama driver sudah terdaftar');
    }
    d.name = name;
  }
  if (body.email !== undefined) d.email = body.email.trim() || null;
  if (body.phone !== undefined) d.phone = body.phone.trim() || null;
  if (body.address !== undefined) d.address = body.address.trim() || null;
  if (body.ktpNo !== undefined) d.ktpNo = body.ktpNo.trim() || null;
  if (body.simNo !== undefined) d.simNo = body.simNo.trim() || null;
  if (body.simExpired !== undefined) d.simExpired = body.simExpired || null;
  if (body.bankAccount !== undefined) d.bankAccount = body.bankAccount.trim() || null;
  if (body.plateNumber !== undefined) {
    const trimmed = body.plateNumber.trim();
    if (trimmed && !registeredNorms().has(normPlate(trimmed))) {
      return err(400, 'VALIDATION_ERROR', 'Plat tidak terdaftar untuk partner Anda');
    }
    d.plateNumber = trimmed || null;
  }
  if (body.depositAmount !== undefined) {
    if (!Number.isInteger(body.depositAmount) || body.depositAmount < 0) {
      return err(400, 'VALIDATION_ERROR', 'depositAmount harus rupiah bulat');
    }
    d.depositAmount = body.depositAmount;
  }
  if (body.isActive !== undefined) d.isActive = body.isActive;
  d.updatedAt = new Date().toISOString();
  return null;
};

/** Lifecycle half of the PATCH: resign / un-resign / deposit-return gates. */
const applyDriverLifecycle = (d: SeedDriver, body: DriverPatchBody) => {
  if (body.resigned === true && !d.resignedAt) {
    d.resignedAt = new Date().toISOString();
    d.isActive = false;
    d.depositReturnStatus = 'none';
    d.depositReturnDecidedAt = null;
  }
  if (body.resigned === false && d.resignedAt) {
    // Un-resign resets the deposit-return state.
    d.resignedAt = null;
    d.depositReturnStatus = 'none';
    d.depositReturnDecidedAt = null;
  }
  if (body.depositReturned !== undefined) {
    if (!d.resignedAt) {
      return err(400, 'VALIDATION_ERROR', 'Driver belum ditandai resign');
    }
    if (body.depositReturned) {
      if (!driverHasUploaded(d, 'deposit_return_proof')) {
        return err(400, 'VALIDATION_ERROR', 'Unggah bukti pengembalian deposit terlebih dahulu');
      }
      d.depositReturnStatus = 'approved';
      d.depositReturnDecidedAt = new Date().toISOString();
    } else {
      d.depositReturnStatus = 'none';
      d.depositReturnDecidedAt = null;
    }
  }
  d.updatedAt = new Date().toISOString();
  return null;
};

const driverHasUploaded = (d: SeedDriver, kind: SeedDriverDocument['kind']) =>
  d.documents.some((doc) => doc.kind === kind && doc.status === 'uploaded');

// ---- Mock user-management state (super_admin: create/list users & partners) --
type MockPartner = {
  id: number;
  code: string;
  name: string;
  type: string | null;
  isActive: boolean;
  createdAt: string;
};
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
  {
    id: 7,
    code: 'BHISA',
    name: 'Bhisa Shuttle',
    type: 'shuttle',
    isActive: true,
    createdAt: '2026-05-01T03:00:00.000Z',
  },
];
const seedManagedUsers: MockManagedUser[] = [
  {
    id: 1,
    email: 'admin@fleet-taxi.id',
    fullName: 'Fleet Admin',
    isActive: true,
    mustChangePassword: false,
    roles: ['admin'],
    createdAt: '2026-05-01T03:00:00.000Z',
    lastLoginAt: '2026-07-04T09:00:00.000Z',
    partner: null,
  },
  {
    id: 42,
    email: 'ops@bhisa.id',
    fullName: 'Bhisa Operations',
    isActive: true,
    mustChangePassword: false,
    roles: ['partner'],
    createdAt: '2026-05-02T03:00:00.000Z',
    lastLoginAt: null,
    partner: { id: 7, code: 'BHISA', name: 'Bhisa Shuttle', type: 'shuttle' },
  },
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
  // The admin Gojek surface mirrors the partner registrations (Daftarkan Plat):
  // only plates registered by at least one partner appear, and every aggregate
  // derives from those rows — matches the backend AdminFleetService.
  http.get('*/admin/fleet/gojek/grid', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const scoped = overlayPlateTypes(
      // keepRawRows: the "Data Mentah Tanpa Plat" queue is admin-only
      scopeGojekGrid(makeGojekGrid(month, year), registeredNorms(), { keepRawRows: true }),
    );
    const grid = readMode(url) === 'driver' ? pivotGojekByDriver(scoped) : scoped;
    // The SERVER returns the filtered pivot (kickoff §5) — emulate that here.
    const partners = url.searchParams.getAll('rentalPartner');
    let rows = grid.rows;
    if (partners.length) rows = rows.filter((r) => partners.includes(r.rentalPartner));
    rows = applyGridFilters(rows, url, {
      plates: (r) => r.plateHistory ?? [],
      types: (r) => gojekRowTypes(grid, r),
    });
    return ok({ ...grid, rows });
  }),

  // Monthly aggregates for the /admin dashboard (kept off the heavy pivot).
  // rentalPartner narrows every aggregate; availableRentalPartners is always
  // computed over the unfiltered grid (matches AdminFleetService).
  http.get('*/admin/fleet/gojek/summary', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const grid = scopeGojekGrid(makeGojekGrid(month, year), registeredNorms());
    const partners = url.searchParams.getAll('rentalPartner');
    // Re-scope (not just filter rows) so dailyTotals/tableTotals recompute.
    const scopeFor = (m: number, y: number) => {
      const base = scopeGojekGrid(makeGojekGrid(m, y), registeredNorms());
      if (!partners.length) return base;
      return scopeGojekGrid(
        base,
        new Set(
          base.rows.filter((r) => partners.includes(r.rentalPartner)).map((r) => r.plateNorm),
        ),
      );
    };
    const filtered = scopeFor(month, year);
    const range = readRange(url);
    return ok({
      globalSummary: makeGojekGlobalSummary(filtered),
      ...(range ? { range: makeRangeSummary(scopeFor, range.dateFrom, range.dateTo) } : {}),
      driverActivity: makeDriverActivity(filtered),
      charts: makeGojekCharts(filtered),
      availableRentalPartners: grid.availableRentalPartners,
      exitedDrivers: makeExitedDrivers(filtered),
      lastImportDate: `${year}-${String(month).padStart(2, '0')}-16`,
    });
  }),

  http.get('*/admin/fleet/grab/grid', ({ request }) => {
    const url = new URL(request.url);
    const base = makeGrabGrid(
      int(url.searchParams.get('month'), 6),
      int(url.searchParams.get('year'), 2026),
    );
    const grid = readMode(url) === 'driver' ? pivotGrabByDriver(base) : base;
    const partners = url.searchParams.getAll('rentalPartner');
    let rows = grid.rows;
    if (partners.length) rows = rows.filter((r) => partners.includes(r.rentalPartner));
    rows = applyGridFilters(rows, url, {
      plates: (r) => (r.plateHistory ?? []).map((p) => p.plate),
      types: grabRowTypes,
    });
    return ok({ ...grid, rows });
  }),

  // Grab dashboard summary — cards + charts derived from the same pivot the
  // grid handler serves (mirrors GrabController.summary).
  http.get('*/admin/fleet/grab/summary', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const partners = url.searchParams.getAll('rentalPartner');
    const rowsFor = (m: number, y: number) => {
      const g = makeGrabGrid(m, y);
      return partners.length
        ? { ...g, rows: g.rows.filter((r) => partners.includes(r.rentalPartner)) }
        : g;
    };
    const grid = rowsFor(month, year);
    const range = readRange(url);
    return ok({
      ...grabSummaryOf(grid),
      ...(range ? { range: makeGrabRangeSummary(rowsFor, range.dateFrom, range.dateTo) } : {}),
      availableRentalPartners: makeGrabGrid(month, year).availableRentalPartners,
      lastImportDate: `${year}-${String(month).padStart(2, '0')}-16`,
    });
  }),

  // Activity log (super_admin audit trail across both audiences).
  http.get('*/admin/activity-logs', ({ request }) => {
    const url = new URL(request.url);
    const page = int(url.searchParams.get('page'), 1);
    const pageSize = int(url.searchParams.get('pageSize'), 50);
    const audience = url.searchParams.get('audience');
    const action = url.searchParams.get('action');
    const actor = url.searchParams.get('actor')?.toLowerCase();
    let rows = makeActivityLogs();
    if (audience) rows = rows.filter((r) => r.audience === audience);
    if (action) rows = rows.filter((r) => r.action === action);
    if (actor) rows = rows.filter((r) => r.actorEmail.toLowerCase().includes(actor));
    const start = (page - 1) * pageSize;
    return ok(rows.slice(start, start + pageSize), {
      page,
      pageSize,
      total: rows.length,
    });
  }),

  http.get('*/admin/fleet/gojek/cell', ({ request }) => {
    const url = new URL(request.url);
    const plate = url.searchParams.get('plate') ?? 'B1000XYZ';
    const day = int(url.searchParams.get('day'), 1);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const byDriver = readMode(url) === 'driver';
    // Same scoping as the grid: a plate no partner registered has no admin cell.
    // Driver rows are keyed `drv:<NAME>`, so the scope applies to the grid.
    if (!byDriver && !registeredNorms().has(plate)) {
      return err(404, 'NOT_FOUND', 'No transactions for that vehicle/day');
    }
    // Return the SAME breakdown the pivot cell was built from (brief §2.A).
    const base = makeGojekGrid(month, year);
    const grid = byDriver ? pivotGojekByDriver(scopeGojekGrid(base, registeredNorms())) : base;
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
    const base = makeGrabGrid(month, year);
    const grid = readMode(url) === 'driver' ? pivotGrabByDriver(base) : base;
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

  // ---- Admin fleet — targets / exceptions -----------------------------------
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
    const rows = managedUsersState.filter((u) =>
      type === 'partner' ? u.partner !== null : u.partner === null,
    );
    return ok(rows, { page: 1, pageSize: 50, total: rows.length });
  }),

  http.post('*/admin/users', async ({ request }) => {
    const denied = requireSuperAdmin();
    if (denied) return denied;
    const body = (await request.json()) as {
      email?: string;
      fullName?: string;
      password?: string;
      roles?: string[];
    };
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

  http.patch('*/admin/users/:id', async ({ params, request }) => {
    const denied = requireSuperAdmin();
    if (denied) return denied;
    const user = managedUsersState.find((u) => String(u.id) === params.id);
    if (!user) return err(404, 'NOT_FOUND', 'User not found');
    const body = (await request.json()) as {
      email?: string;
      fullName?: string;
      isActive?: boolean;
      roles?: string[];
      partnerId?: number;
      password?: string;
    };
    const email = body.email?.trim().toLowerCase();
    if (email && email !== user.email && managedUsersState.some((u) => u.email === email)) {
      return err(409, 'CONFLICT', 'Email already in use');
    }
    if (email) user.email = email;
    if (body.fullName !== undefined) user.fullName = body.fullName.trim();
    if (body.isActive !== undefined) user.isActive = body.isActive;
    if (body.roles) user.roles = [...body.roles].sort();
    if (body.partnerId !== undefined) {
      const p = partnersState.find((pp) => pp.id === body.partnerId);
      if (p) user.partner = { id: p.id, code: p.code, name: p.name, type: p.type };
    }
    if (body.password) user.mustChangePassword = true;
    return ok({ ...user });
  }),

  http.delete('*/admin/users/:id', ({ params }) => {
    const denied = requireSuperAdmin();
    if (denied) return denied;
    const idx = managedUsersState.findIndex((u) => String(u.id) === params.id);
    if (idx === -1) return err(404, 'NOT_FOUND', 'User not found');
    const session = getSessionUser();
    if (session && managedUsersState[idx].id === session.id) {
      return err(400, 'VALIDATION_ERROR', 'Tidak bisa menghapus akun sendiri');
    }
    managedUsersState.splice(idx, 1);
    return ok({ deleted: true });
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

  http.put('*/partner/portal/plates/:id', async ({ params, request }) => {
    const plate = platesState.find((p) => String(p.id) === params.id);
    if (!plate) return err(404, 'NOT_FOUND', 'Plat tidak ditemukan');
    const body = (await request.json()) as { plateNumber?: string; vehicleType?: string };
    const norm = normPlate(body.plateNumber ?? '');
    if (!norm) return err(400, 'VALIDATION_ERROR', 'Nomor plat tidak valid');
    if (norm !== plate.plateNumberNorm && platesState.some((p) => p.plateNumberNorm === norm)) {
      return err(409, 'CONFLICT', 'Plat sudah terdaftar');
    }
    plate.plateNumber = (body.plateNumber ?? '').trim();
    plate.plateNumberNorm = norm;
    plate.vehicleType = body.vehicleType?.trim() || null;
    return ok({ ...plate });
  }),

  http.delete('*/partner/portal/plates/:id', ({ params }) => {
    const idx = platesState.findIndex((p) => String(p.id) === params.id);
    if (idx === -1) return err(404, 'NOT_FOUND', 'Plat tidak ditemukan');
    platesState.splice(idx, 1);
    return ok({ deleted: true });
  }),

  // ---- Partner portal — Checkpoint (dokumentasi serah terima) ---------------
  http.get('*/partner/portal/checkpoints', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const handoverType = url.searchParams.get('handoverType');
    const plate = url.searchParams.get('plate');
    const month = Number(url.searchParams.get('month')) || 0;
    const year = Number(url.searchParams.get('year')) || 0;
    const page = int(url.searchParams.get('page'), 1);
    const pageSize = int(url.searchParams.get('pageSize'), 50);

    const filtered = checkpointsState
      .filter((c) => !status || c.status === status)
      .filter((c) => !handoverType || c.handoverType === handoverType)
      // partial match, mirroring the BE ilike filter
      .filter((c) => !plate || c.plateNumberNorm.includes(normPlate(plate)))
      .filter((c) => {
        if (!month || !year) return true;
        // WIB bucketing: shift UTC by +7h then read the calendar fields
        const wib = new Date(new Date(c.createdAt).getTime() + 7 * 3_600_000);
        return wib.getUTCMonth() + 1 === month && wib.getUTCFullYear() === year;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const rows = filtered.slice((page - 1) * pageSize, page * pageSize).map(checkpointSummary);
    return ok(rows, { page, pageSize, total: filtered.length });
  }),

  http.post('*/partner/portal/checkpoints', async ({ request }) => {
    const body = (await request.json()) as {
      plateNumber?: string;
      handoverType?: string;
      partnerStaffName?: string;
      counterpartName?: string;
      counterpartPhone?: string;
    };
    const norm = normPlate(body.plateNumber ?? '');
    if (!norm || !registeredNorms().has(norm)) {
      return err(400, 'VALIDATION_ERROR', 'Plat tidak terdaftar — daftarkan plat terlebih dahulu');
    }
    const created: MockCheckpoint = {
      id: nextCheckpointId++,
      plateNumber: (body.plateNumber ?? '').trim(),
      plateNumberNorm: norm,
      handoverType: body.handoverType ?? 'delivery_to_customer',
      status: 'draft',
      partnerStaffName: body.partnerStaffName?.trim() || null,
      counterpartName: body.counterpartName?.trim() || null,
      counterpartPhone: body.counterpartPhone?.trim() || null,
      odometerKm: null,
      batteryPercent: null,
      generalNotes: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      points: makeCheckpointPoints(nextCheckpointPointId),
      signatures: [],
    };
    nextCheckpointPointId += 10;
    checkpointsState.push(created);
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.get('*/partner/portal/checkpoints/:id', ({ params }) => {
    const cp = findCheckpoint(params.id);
    return cp ? ok(cp) : err(404, 'NOT_FOUND', 'Checkpoint tidak ditemukan');
  }),

  http.patch('*/partner/portal/checkpoints/:id', async ({ params, request }) => {
    const cp = findCheckpoint(params.id);
    if (!cp) return err(404, 'NOT_FOUND', 'Checkpoint tidak ditemukan');
    if (cp.status !== 'draft') return err(409, 'CONFLICT', 'Checkpoint sudah diselesaikan');
    const body = (await request.json()) as Partial<MockCheckpoint>;
    if (body.partnerStaffName !== undefined) cp.partnerStaffName = body.partnerStaffName || null;
    if (body.counterpartName !== undefined) cp.counterpartName = body.counterpartName || null;
    if (body.counterpartPhone !== undefined) cp.counterpartPhone = body.counterpartPhone || null;
    if (body.odometerKm !== undefined) cp.odometerKm = body.odometerKm;
    if (body.batteryPercent !== undefined) cp.batteryPercent = body.batteryPercent;
    if (body.generalNotes !== undefined) cp.generalNotes = body.generalNotes || null;
    return ok({ ...cp });
  }),

  http.patch('*/partner/portal/checkpoints/:id/points/:pointKey', async ({ params, request }) => {
    const cp = findCheckpoint(params.id);
    if (!cp) return err(404, 'NOT_FOUND', 'Checkpoint tidak ditemukan');
    if (cp.status !== 'draft') return err(409, 'CONFLICT', 'Checkpoint sudah diselesaikan');
    const point = cp.points.find((p) => p.pointKey === params.pointKey);
    if (!point) return err(400, 'VALIDATION_ERROR', 'Titik inspeksi tidak dikenal');
    const body = (await request.json()) as { passed?: boolean; note?: string };
    if (body.passed !== undefined) point.passed = body.passed;
    if (body.note !== undefined) point.note = body.note.trim() || null;
    return ok({ ...point });
  }),

  http.post('*/partner/portal/checkpoints/:id/media/presign', async ({ params, request }) => {
    const cp = findCheckpoint(params.id);
    if (!cp) return err(404, 'NOT_FOUND', 'Checkpoint tidak ditemukan');
    if (cp.status !== 'draft') return err(409, 'CONFLICT', 'Checkpoint sudah diselesaikan');
    const body = (await request.json()) as {
      kind: MockCheckpointMedia['kind'];
      pointKey?: string;
      contentType: string;
      sizeBytes: number;
    };
    if (body.kind === 'photo' && !body.pointKey) {
      return err(400, 'VALIDATION_ERROR', 'pointKey wajib untuk foto');
    }
    const mediaId = nextCheckpointMediaId++;
    pendingCheckpointMedia.set(mediaId, {
      checkpointId: cp.id,
      pointKey: body.pointKey,
      kind: body.kind,
      contentType: body.contentType,
    });
    return HttpResponse.json(
      {
        success: true,
        data: {
          mediaId,
          uploadUrl: `/partner/portal/checkpoints/media/${mediaId}/upload`,
          method: 'PUT',
          headers: { 'Content-Type': body.contentType },
        },
      },
      { status: 201 },
    );
  }),

  // Dev upload sink — the mock just acknowledges the bytes.
  http.put('*/partner/portal/checkpoints/media/:mediaId/upload', () => ok({ stored: true })),

  http.post('*/partner/portal/checkpoints/:id/media/:mediaId/confirm', ({ params }) => {
    const pending = pendingCheckpointMedia.get(Number(params.mediaId));
    const cp = findCheckpoint(params.id);
    if (!pending || !cp || pending.checkpointId !== cp.id) {
      return err(404, 'NOT_FOUND', 'Media tidak ditemukan');
    }
    pendingCheckpointMedia.delete(Number(params.mediaId));
    const media: MockCheckpointMedia = {
      id: Number(params.mediaId),
      kind: pending.kind,
      contentType: pending.contentType,
      status: 'uploaded',
      url: MOCK_PHOTO_URL,
    };
    if (pending.kind === 'photo') {
      cp.points.find((p) => p.pointKey === pending.pointKey)?.media.push(media);
    } else {
      // Re-signing supersedes the previous signature of the same kind
      cp.signatures = cp.signatures.filter((s) => s.kind !== pending.kind);
      cp.signatures.push(media);
    }
    return HttpResponse.json({ success: true, data: media }, { status: 201 });
  }),

  http.delete('*/partner/portal/checkpoints/:id', ({ params }) => {
    const cp = findCheckpoint(params.id);
    if (!cp) return err(404, 'NOT_FOUND', 'Checkpoint tidak ditemukan');
    if (cp.status !== 'draft') {
      return err(409, 'CONFLICT', 'Checkpoint sudah diselesaikan dan tidak bisa dihapus');
    }
    checkpointsState.splice(checkpointsState.indexOf(cp), 1);
    return ok({ deleted: true });
  }),

  http.delete('*/partner/portal/checkpoints/:id/media/:mediaId', ({ params }) => {
    const cp = findCheckpoint(params.id);
    if (!cp) return err(404, 'NOT_FOUND', 'Checkpoint tidak ditemukan');
    if (cp.status !== 'draft') return err(409, 'CONFLICT', 'Checkpoint sudah diselesaikan');
    for (const point of cp.points) {
      const idx = point.media.findIndex((m) => String(m.id) === params.mediaId);
      if (idx !== -1) {
        point.media.splice(idx, 1);
        return ok({ deleted: true });
      }
    }
    const sigIdx = cp.signatures.findIndex((m) => String(m.id) === params.mediaId);
    if (sigIdx !== -1) {
      cp.signatures.splice(sigIdx, 1);
      return ok({ deleted: true });
    }
    return err(404, 'NOT_FOUND', 'Media tidak ditemukan');
  }),

  http.post('*/partner/portal/checkpoints/:id/complete', async ({ params, request }) => {
    const cp = findCheckpoint(params.id);
    if (!cp) return err(404, 'NOT_FOUND', 'Checkpoint tidak ditemukan');
    if (cp.status !== 'draft') return err(409, 'CONFLICT', 'Checkpoint sudah diselesaikan');
    const body = (await request.json()) as {
      odometerKm: number;
      batteryPercent: number;
      generalNotes?: string;
    };

    const details: { field: string; message: string }[] = [];
    for (const p of cp.points) {
      if (p.passed == null)
        details.push({ field: p.pointKey, message: `${p.label}: belum dinilai` });
      if (!p.media.some((m) => m.kind === 'photo' && m.status === 'uploaded')) {
        details.push({ field: p.pointKey, message: `${p.label}: belum ada foto` });
      }
    }
    for (const kind of ['signature_partner', 'signature_counterpart'] as const) {
      if (!cp.signatures.some((s) => s.kind === kind)) {
        // Spelled out the way the BE does, not derived from the FE helper, so
        // a wrong penyerah/penerima mapping in the app still fails a test.
        const isDelivery = cp.handoverType.startsWith('delivery_');
        const isPartner = kind === 'signature_partner';
        const role = isPartner === isDelivery ? 'penyerah' : 'penerima';
        const who = isPartner
          ? 'Petugas Partner'
          : cp.handoverType.endsWith('_driver')
            ? 'Driver'
            : 'Customer';
        details.push({ field: kind, message: `Tanda tangan ${role} (${who}) belum ada` });
      }
    }
    if (details.length) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Checkpoint belum lengkap', details },
        },
        { status: 400 },
      );
    }

    cp.status = 'completed';
    cp.odometerKm = body.odometerKm;
    cp.batteryPercent = body.batteryPercent;
    cp.generalNotes = body.generalNotes?.trim() || null;
    cp.completedAt = new Date().toISOString();
    return HttpResponse.json({ success: true, data: cp }, { status: 201 });
  }),

  http.get('*/partner/portal/checkpoints/:id/comparison', ({ params }) => {
    const cp = findCheckpoint(params.id);
    if (!cp) return err(404, 'NOT_FOUND', 'Checkpoint tidak ditemukan');
    const pairedType = COMPARISON_PAIR[cp.handoverType];
    if (!pairedType) return ok(null);
    const cutoff = cp.completedAt ?? new Date().toISOString();
    const prev = checkpointsState
      .filter(
        (c) =>
          c.plateNumberNorm === cp.plateNumberNorm &&
          c.handoverType === pairedType &&
          c.status === 'completed' &&
          c.completedAt != null &&
          c.completedAt < cutoff,
      )
      .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))[0];
    return ok(prev ?? null);
  }),

  http.get('*/partner/portal/checkpoints/:id/pdf', ({ params }) => {
    const cp = findCheckpoint(params.id);
    if (!cp) return err(404, 'NOT_FOUND', 'Checkpoint tidak ditemukan');
    if (cp.status !== 'completed') return err(409, 'CONFLICT', 'Checkpoint belum diselesaikan');
    return new HttpResponse('%PDF-1.4 mock', {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  }),

  // ---- Partner portal — All Fleet Monitoring (Gojek + Grab + Rental) -------
  // Built from the same three fixtures the platform screens use, so the mock
  // reproduces the backend's invariant: totals do not change with the mode.
  http.get('*/partner/portal/fleet/all/grid', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const mode = readMode(url);
    const norms = registeredNorms();
    return ok(
      makeAllFleetGrid(month, year, mode, {
        gojek: scopeGojekGrid(makeGojekGrid(month, year), norms),
        grab: scopeGrabGrid(makeGrabGrid(month, year), norms),
        rentals: rentalsState,
      }),
    );
  }),

  http.get('*/partner/portal/fleet/all/cell', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const day = int(url.searchParams.get('day'), 1);
    const key = url.searchParams.get('key') ?? '';
    const mode = readMode(url);
    const norms = registeredNorms();
    const grid = makeAllFleetGrid(month, year, mode, {
      gojek: scopeGojekGrid(makeGojekGrid(month, year), norms),
      grab: scopeGrabGrid(makeGrabGrid(month, year), norms),
      rentals: rentalsState,
    });
    const cell = makeAllFleetCell(grid, key, day);
    if (!cell) return err(404, 'NOT_FOUND', 'No transactions for that subject/day');
    return ok(cell);
  }),

  // ---- Partner portal — read-only fleet (scoped to registered plates) ------
  http.get('*/partner/portal/fleet/gojek/grid', ({ request }) => {
    const url = new URL(request.url);
    const grid = makeGojekGrid(
      int(url.searchParams.get('month'), 6),
      int(url.searchParams.get('year'), 2026),
    );
    const scoped = overlayPlateTypes(scopeGojekGrid(grid, registeredNorms()));
    const pivoted = readMode(url) === 'driver' ? pivotGojekByDriver(scoped) : scoped;
    // The filters narrow the partner's own scope; they can never widen it.
    return ok({
      ...pivoted,
      rows: applyGridFilters(pivoted.rows, url, {
        plates: (r) => r.plateHistory ?? [],
        types: (r) => gojekRowTypes(pivoted, r),
      }),
    });
  }),

  http.get('*/partner/portal/fleet/gojek/summary', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const scopeFor = (m: number, y: number) =>
      scopeGojekGrid(makeGojekGrid(m, y), registeredNorms());
    const grid = scopeFor(month, year);
    const range = readRange(url);
    return ok({
      globalSummary: makeGojekGlobalSummary(grid),
      ...(range ? { range: makeRangeSummary(scopeFor, range.dateFrom, range.dateTo) } : {}),
      driverActivity: makeDriverActivity(grid),
      charts: makeGojekCharts(grid),
      exitedDrivers: makeExitedDrivers(grid),
      lastImportDate: `${year}-${String(month).padStart(2, '0')}-16`,
    });
  }),

  http.get('*/partner/portal/fleet/gojek/cell', ({ request }) => {
    const url = new URL(request.url);
    const plate = url.searchParams.get('plate') ?? '';
    const day = int(url.searchParams.get('day'), 1);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const norms = registeredNorms();
    // In driver mode the row key is `drv:<NAME>`, so the plate allowlist is
    // applied to the grid instead of to the key.
    if (readMode(url) === 'driver') {
      const grid = pivotGojekByDriver(scopeGojekGrid(makeGojekGrid(month, year), norms));
      const detail = grid.rows.find((r) => r.plateNorm === plate)?.days[day]?.detail;
      if (!detail) return err(404, 'NOT_FOUND', 'No transactions for that vehicle/day');
      return ok(detail);
    }
    if (!norms.has(plate)) {
      return err(404, 'NOT_FOUND', 'No transactions for that vehicle/day');
    }
    const detail = makeGojekGrid(month, year).rows.find((r) => r.plateNorm === plate)?.days[day]
      ?.detail;
    if (!detail) return err(404, 'NOT_FOUND', 'No transactions for that vehicle/day');
    return ok(detail);
  }),

  // ---- Partner portal — exceptions (Kelola Jadwal), own plates only --------
  // Shares exceptionState with the admin handlers; the partner scope check
  // mirrors the backend's registered-plate intersection.
  http.get('*/partner/portal/fleet/gojek/exceptions', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const prefix = `${year}-${String(month).padStart(2, '0')}-`;
    const norms = registeredNorms();
    return ok(
      exceptionState.filter(
        (e) =>
          e.exceptionDate.startsWith(prefix) &&
          norms.has(e.vehiclePlate.toUpperCase().replace(/[^A-Z0-9]/g, '')),
      ),
    );
  }),

  http.post('*/partner/portal/fleet/gojek/exceptions', async ({ request }) => {
    const body = (await request.json()) as Partial<MockException>;
    if (!body.vehiclePlate || !body.exceptionDate) {
      return err(422, 'VALIDATION_ERROR', 'vehiclePlate dan exceptionDate wajib diisi');
    }
    const norm = body.vehiclePlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!registeredNorms().has(norm)) {
      return err(403, 'FORBIDDEN', 'Plat tidak terdaftar pada akun partner ini');
    }
    const created: MockException = {
      id: nextExceptionId++,
      vehiclePlate: norm,
      exceptionDate: body.exceptionDate,
      keterangan: body.keterangan ?? null,
      isBebasSetoran: body.isBebasSetoran ?? false,
    };
    exceptionState.push(created);
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.delete('*/partner/portal/fleet/gojek/exceptions/:id', ({ params }) => {
    const idx = exceptionState.findIndex((e) => String(e.id) === params.id);
    if (idx === -1) return err(404, 'NOT_FOUND', 'Exception not found');
    const norm = exceptionState[idx].vehiclePlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!registeredNorms().has(norm)) {
      return err(403, 'FORBIDDEN', 'Plat tidak terdaftar pada akun partner ini');
    }
    exceptionState.splice(idx, 1);
    return ok({ deleted: true });
  }),

  http.get('*/partner/portal/fleet/grab/grid', ({ request }) => {
    const url = new URL(request.url);
    const grid = makeGrabGrid(
      int(url.searchParams.get('month'), 6),
      int(url.searchParams.get('year'), 2026),
    );
    const scoped = scopeGrabGrid(grid, registeredNorms());
    const pivoted = readMode(url) === 'driver' ? pivotGrabByDriver(scoped) : scoped;
    return ok({
      ...pivoted,
      rows: applyGridFilters(pivoted.rows, url, {
        plates: (r) => (r.plateHistory ?? []).map((p) => p.plate),
        types: grabRowTypes,
      }),
    });
  }),

  // Own Grab dashboard aggregates — the partner twin of the admin summary, so
  // the portal's cards come from the same shape instead of the grid's totals.
  http.get('*/partner/portal/fleet/grab/summary', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const scopeFor = (m: number, y: number) => scopeGrabGrid(makeGrabGrid(m, y), registeredNorms());
    const range = readRange(url);
    return ok({
      ...grabSummaryOf(scopeFor(month, year)),
      ...(range ? { range: makeGrabRangeSummary(scopeFor, range.dateFrom, range.dateTo) } : {}),
      availableRentalPartners: makeGrabGrid(month, year).availableRentalPartners,
      lastImportDate: `${year}-${String(month).padStart(2, '0')}-16`,
    });
  }),

  http.get('*/partner/portal/fleet/grab/cell', ({ request }) => {
    const url = new URL(request.url);
    const compositeKey = url.searchParams.get('compositeKey') ?? '';
    const norms = registeredNorms();
    const base = makeGrabGrid(
      int(url.searchParams.get('month'), 6),
      int(url.searchParams.get('year'), 2026),
    );
    const grid = readMode(url) === 'driver' ? pivotGrabByDriver(scopeGrabGrid(base, norms)) : base;
    const row = grid.rows.find((r) => r.compositeKey === compositeKey);
    if (!row || (readMode(url) === 'plate' && !norms.has(row.plateNumber))) {
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

  // ---- Partner portal — Rental Monitoring -----------------------------------
  // NOTE: keep the specific paths (cogs-defaults, export, :id/payment-status)
  // registered BEFORE the generic `:id` matcher.
  http.get('*/partner/portal/rentals/cogs-defaults', () =>
    ok({ items: cogsDefaultsState.map((c) => ({ ...c })) }),
  ),

  http.put('*/partner/portal/rentals/cogs-defaults', async ({ request }) => {
    const body = (await request.json()) as { key?: string; label?: string; cogsPerDay?: number };
    if (!body.label?.trim() || body.cogsPerDay == null) {
      return err(422, 'VALIDATION_ERROR', 'label dan cogsPerDay wajib diisi');
    }
    const existing = body.key ? cogsDefaultsState.find((c) => c.key === body.key) : undefined;
    if (existing) {
      existing.label = body.label.trim();
      existing.cogsPerDay = body.cogsPerDay;
      return ok({ ...existing });
    }
    const key =
      body.key ??
      body.label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    const created = { key, label: body.label.trim(), cogsPerDay: body.cogsPerDay };
    cogsDefaultsState.push(created);
    return ok({ ...created });
  }),

  http.get('*/partner/portal/rentals/export', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    // A tiny fake XLSX payload — enough for the FE blob-download flow.
    return new HttpResponse(new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="rental-monitoring-${year}-${String(month).padStart(2, '0')}.xlsx"`,
      },
    });
  }),

  http.get('*/partner/portal/rentals', ({ request }) => {
    const url = new URL(request.url);
    const month = int(url.searchParams.get('month'), 6);
    const year = int(url.searchParams.get('year'), 2026);
    const region = url.searchParams.get('region');
    const search = url.searchParams.get('search')?.trim().toLowerCase();
    const sortBy = url.searchParams.get('sortBy') ?? 'date';
    const sortOrder = url.searchParams.get('sortOrder') === 'desc' ? -1 : 1;

    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const monthStart = `${prefix}-01`;
    const monthEnd = `${prefix}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

    let items = rentalsState
      .filter((r) => r.startDate <= monthEnd && r.endDate >= monthStart)
      .map((r) => presentRental(r, { month, year }));
    const regions = [...new Set(items.map((r) => r.region).filter((v): v is string => !!v))].sort();
    if (region) items = items.filter((r) => r.region === region);
    if (search) {
      items = items.filter((r) =>
        [r.plateNumber, r.customerName, r.serviceArea]
          .filter((v): v is string => !!v)
          .some((v) => v.toLowerCase().includes(search)),
      );
    }
    const sortVal = (r: (typeof items)[number]) => {
      switch (sortBy) {
        case 'duration':
          return r.days;
        case 'status':
          return r.paymentStatus;
        case 'omset':
          return r.omset;
        case 'cogs':
          return r.cogsTotal;
        default:
          return r.startDate;
      }
    };
    items.sort((a, b) => {
      const va = sortVal(a);
      const vb = sortVal(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sortOrder;
    });

    const paid = items.filter((r) => r.paymentStatus === 'Sudah Dibayar');
    const unpaid = items.filter((r) => r.paymentStatus === 'Belum Dibayar');
    const sum = (rows: typeof items, pick: (r: (typeof items)[number]) => number) =>
      rows.reduce((acc, r) => acc + pick(r), 0);
    const summary = {
      totalTransactions: items.length,
      unpaidTransactions: unpaid.length,
      unpaidGross: sum(unpaid, (r) => r.gross),
      paidGross: sum(paid, (r) => r.gross),
      paidCogs: sum(paid, (r) => r.cogsTotal),
      paidAdditionalCost: sum(paid, (r) => r.additionalCost),
      paidNettProfit: sum(paid, (r) => r.nettProfit),
    };
    const byType = new Map<
      string,
      { cogsType: string; gross: number; cogs: number; nett: number; count: number }
    >();
    for (const r of paid) {
      const key = r.cogsType ?? 'lainnya';
      const row = byType.get(key) ?? { cogsType: key, gross: 0, cogs: 0, nett: 0, count: 0 };
      row.gross += r.gross;
      row.cogs += r.cogsTotal;
      row.nett += r.nettProfit;
      row.count += 1;
      byType.set(key, row);
    }
    return ok({ summary, nettByType: [...byType.values()], regions, items });
  }),

  http.post('*/partner/portal/rentals', async ({ request }) => {
    const body = (await request.json()) as RentalUpsertBody;
    const created = rentalFromBody(body, nextRentalId, new Date().toISOString());
    if (!created) {
      return err(
        422,
        'VALIDATION_ERROR',
        'plateNumber, startDate, endDate, price, dan cogsPerDay wajib diisi',
      );
    }
    nextRentalId += 1;
    rentalsState.push(created);
    return HttpResponse.json({ success: true, data: presentRental(created) }, { status: 201 });
  }),

  http.patch('*/partner/portal/rentals/:id/payment-status', async ({ params, request }) => {
    const rental = rentalsState.find((r) => String(r.id) === params.id);
    if (!rental) return err(404, 'NOT_FOUND', 'Data rental tidak ditemukan');
    const body = (await request.json()) as { paymentStatus?: SeedRental['paymentStatus'] };
    if (body.paymentStatus !== 'Belum Dibayar' && body.paymentStatus !== 'Sudah Dibayar') {
      return err(422, 'VALIDATION_ERROR', 'paymentStatus tidak valid');
    }
    rental.paymentStatus = body.paymentStatus;
    rental.updatedAt = new Date().toISOString();
    return ok(presentRental(rental));
  }),

  http.put('*/partner/portal/rentals/:id', async ({ params, request }) => {
    const idx = rentalsState.findIndex((r) => String(r.id) === params.id);
    if (idx === -1) return err(404, 'NOT_FOUND', 'Data rental tidak ditemukan');
    const body = (await request.json()) as RentalUpsertBody;
    const updated = rentalFromBody(body, rentalsState[idx].id, rentalsState[idx].createdAt);
    if (!updated) {
      return err(
        422,
        'VALIDATION_ERROR',
        'plateNumber, startDate, endDate, price, dan cogsPerDay wajib diisi',
      );
    }
    rentalsState[idx] = updated;
    return ok(presentRental(updated));
  }),

  http.delete('*/partner/portal/rentals/:id', ({ params }) => {
    const idx = rentalsState.findIndex((r) => String(r.id) === params.id);
    if (idx === -1) return err(404, 'NOT_FOUND', 'Data rental tidak ditemukan');
    rentalsState.splice(idx, 1);
    return ok({ deleted: true });
  }),

  // ---- Partner portal — Driver management ------------------------------------
  // Documents (presign → dev PUT sink → confirm; single instance per kind).
  http.post('*/partner/portal/drivers/documents/:driverId/presign', async ({ params, request }) => {
    const d = findDriver(params.driverId);
    if (!d) return err(404, 'NOT_FOUND', 'Driver tidak ditemukan');
    const body = (await request.json()) as {
      kind?: SeedDriverDocument['kind'];
      contentType?: string;
      sizeBytes?: number;
    };
    if (!body.kind || !body.contentType || !body.sizeBytes) {
      return err(422, 'VALIDATION_ERROR', 'kind, contentType, dan sizeBytes wajib diisi');
    }
    const documentId = nextDriverDocId++;
    d.documents.push({
      id: documentId,
      kind: body.kind,
      contentType: body.contentType,
      status: 'pending',
    });
    pendingDriverDocs.set(documentId, { driverId: d.id });
    return HttpResponse.json(
      {
        success: true,
        data: {
          documentId,
          uploadUrl: `/partner/portal/drivers/documents/${documentId}/upload`,
          method: 'PUT',
          headers: { 'Content-Type': body.contentType },
        },
      },
      { status: 201 },
    );
  }),

  // Dev upload sink — the mock just acknowledges the bytes.
  http.put('*/partner/portal/drivers/documents/:documentId/upload', () => ok({ stored: true })),

  // Dev serve endpoint — a tiny stand-in payload.
  http.get('*/partner/portal/drivers/documents/:documentId/file', () =>
    HttpResponse.arrayBuffer(new Uint8Array([0xff, 0xd8, 0xff]).buffer, {
      headers: { 'Content-Type': 'image/jpeg' },
    }),
  ),

  http.post('*/partner/portal/drivers/documents/:driverId/:documentId/confirm', ({ params }) => {
    const d = findDriver(params.driverId);
    const pending = pendingDriverDocs.get(Number(params.documentId));
    const doc = d?.documents.find((x) => String(x.id) === params.documentId);
    if (!d || !pending || pending.driverId !== d.id || !doc) {
      return err(404, 'NOT_FOUND', 'Dokumen tidak ditemukan');
    }
    pendingDriverDocs.delete(Number(params.documentId));
    doc.status = 'uploaded';
    // Single-instance kinds: the confirmed upload supersedes the previous one.
    d.documents = d.documents.filter((x) => x.kind !== doc.kind || x.id === doc.id);
    return HttpResponse.json(
      {
        success: true,
        data: {
          id: doc.id,
          kind: doc.kind,
          contentType: doc.contentType,
          status: doc.status,
          url: `/partner/portal/drivers/documents/${doc.id}/file`,
        },
      },
      { status: 201 },
    );
  }),

  http.delete('*/partner/portal/drivers/documents/:driverId/:documentId', ({ params }) => {
    const d = findDriver(params.driverId);
    const idx = d?.documents.findIndex((x) => String(x.id) === params.documentId) ?? -1;
    if (!d || idx === -1) return err(404, 'NOT_FOUND', 'Dokumen tidak ditemukan');
    d.documents.splice(idx, 1);
    return ok({ deleted: true });
  }),

  // The whole roster — includes resigned rows; the BE auto-syncs from Fleet
  // Monitoring before answering (emulated here by the pre-seeded fixtures).
  http.get('*/partner/portal/drivers', ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim().toLowerCase();
    const plate = url.searchParams.get('plate');
    const active = url.searchParams.get('active');
    const resigned = url.searchParams.get('resigned');
    const page = int(url.searchParams.get('page'), 1);
    const pageSize = int(url.searchParams.get('pageSize'), 20);
    const filtered = driversState
      .filter(
        (d) =>
          !q ||
          d.name.toLowerCase().includes(q) ||
          (d.driverCode ?? '').toLowerCase().includes(q) ||
          (d.email ?? '').toLowerCase().includes(q),
      )
      .filter((d) => !plate || normPlate(d.plateNumber ?? '').includes(normPlate(plate)))
      .filter((d) => {
        if (active !== 'true' && active !== 'false') return true;
        return d.isActive === (active === 'true');
      })
      .filter((d) => {
        if (resigned !== 'true' && resigned !== 'false') return true;
        return (d.resignedAt != null) === (resigned === 'true');
      })
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
    const rows = filtered
      .slice((page - 1) * pageSize, page * pageSize)
      .map(presentDriverSummaryMock);
    return ok(rows, { page, pageSize, total: filtered.length });
  }),

  http.get('*/partner/portal/drivers/:id', ({ params }) => {
    const d = findDriver(params.id);
    if (!d) return err(404, 'NOT_FOUND', 'Driver tidak ditemukan');
    return ok(presentDriverDetailMock(d));
  }),

  // One PATCH for master data + lifecycle (resign / un-resign / deposit return).
  http.patch('*/partner/portal/drivers/:id', async ({ params, request }) => {
    const d = findDriver(params.id);
    if (!d) return err(404, 'NOT_FOUND', 'Driver tidak ditemukan');
    const body = (await request.json()) as DriverPatchBody;
    const invalid = applyDriverMasterData(d, body) ?? applyDriverLifecycle(d, body);
    if (invalid) return invalid;
    return ok(presentDriverDetailMock(d));
  }),

  // ---- Partner portal — Cicilan Deposit (installment rules + derived rekap) --
  http.get('*/partner/portal/deposit-installments/driver-options', () => ok(driverOptions)),

  http.get('*/partner/portal/deposit-installments/:id/recap', ({ params }) => {
    const recap = findRecap(Number(params.id));
    if (!recap) return err(404, 'NOT_FOUND', 'Cicilan deposit tidak ditemukan');
    return ok(recap);
  }),

  http.get('*/partner/portal/deposit-installments', ({ request }) => {
    const url = new URL(request.url);
    const p = url.searchParams;
    const { data, meta } = queryInstallments({
      status: (p.get('status') as InstallmentStatus | null) ?? undefined,
      search: p.get('search') ?? undefined,
      sortBy: (p.get('sortBy') as InstallmentSortField | null) ?? undefined,
      sortOrder: (p.get('sortOrder') as 'asc' | 'desc' | null) ?? undefined,
      page: int(p.get('page'), 1),
      pageSize: int(p.get('pageSize'), 10),
    });
    return ok(data, meta);
  }),

  http.post('*/partner/portal/deposit-installments', async ({ request }) => {
    const body = (await request.json()) as InstallmentUpsertInput;
    if (!body.title?.trim() || !body.driverName?.trim()) {
      return err(400, 'VALIDATION_ERROR', 'title dan driverName wajib diisi');
    }
    if (!Number.isInteger(body.installmentAmount) || body.installmentAmount < 1) {
      return err(400, 'VALIDATION_ERROR', 'installmentAmount minimal 1');
    }
    return ok(createInstallment(body));
  }),

  http.put('*/partner/portal/deposit-installments/:id', async ({ params, request }) => {
    const body = (await request.json()) as InstallmentUpsertInput;
    const updated = updateInstallment(Number(params.id), body);
    if (!updated) return err(404, 'NOT_FOUND', 'Cicilan deposit tidak ditemukan');
    return ok(updated);
  }),

  http.delete('*/partner/portal/deposit-installments/:id', ({ params }) => {
    if (!deleteInstallment(Number(params.id))) {
      return err(404, 'NOT_FOUND', 'Cicilan deposit tidak ditemukan');
    }
    return ok({ deleted: true });
  }),
];
