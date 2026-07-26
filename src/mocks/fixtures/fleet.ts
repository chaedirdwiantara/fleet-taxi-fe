// Deterministic mock fixtures for the fleet grids. Rich shape mirrors the
// legacy evista-backend AdminFleetMonitoringController output so the grid,
// summary cards, driver-activity panel, performers, and breakdown modal all
// render like the original. ~200 vehicles to stress the virtualized grid.

const DAILY_TARGET_FALLBACK = 488_000;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RENTAL_PARTNERS = ['BHISA', 'BHINEKA', 'INTERNAL'];
const REGIONS = ['Halim', 'Cawang', 'Bekasi'];
const DELIVERY_BATCHES = ['Batch 1', 'Batch 2'];
const VEHICLE_TYPES = ['Premium - BYD M6', 'Reguler - Avanza', 'Reguler - Xenia'];
const DRIVERS = [
  'Budi Santoso',
  'Agus Wijaya',
  'Siti Rahma',
  'Dedi Kurniawan',
  'Rina Marlina',
  'Joko Susilo',
  'Andi Pratama',
  'Wawan Setiawan',
];
const CITIES = ['Jakarta', 'Bekasi', 'Tangerang'];

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

// Grids are deterministic in (month, year); memoize so the dashboard's
// summary + performers + grid requests don't each rebuild 200 rows.
function memoByPeriod<T>(build: (month: number, year: number) => T) {
  const cache = new Map<string, T>();
  return (month: number, year: number): T => {
    const key = `${month}-${year}`;
    let v = cache.get(key);
    if (!v) {
      v = build(month, year);
      cache.set(key, v);
    }
    return v;
  };
}

type GojekDay = {
  day: number;
  displayAmount: number;
  countedAmount: number;
  isManualPayment?: boolean;
  hasDisplayOnlyManualPayment?: boolean;
  isMixed?: boolean;
  exception?: { isBebasSetoran: boolean; keterangan: string | null } | null;
  detail: {
    plateNorm: string;
    day: number;
    displayTotal: number;
    countedTotal: number;
    hasDisplayOnlyManualPayment: boolean;
    items: {
      label: string;
      displayAmount: number;
      countedAmount: number;
      note: string | null;
      isDisplayOnly: boolean;
      detailIds?: number[];
    }[];
  } | null;
};

function buildGojekRow(i: number, month: number, year: number, dim: number) {
  const rand = mulberry32((month * 1000 + year) * 997 + i * 31);
  const plateNorm = `B${1000 + i}XYZ`;
  const plateRaw = `B ${1000 + i} XYZ`;
  const rentalPartner = RENTAL_PARTNERS[i % RENTAL_PARTNERS.length];
  const dailyTarget = DAILY_TARGET_FALLBACK;

  const days: Record<number, GojekDay> = {};
  let totalDeduction = 0;

  for (let d = 1; d <= dim; d++) {
    const r = rand();
    if (r < 0.12) continue; // tidak ada di data → putih

    // exception day (rental / non-op) with no money
    if (r > 0.9) {
      const bebas = r > 0.95;
      days[d] = {
        day: d,
        displayAmount: 0,
        countedAmount: 0,
        exception: { isBebasSetoran: bebas, keterangan: bebas ? 'RENTAL' : 'PERBAIKAN' },
        detail: null,
      };
      continue;
    }

    // manual payment day (purple) — sometimes "tidak masuk setoran"
    if (r > 0.8) {
      const displayOnly = r > 0.85;
      const amount = Math.round(dailyTarget * (0.4 + r * 0.6));
      days[d] = {
        day: d,
        displayAmount: amount,
        countedAmount: displayOnly ? 0 : amount,
        isManualPayment: true,
        hasDisplayOnlyManualPayment: displayOnly,
        detail: {
          plateNorm,
          day: d,
          displayTotal: amount,
          countedTotal: displayOnly ? 0 : amount,
          hasDisplayOnlyManualPayment: displayOnly,
          items: [
            {
              label: 'Manual Payment',
              displayAmount: amount,
              countedAmount: displayOnly ? 0 : amount,
              note: displayOnly ? 'Tidak masuk setoran' : null,
              isDisplayOnly: displayOnly,
              detailIds: [i * 1000 + d], // deterministic backing id → Edit button
            },
          ],
        },
      };
      if (!displayOnly) {
        totalDeduction += amount;
      }
      continue;
    }

    // mixed day (orange): deduction + manual
    if (r > 0.72) {
      const ded = Math.round(dailyTarget * (0.5 + r * 0.4));
      const man = Math.round(dailyTarget * 0.3);
      const counted = ded + man;
      days[d] = {
        day: d,
        displayAmount: counted,
        countedAmount: counted,
        isMixed: true,
        detail: {
          plateNorm,
          day: d,
          displayTotal: counted,
          countedTotal: counted,
          hasDisplayOnlyManualPayment: false,
          items: [
            {
              label: 'Deduction',
              displayAmount: ded,
              countedAmount: ded,
              note: null,
              isDisplayOnly: false,
            },
            {
              label: 'Manual Payment',
              displayAmount: man,
              countedAmount: man,
              note: null,
              isDisplayOnly: false,
              detailIds: [i * 1000 + d],
            },
          ],
        },
      };
      totalDeduction += counted;
      continue;
    }

    // normal deduction day (green / yellow / red)
    const amount = r < 0.18 ? 0 : Math.round(dailyTarget * (0.55 + r));
    days[d] = {
      day: d,
      displayAmount: amount,
      countedAmount: amount,
      detail:
        amount > 0
          ? {
              plateNorm,
              day: d,
              displayTotal: amount,
              countedTotal: amount,
              hasDisplayOnlyManualPayment: false,
              items: [
                {
                  label: 'Deduction',
                  displayAmount: amount,
                  countedAmount: amount,
                  note: null,
                  isDisplayOnly: false,
                },
              ],
            }
          : null,
    };
    totalDeduction += amount;
  }

  // Every 13th vehicle first appears mid-month (a new joiner): the days before
  // it joined carry no due row at all, exactly like the backend produces.
  const isNewJoiner = i % 13 === 4;
  const billFromDay = isNewJoiner ? Math.min(dim, 12 + (i % 9)) : 1;
  const joinDate = isNewJoiner
    ? `${year}-${String(month).padStart(2, '0')}-${String(billFromDay).padStart(2, '0')}`
    : null;

  // Every 9th vehicle's target changed mid-month → multiple Setoran segments;
  // everyone else keeps a single constant-value segment (like the backend RLE).
  const splitDay = 8;
  const dailyDue: Record<number, number> = {};
  for (let d = billFromDay; d <= dim; d++) {
    dailyDue[d] = i % 9 === 0 && d < splitDay ? dailyTarget + 20000 : dailyTarget;
  }
  const dueDays = Object.keys(dailyDue).map(Number);
  // RLE over the billed days, mirroring the backend's encodeDueSegments.
  const dueSegments = dueDays.reduce<{ amount: number; fromDay: number; toDay: number }[]>(
    (segs, d) => {
      const last = segs[segs.length - 1];
      if (last && last.amount === dailyDue[d]) last.toDay = d;
      else segs.push({ amount: dailyDue[d], fromDay: d, toDay: d });
      return segs;
    },
    [],
  );

  // Total Due IS the sum of the billed dues — the same identity the backend
  // enforces, so outstandingMonth below can be derived from it.
  const calculatedTarget = dueDays.reduce((sum, d) => sum + dailyDue[d], 0);
  const gap = totalDeduction - calculatedTarget;
  // Bln Ini = this month's delta; Total additionally carries a deterministic
  // balance from earlier months for some vehicles (mirrors the cumulative BE).
  const outstandingMonth = calculatedTarget - totalDeduction;
  const carryOver = i % 4 === 0 ? 350_000 : i % 7 === 0 ? -120_000 : 0;
  const outstanding = outstandingMonth + carryOver;

  // Every 11th vehicle stopped appearing in imports → driver keluar.
  const isExited = i % 11 === 5;
  const exitedLastSeen = isExited
    ? `${year}-${String(month).padStart(2, '0')}-${String(Math.min(dim, 6 + (i % 10))).padStart(2, '0')}`
    : null;

  return {
    plateNorm,
    plateRaw,
    driverName: DRIVERS[i % DRIVERS.length],
    rentalPartner,
    regionName: REGIONS[i % REGIONS.length],
    vehicleType: VEHICLE_TYPES[i % VEHICLE_TYPES.length],
    deliveryBatch: DELIVERY_BATCHES[i % DELIVERY_BATCHES.length],
    carId: i % 7 === 0 ? null : 1000 + i, // some vehicles have no target yet
    detailId: null, // real plated row (not a manual-payment-tanpa-plat synthetic row)
    dailyTarget,
    dailyDue,
    dueSegments,
    days,
    summary: {
      totalDeduction,
      calculatedTarget,
      gap,
      billedDays: dueDays.length,
      billFromDay: dueDays.length > 0 ? dueDays[0] : null,
      billToDay: dueDays.length > 0 ? dueDays[dueDays.length - 1] : null,
      outstanding,
      outstandingMonth,
    },
    driverHistory: [DRIVERS[i % DRIVERS.length], DRIVERS[(i + 3) % DRIVERS.length]],
    isExited,
    exitedLastSeen,
    isNewJoiner,
    joinDate,
  };
}

export function makeGojekGrid(month: number, year: number, vehicleCount = 200) {
  const dim = daysInMonth(month, year);
  const rows = Array.from({ length: vehicleCount }, (_, i) => buildGojekRow(i, month, year, dim));

  // Legacy groups by rental_partner then delivery_batch (drives the rowspan).
  rows.sort(
    (a, b) =>
      a.rentalPartner.localeCompare(b.rentalPartner) ||
      a.deliveryBatch.localeCompare(b.deliveryBatch) ||
      a.plateNorm.localeCompare(b.plateNorm),
  );

  const dailyTotals: Record<number, number> = {};
  for (let d = 1; d <= dim; d++) {
    dailyTotals[d] = rows.reduce((sum, r) => sum + (r.days[d]?.countedAmount ?? 0), 0);
  }
  const tableTotals = {
    totalDeduction: rows.reduce((s, r) => s + r.summary.totalDeduction, 0),
    totalDue: rows.reduce((s, r) => s + r.summary.calculatedTarget, 0),
    // exited plates report on the Outstanding Driver Keluar card instead
    outstanding: rows.reduce((s, r) => s + (r.isExited ? 0 : r.summary.outstanding), 0),
    outstandingMonth: rows.reduce((s, r) => s + (r.isExited ? 0 : r.summary.outstandingMonth), 0),
  };

  // "Data Mentah Tanpa Plat": unprocessed Manual Payment rows without a plate.
  // Deterministic in (month, year); only the admin handler passes them through.
  const rawRows = Array.from({ length: 3 }, (_, k) => ({
    detailId: 900_000 + month * 100 + k,
    transactionDate: `${year}-${String(month).padStart(2, '0')}-${String(
      Math.min(dim, 6 + k * 7),
    ).padStart(2, '0')}`,
    driverName: DRIVERS[(k * 3) % DRIVERS.length].toUpperCase(),
    amount: 150_000 + k * 125_500,
    isManualPaymentSetoran: 1,
    note: null,
  }));

  return {
    month,
    year,
    daysInMonth: dim,
    rows,
    dailyTotals,
    tableTotals,
    rawRows,
    rawTotalAmount: rawRows.reduce((s, r) => s + r.amount, 0),
    availableRentalPartners: [...RENTAL_PARTNERS].sort(),
    availablePlates: rows.map((r) => ({ plate: r.plateNorm, type: r.vehicleType })),
  };
}

// Memoized grid getters — read-only consumers (handlers + aggregates) share
// one build per (month, year). Callers that mutate must build their own.
export const gojekGrid = memoByPeriod((m, y) => makeGojekGrid(m, y));
export const grabGrid = memoByPeriod((m, y) => makeGrabGrid(m, y));

type GojekGridFixture = ReturnType<typeof makeGojekGrid>;
type GrabGridFixture = ReturnType<typeof makeGrabGrid>;

// Restrict a grid to a plate allowlist (partner scoping) and recompute totals,
// so an empty allowlist yields Rp 0 everywhere — mirrors the backend behavior.
// The raw queue survives only for the admin surface (`keepRawRows`): unplated
// rows can never match a partner's plate scope.
export function scopeGojekGrid(
  grid: GojekGridFixture,
  norms: Set<string>,
  opts: { keepRawRows?: boolean } = {},
): GojekGridFixture {
  const rows = grid.rows.filter((r) => norms.has(r.plateNorm));
  const dailyTotals: Record<number, number> = {};
  for (let d = 1; d <= grid.daysInMonth; d++) {
    dailyTotals[d] = rows.reduce((s, r) => s + (r.days[d]?.countedAmount ?? 0), 0);
  }
  return {
    ...grid,
    rows,
    dailyTotals,
    tableTotals: {
      totalDeduction: rows.reduce((s, r) => s + r.summary.totalDeduction, 0),
      totalDue: rows.reduce((s, r) => s + r.summary.calculatedTarget, 0),
      outstanding: rows.reduce((s, r) => s + (r.isExited ? 0 : r.summary.outstanding), 0),
      outstandingMonth: rows.reduce((s, r) => s + (r.isExited ? 0 : r.summary.outstandingMonth), 0),
    },
    rawRows: opts.keepRawRows ? grid.rawRows : [],
    rawTotalAmount: opts.keepRawRows ? grid.rawTotalAmount : 0,
    availableRentalPartners: [...new Set(rows.map((r) => r.rentalPartner))].sort(),
    availablePlates: rows.map((r) => ({ plate: r.plateNorm, type: r.vehicleType })),
  };
}

export function scopeGrabGrid(grid: GrabGridFixture, norms: Set<string>): GrabGridFixture {
  const rows = grid.rows.filter((r) => norms.has(r.plateNumber));
  return {
    ...grid,
    rows,
    totals: {
      earning: rows.reduce((s, r) => s + r.summary.earning, 0),
      driverFare: rows.reduce((s, r) => s + r.summary.driverFare, 0),
      incentive: rows.reduce((s, r) => s + r.summary.incentive, 0),
    },
    availableRentalPartners: [...new Set(rows.map((r) => r.rentalPartner))].sort(),
    availableCities: [...new Set(rows.map((r) => r.city))].sort(),
  };
}

// Aggregates for the dashboard, computed from a (possibly scoped) grid so the
// admin and partner surfaces share one implementation.
export function makeGojekGlobalSummary(grid: GojekGridFixture) {
  const exited = grid.rows.filter((r) => r.isExited);
  return {
    totalDeduction: grid.tableTotals.totalDeduction,
    totalDue: grid.tableTotals.totalDue,
    totalOutstanding: grid.tableTotals.outstanding,
    totalOutstandingMonth: grid.tableTotals.outstandingMonth,
    outstandingDriverKeluar: exited.reduce((s, r) => s + r.summary.outstanding, 0),
    exitedCount: exited.filter((r) => r.summary.outstanding !== 0).length,
  };
}

// Click-through detail of the Outstanding Driver Keluar card: non-zero-balance
// exited rows, outstanding descending — mirrors the backend's exitedDrivers.
export function makeExitedDrivers(grid: GojekGridFixture) {
  return grid.rows
    .filter((r) => r.isExited && r.summary.outstanding !== 0)
    .map((r) => ({
      driverName: r.driverName,
      plate: r.plateNorm,
      lastSeen: r.exitedLastSeen ?? '',
      outstanding: r.summary.outstanding,
    }))
    .sort((a, b) => b.outstanding - a.outstanding);
}

// Chart series for the dashboard: daily setoran trend + split per rental partner.
export function makeGojekCharts(grid: GojekGridFixture) {
  const daily = Array.from({ length: grid.daysInMonth }, (_, i) => ({
    day: i + 1,
    total: grid.dailyTotals[i + 1] ?? 0,
  }));
  const byPartnerMap: Record<string, number> = {};
  for (const r of grid.rows) {
    byPartnerMap[r.rentalPartner] = (byPartnerMap[r.rentalPartner] ?? 0) + r.summary.totalDeduction;
  }
  const byPartner = Object.entries(byPartnerMap)
    .map(([partner, total]) => ({ partner, total }))
    .sort((a, b) => b.total - a.total);
  return { daily, byPartner };
}

export function makeDriverActivity(grid: GojekGridFixture, day?: number) {
  const dim = grid.daysInMonth;
  const availableDays = Array.from({ length: dim }, (_, i) => i + 1);
  const maxDayInData = Math.min(dim, 28);
  const selectedDay = day && day >= 1 && day <= dim ? day : maxDayInData;

  // Active = deposited counted money that day; inactive = everyone else
  // (no data, Rp0, or display-only manual that doesn't count). Partitioning on
  // the SAME predicate guarantees active + inactive === total (no gap).
  const active = grid.rows.filter((r) => (r.days[selectedDay]?.countedAmount ?? 0) > 0);
  const inactive = grid.rows.filter((r) => (r.days[selectedDay]?.countedAmount ?? 0) === 0);

  return {
    day: selectedDay,
    availableDays,
    maxDayInData,
    activeDrivers: active.length,
    inactiveDrivers: inactive.length,
    selectedDayTotalDeduction: grid.dailyTotals[selectedDay] ?? 0,
    inactiveList: inactive.slice(0, 25).map((r) => ({
      name: r.driverName,
      status: r.days[selectedDay]?.exception
        ? r.days[selectedDay]?.exception?.isBebasSetoran
          ? 'Rental (bebas setoran)'
          : 'Tidak beroperasi'
        : 'Belum setor',
      vehicle: r.plateRaw,
    })),
  };
}

// Tanggal-filter aggregates: cumulative figures truncated at `day` + that
// day's own setoran. totalDue and the outstanding delta are real prefix sums
// over the same per-day series the grid exposes, so the backend invariant
// (at day === daysInMonth the cumulative block equals the whole month) holds
// in the mocks too — a prorated approximation would quietly break it.
export function makeDayFilter(grid: GojekGridFixture, day: number) {
  let cumDeduction = 0;
  let cumDue = 0;
  for (let d = 1; d <= day; d++) {
    cumDeduction += grid.dailyTotals[d] ?? 0;
    cumDue += grid.rows.reduce((sum, r) => sum + (r.dailyDue[d] ?? 0), 0);
  }
  // Same partitioning as the whole-month totals: exited plates report under
  // the Driver Keluar card instead.
  let paidToDay = 0;
  for (const r of grid.rows) {
    if (r.isExited) continue;
    for (let d = 1; d <= day; d++) paidToDay += r.days[d]?.countedAmount ?? 0;
  }
  let dueToDayActive = 0;
  for (const r of grid.rows) {
    if (r.isExited) continue;
    for (let d = 1; d <= day; d++) dueToDayActive += r.dailyDue[d] ?? 0;
  }
  const monthDeltaToDay = dueToDayActive - paidToDay;
  return {
    day,
    cumulative: {
      totalDeduction: cumDeduction,
      totalDue: cumDue,
      totalOutstanding:
        grid.tableTotals.outstanding - grid.tableTotals.outstandingMonth + monthDeltaToDay,
      totalOutstandingMonth: monthDeltaToDay,
    },
    selectedDay: {
      totalDeduction: grid.dailyTotals[day] ?? 0,
    },
  };
}

// ---- Grab ---------------------------------------------------------------------

export function makeGrabGrid(month: number, year: number, vehicleCount = 120) {
  const rand = mulberry32(month * 2000 + year);
  const dim = daysInMonth(month, year);

  const rows = Array.from({ length: vehicleCount }, (_, i) => {
    const plateNumber = `B${2000 + i}GRB`;
    const city = CITIES[i % CITIES.length];
    const driverName = DRIVERS[i % DRIVERS.length];
    const rentalPartner = RENTAL_PARTNERS[i % RENTAL_PARTNERS.length];
    const tiering = i % 4 === 0 ? 'JAWARA' : 'REGULER';
    const days: Record<number, { earning: number }> = {};
    let earning = 0;
    let rides = 0;

    for (let d = 1; d <= dim; d++) {
      const r = rand();
      if (r < 0.2) continue;
      const dayEarning = Math.round(300_000 + r * 500_000);
      days[d] = { earning: dayEarning };
      earning += dayEarning;
      rides += Math.round(5 + r * 15);
    }

    return {
      compositeKey: `${plateNumber}|${city}|${driverName}`,
      plateNumber,
      city,
      driverName,
      rentalPartner,
      tiering,
      vehicleType: VEHICLE_TYPES[i % VEHICLE_TYPES.length],
      driverPhone: `08${(1000000000 + i).toString().slice(0, 10)}`,
      days,
      summary: {
        earning,
        incentive: Math.round(earning * 0.05),
        driverFare: Math.round(earning * 0.8),
        tollAndOthers: Math.round(earning * 0.02),
        rides,
        onlineHours: Math.round(rides * 0.9 * 10) / 10,
        bookings: rides + 5,
        cancellations: 3,
        cancellationRate: 0.04,
        fulfillmentRate: 0.925,
      },
    };
  });

  rows.sort(
    (a, b) =>
      a.rentalPartner.localeCompare(b.rentalPartner) ||
      a.city.localeCompare(b.city) ||
      a.plateNumber.localeCompare(b.plateNumber),
  );

  return {
    month,
    year,
    daysInMonth: dim,
    rows,
    totals: {
      earning: rows.reduce((s, r) => s + r.summary.earning, 0),
      driverFare: rows.reduce((s, r) => s + r.summary.driverFare, 0),
      incentive: rows.reduce((s, r) => s + r.summary.incentive, 0),
    },
    availableRentalPartners: [...RENTAL_PARTNERS].sort(),
    availableCities: [...CITIES].sort(),
  };
}

export const importBatches = [
  {
    id: 1,
    filename: 'gojek-2026-06.xlsx',
    periodMonth: 6,
    periodYear: 2026,
    status: 'done' as const,
    totalRows: 10_240,
    processed: 10_240,
    percent: 100,
    importedBy: 1,
    uploaderName: 'Admin Fleet',
    error: null,
    createdAt: '2026-06-02T03:15:00Z',
  },
  {
    id: 2,
    filename: 'gojek-2026-07.xlsx',
    periodMonth: 7,
    periodYear: 2026,
    status: 'processing' as const,
    totalRows: 12_000,
    processed: 4_800,
    percent: 40,
    importedBy: 1,
    uploaderName: 'Admin Fleet',
    error: null,
    createdAt: '2026-07-03T08:00:00Z',
  },
];
