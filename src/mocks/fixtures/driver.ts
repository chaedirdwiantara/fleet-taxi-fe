// Driver-management seeds (partner portal). The BE auto-syncs the roster
// from Fleet Monitoring (Gojek/Grab) on every list load — the mock emulates
// that by simply serving a roster that already contains synced rows
// (`source: 'gojek' | 'grab'`) alongside a manual one, in mixed lifecycle
// states (active, nonaktif, resigned ± deposit-return proof).

export type SeedDriverDocument = {
  id: number;
  kind: 'ktp' | 'sim' | 'skck' | 'deposit_proof' | 'deposit_return_proof';
  contentType: string;
  status: 'pending' | 'uploaded';
};

export type SeedDriver = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  ktpNo: string | null;
  simNo: string | null;
  simExpired: string | null;
  driverCode: string | null;
  plateNumber: string | null;
  bankAccount: string | null;
  source: 'gojek' | 'grab' | 'manual';
  isActive: boolean;
  depositAmount: number;
  depositReturnStatus: 'none' | 'waiting' | 'approved' | 'rejected';
  depositReturnDecidedAt: string | null;
  resignedAt: string | null;
  joinedAt: string;
  updatedAt: string;
  documents: SeedDriverDocument[];
};

const blank = {
  isActive: true,
  depositAmount: 0,
  depositReturnStatus: 'none',
  depositReturnDecidedAt: null,
  resignedAt: null,
} satisfies Partial<SeedDriver>;

export const seedDrivers: SeedDriver[] = [
  // Synced from Gojek, fully completed by the partner.
  {
    ...blank,
    id: 10,
    name: 'Agus Salim',
    email: 'agus@example.com',
    phone: '081377788899',
    address: 'Jl. Anggrek No. 3, Bekasi',
    ktpNo: '3174000000000010',
    simNo: '3234-5678-901234',
    simExpired: '2027-11-30',
    driverCode: 'DRV-000010',
    plateNumber: 'B 2000 GRB',
    bankAccount: 'BNI 555666 a.n. Agus',
    source: 'gojek',
    depositAmount: 2_000_000,
    joinedAt: '2026-06-15T03:00:00.000Z',
    updatedAt: '2026-06-20T04:00:00.000Z',
    documents: [
      { id: 201, kind: 'ktp', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 202, kind: 'sim', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 203, kind: 'skck', contentType: 'application/pdf', status: 'uploaded' },
      { id: 204, kind: 'deposit_proof', contentType: 'image/jpeg', status: 'uploaded' },
    ],
  },
  // Fresh Grab sync — sparse row waiting for data completion via the edit page.
  {
    ...blank,
    id: 11,
    name: 'Dewi Lestari',
    email: null,
    phone: '081298765432',
    address: null,
    ktpNo: null,
    simNo: null,
    simExpired: null,
    driverCode: 'DRV-000011',
    plateNumber: 'B 1001 XYZ',
    bankAccount: null,
    source: 'grab',
    joinedAt: '2026-07-08T03:00:00.000Z',
    updatedAt: '2026-07-08T03:00:00.000Z',
    documents: [],
  },
  // Manually entered driver, currently nonaktif.
  {
    ...blank,
    id: 12,
    name: 'Rudi Hartono',
    email: 'rudi@example.com',
    phone: '081234567890',
    address: 'Jl. Melati No. 1, Jakarta Selatan',
    ktpNo: '3174000000000012',
    simNo: '1234-5678-901234',
    simExpired: '2026-09-01',
    driverCode: 'DRV-000012',
    plateNumber: 'B 1000 XYZ',
    bankAccount: 'BCA 1234567890 a.n. Rudi',
    source: 'manual',
    isActive: false,
    depositAmount: 1_500_000,
    joinedAt: '2026-06-01T03:00:00.000Z',
    updatedAt: '2026-07-01T04:00:00.000Z',
    documents: [
      { id: 221, kind: 'ktp', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 224, kind: 'deposit_proof', contentType: 'image/jpeg', status: 'uploaded' },
    ],
  },
  // Resigned with an uploaded return proof — deposit not yet returned.
  {
    ...blank,
    id: 20,
    name: 'Tono Sucipto',
    email: 'tono@example.com',
    phone: '081311122233',
    address: 'Jl. Mawar No. 4, Tangerang',
    ktpNo: '3174000000000020',
    simNo: '4234-5678-901234',
    simExpired: '2026-12-01',
    driverCode: 'DRV-000020',
    plateNumber: null,
    bankAccount: 'BCA 777888 a.n. Tono',
    source: 'gojek',
    isActive: false,
    depositAmount: 1_000_000,
    resignedAt: '2026-07-05T03:00:00.000Z',
    joinedAt: '2026-05-01T03:00:00.000Z',
    updatedAt: '2026-07-05T03:00:00.000Z',
    documents: [
      { id: 301, kind: 'ktp', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 302, kind: 'deposit_proof', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 303, kind: 'deposit_return_proof', contentType: 'image/jpeg', status: 'uploaded' },
    ],
  },
  // Resigned WITHOUT a return proof — the deposit-return switch stays gated.
  {
    ...blank,
    id: 21,
    name: 'Sri Wahyuni',
    email: 'sri@example.com',
    phone: '081355566677',
    address: 'Jl. Cempaka No. 8, Depok',
    ktpNo: '3174000000000021',
    simNo: '5234-5678-901234',
    simExpired: '2027-02-14',
    driverCode: 'DRV-000021',
    plateNumber: null,
    bankAccount: 'Mandiri 998877 a.n. Sri',
    source: 'grab',
    isActive: false,
    depositAmount: 750_000,
    resignedAt: '2026-07-10T03:00:00.000Z',
    joinedAt: '2026-04-20T03:00:00.000Z',
    updatedAt: '2026-07-10T03:00:00.000Z',
    documents: [{ id: 311, kind: 'ktp', contentType: 'image/jpeg', status: 'uploaded' }],
  },
];
