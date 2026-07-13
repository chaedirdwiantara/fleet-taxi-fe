// Driver-management seeds (partner portal). One SeedDriver row travels
// through registration → active roster → resignation, exactly like the BE's
// drivers table; the handlers slice on registrationStatus/resignedAt.

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
  registrationStatus: 'pending' | 'approved' | 'rejected';
  rejectNote: string | null;
  ktpVerified: boolean;
  simVerified: boolean;
  skckVerified: boolean;
  depositAmount: number;
  depositStatus: 'none' | 'waiting' | 'approved' | 'rejected';
  depositNote: string | null;
  depositDecidedAt: string | null;
  isActive: boolean;
  depositReturnStatus: 'none' | 'waiting' | 'approved' | 'rejected';
  depositReturnDecidedAt: string | null;
  resignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documents: SeedDriverDocument[];
};

const blank = {
  rejectNote: null,
  ktpVerified: false,
  simVerified: false,
  skckVerified: false,
  depositAmount: 0,
  depositStatus: 'none',
  depositNote: null,
  depositDecidedAt: null,
  isActive: true,
  depositReturnStatus: 'none',
  depositReturnDecidedAt: null,
  resignedAt: null,
} satisfies Partial<SeedDriver>;

export const seedDrivers: SeedDriver[] = [
  // Fresh candidate — nothing uploaded yet.
  {
    ...blank,
    id: 1,
    name: 'Budi Santoso',
    email: 'budi@example.com',
    phone: '081234567890',
    address: 'Jl. Melati No. 1, Jakarta Selatan',
    ktpNo: '3174000000000001',
    simNo: '1234-5678-901234',
    simExpired: '2027-03-15',
    driverCode: null,
    plateNumber: 'B 1000 XYZ',
    bankAccount: 'BCA 1234567890 a.n. Budi',
    registrationStatus: 'pending',
    createdAt: '2026-07-01T03:00:00.000Z',
    updatedAt: '2026-07-01T03:00:00.000Z',
    documents: [],
  },
  // Fully prepared candidate — deposit approved + all docs verified, ready to approve.
  {
    ...blank,
    id: 2,
    name: 'Joko Widodo',
    email: 'joko@example.com',
    phone: '081298765432',
    address: 'Jl. Kenanga No. 2, Depok',
    ktpNo: '3174000000000002',
    simNo: '2234-5678-901234',
    simExpired: '2028-01-10',
    driverCode: null,
    plateNumber: 'B 1001 XYZ',
    bankAccount: 'Mandiri 987654 a.n. Joko',
    registrationStatus: 'pending',
    ktpVerified: true,
    simVerified: true,
    skckVerified: true,
    depositAmount: 1_500_000,
    depositStatus: 'approved',
    depositDecidedAt: '2026-07-03T04:00:00.000Z',
    createdAt: '2026-07-02T03:00:00.000Z',
    updatedAt: '2026-07-03T04:00:00.000Z',
    documents: [
      { id: 101, kind: 'ktp', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 102, kind: 'sim', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 103, kind: 'skck', contentType: 'application/pdf', status: 'uploaded' },
      { id: 104, kind: 'deposit_proof', contentType: 'image/jpeg', status: 'uploaded' },
    ],
  },
  // Active driver (approved earlier).
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
    registrationStatus: 'approved',
    ktpVerified: true,
    simVerified: true,
    skckVerified: true,
    depositAmount: 2_000_000,
    depositStatus: 'approved',
    depositDecidedAt: '2026-06-20T04:00:00.000Z',
    createdAt: '2026-06-15T03:00:00.000Z',
    updatedAt: '2026-06-20T04:00:00.000Z',
    documents: [
      { id: 201, kind: 'ktp', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 202, kind: 'sim', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 203, kind: 'skck', contentType: 'application/pdf', status: 'uploaded' },
      { id: 204, kind: 'deposit_proof', contentType: 'image/jpeg', status: 'uploaded' },
    ],
  },
  // Resigned driver with an uploaded return proof, awaiting the decision.
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
    registrationStatus: 'approved',
    ktpVerified: true,
    simVerified: true,
    skckVerified: true,
    depositAmount: 1_000_000,
    depositStatus: 'approved',
    depositDecidedAt: '2026-05-10T04:00:00.000Z',
    isActive: false,
    depositReturnStatus: 'waiting',
    resignedAt: '2026-07-05T03:00:00.000Z',
    createdAt: '2026-05-01T03:00:00.000Z',
    updatedAt: '2026-07-05T03:00:00.000Z',
    documents: [
      { id: 301, kind: 'ktp', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 302, kind: 'deposit_proof', contentType: 'image/jpeg', status: 'uploaded' },
      { id: 303, kind: 'deposit_return_proof', contentType: 'image/jpeg', status: 'uploaded' },
    ],
  },
];
