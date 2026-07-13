export const partnerMe = {
  id: 42,
  email: 'ops@bhisa.id',
  fullName: 'Bhisa Operations',
  roles: ['partner'],
  partner: { id: 7, code: 'BHISA', name: 'Bhisa Shuttle', type: 'shuttle' },
  mustChangePassword: false,
};

export const adminMe = {
  id: 1,
  email: 'admin@fleet-taxi.id',
  fullName: 'Fleet Admin',
  roles: ['admin'],
  partner: null,
  mustChangePassword: false,
};

// A super_admin session — the only audience allowed into /admin/user-management.
export const superAdminMe = {
  id: 2,
  email: 'root@fleet-taxi.id',
  fullName: 'Fleet Super Admin',
  roles: ['super_admin'],
  partner: null,
  mustChangePassword: false,
};

// A couple of pre-registered plates for the mock partner so the scoped fleet
// grids show data out of the box. Norms match the mock grid vehicles
// (makeGojekGrid → B{1000+i}XYZ, makeGrabGrid → B{2000+i}GRB).
export const seedPartnerPlates = [
  { id: 1, plateNumber: 'B 1000 XYZ', plateNumberNorm: 'B1000XYZ', vehicleType: 'Premium - BYD M6' },
  { id: 2, plateNumber: 'B 1001 XYZ', plateNumberNorm: 'B1001XYZ', vehicleType: 'Reguler - Avanza' },
  { id: 3, plateNumber: 'B 2000 GRB', plateNumberNorm: 'B2000GRB', vehicleType: 'Reguler - Xenia' },
];

// ---- Checkpoint (dokumentasi serah terima) -----------------------------------

export const CHECKPOINT_POINT_KEYS = [
  'exterior_front',
  'exterior_rear',
  'exterior_left',
  'exterior_right',
  'interior_front',
  'interior_rear',
  'dashboard_odometer',
  'tires_wheels',
  'charging_port',
  'keys_documents',
] as const;

const POINT_LABELS: Record<string, string> = {
  exterior_front: 'Eksterior Depan',
  exterior_rear: 'Eksterior Belakang',
  exterior_left: 'Eksterior Sisi Kiri',
  exterior_right: 'Eksterior Sisi Kanan',
  interior_front: 'Interior Depan',
  interior_rear: 'Interior Belakang',
  dashboard_odometer: 'Dasbor & Odometer',
  tires_wheels: 'Ban & Pelek',
  charging_port: 'Port Pengisian',
  keys_documents: 'Kunci & Dokumen',
};

// Tiny gray-square placeholder that renders anywhere without extra handlers.
export const MOCK_PHOTO_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#d4d4d8"/><text x="160" y="126" font-family="sans-serif" font-size="20" fill="#52525b" text-anchor="middle">Foto Mock</text></svg>',
  );

export type MockCheckpointMedia = {
  id: number;
  kind: 'photo' | 'signature_partner' | 'signature_counterpart';
  contentType: string;
  status: 'pending' | 'uploaded';
  url: string;
};

export type MockCheckpointPoint = {
  id: number;
  pointKey: string;
  label: string;
  passed: boolean | null;
  note: string | null;
  media: MockCheckpointMedia[];
};

export type MockCheckpoint = {
  id: number;
  plateNumber: string;
  plateNumberNorm: string;
  handoverType: string;
  status: 'draft' | 'completed';
  counterpartName: string | null;
  counterpartPhone: string | null;
  odometerKm: number | null;
  batteryPercent: number | null;
  generalNotes: string | null;
  createdAt: string;
  completedAt: string | null;
  points: MockCheckpointPoint[];
  signatures: MockCheckpointMedia[];
};

export function makeCheckpointPoints(
  startId: number,
  opts: { passed?: boolean | null; withPhoto?: boolean } = {},
): MockCheckpointPoint[] {
  return CHECKPOINT_POINT_KEYS.map((pointKey, i) => ({
    id: startId + i,
    pointKey,
    label: POINT_LABELS[pointKey]!,
    passed: opts.passed === undefined ? null : opts.passed,
    note: pointKey === 'tires_wheels' && opts.passed !== undefined ? 'Ban depan kiri mulai aus' : null,
    media: opts.withPhoto
      ? [
          {
            id: startId * 10 + i,
            kind: 'photo' as const,
            contentType: 'image/jpeg',
            status: 'uploaded' as const,
            url: MOCK_PHOTO_URL,
          },
        ]
      : [],
  }));
}

// One completed delivery + one draft return on the same plate, so the
// comparison strip has something to show out of the box.
export const seedCheckpoints: MockCheckpoint[] = [
  {
    id: 1,
    plateNumber: 'B 1000 XYZ',
    plateNumberNorm: 'B1000XYZ',
    handoverType: 'delivery_to_customer',
    status: 'completed',
    counterpartName: 'Budi Santoso',
    counterpartPhone: '081234567890',
    odometerKm: 15320,
    batteryPercent: 92,
    generalNotes: 'Unit diserahkan dalam kondisi bersih dan penuh.',
    createdAt: '2026-07-01T02:00:00.000Z',
    completedAt: '2026-07-01T02:45:00.000Z',
    points: makeCheckpointPoints(100, { passed: true, withPhoto: true }),
    signatures: [
      {
        id: 9001,
        kind: 'signature_partner',
        contentType: 'image/png',
        status: 'uploaded',
        url: MOCK_PHOTO_URL,
      },
      {
        id: 9002,
        kind: 'signature_counterpart',
        contentType: 'image/png',
        status: 'uploaded',
        url: MOCK_PHOTO_URL,
      },
    ],
  },
  {
    id: 2,
    plateNumber: 'B 1000 XYZ',
    plateNumberNorm: 'B1000XYZ',
    handoverType: 'return_from_customer',
    status: 'draft',
    counterpartName: 'Budi Santoso',
    counterpartPhone: '081234567890',
    odometerKm: null,
    batteryPercent: null,
    generalNotes: null,
    createdAt: '2026-07-10T05:00:00.000Z',
    completedAt: null,
    points: makeCheckpointPoints(200),
    signatures: [],
  },
];
