// Checkpoint (dokumentasi serah terima kendaraan) — types mirror the BE
// contract; the point/handover keys are stable enums shared via OpenAPI,
// labels are display-only and owned by each side.

export const POINT_KEYS = [
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
export type PointKey = (typeof POINT_KEYS)[number];

export const POINT_LABELS: Record<PointKey, string> = {
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

export const POINT_HINTS: Record<PointKey, string> = {
  exterior_front: 'Bumper, kap, lampu, kaca depan',
  exterior_rear: 'Bumper, pintu bagasi, lampu belakang',
  exterior_left: 'Pintu, spion, bodi sisi kiri',
  exterior_right: 'Pintu, spion, bodi sisi kanan',
  interior_front: 'Jok, kemudi, layar',
  interior_rear: 'Jok, lantai, plafon',
  dashboard_odometer: 'Foto odometer & indikator baterai',
  tires_wheels: 'Kondisi 4 ban & pelek',
  charging_port: 'Port pengisian & kabel charger',
  keys_documents: 'Kunci, STNK, kartu e-toll',
};

export const HANDOVER_TYPES = [
  'delivery_to_customer',
  'return_from_customer',
  'delivery_to_driver',
  'return_from_driver',
] as const;
export type HandoverType = (typeof HANDOVER_TYPES)[number];

export const HANDOVER_LABELS: Record<HandoverType, string> = {
  delivery_to_customer: 'Penyerahan ke Customer',
  return_from_customer: 'Pengembalian dari Customer',
  delivery_to_driver: 'Penyerahan ke Driver',
  return_from_driver: 'Pengembalian dari Driver',
};

export const RETURN_TYPES: HandoverType[] = ['return_from_customer', 'return_from_driver'];

// ---- Penyerah / penerima ------------------------------------------------------
// The API stores the two sides by *who they are* — `partnerStaffName` (the
// partner's own officer, signature kind `signature_partner`) and
// `counterpartName` (the external customer/driver, `signature_counterpart`).
// Which of them hands the unit over and which receives it follows from the
// handover direction, so the UI axis (penyerah/penerima) is derived, never
// stored twice. Mirrors BE `checkpoint.constants.ts`.

export type HandoverParty = 'partner' | 'counterpart';

/** Who hands the unit over: the partner delivers, the counterpart returns. */
export const HANDOVER_GIVER: Record<HandoverType, HandoverParty> = {
  delivery_to_customer: 'partner',
  delivery_to_driver: 'partner',
  return_from_customer: 'counterpart',
  return_from_driver: 'counterpart',
};

/** What the external side is — drives the driver picker in the create form. */
export const HANDOVER_COUNTERPART_KIND: Record<HandoverType, 'customer' | 'driver'> = {
  delivery_to_customer: 'customer',
  return_from_customer: 'customer',
  delivery_to_driver: 'driver',
  return_from_driver: 'driver',
};

export interface HandoverSide {
  role: 'giver' | 'receiver';
  party: HandoverParty;
  /** 'Penyerah' | 'Penerima' */
  roleLabel: string;
  /** 'Petugas Partner' | 'Driver' | 'Customer' */
  partyLabel: string;
  /** This side is picked from the driver roster instead of typed free-hand. */
  fromDriverRoster: boolean;
  /** Media kind carrying this side's signature. */
  signatureKind: 'signature_partner' | 'signature_counterpart';
}

const side = (
  role: HandoverSide['role'],
  party: HandoverParty,
  handoverType: HandoverType,
): HandoverSide => ({
  role,
  party,
  roleLabel: role === 'giver' ? 'Penyerah' : 'Penerima',
  partyLabel:
    party === 'partner'
      ? 'Petugas Partner'
      : HANDOVER_COUNTERPART_KIND[handoverType] === 'driver'
        ? 'Driver'
        : 'Customer',
  fromDriverRoster: party === 'counterpart' && HANDOVER_COUNTERPART_KIND[handoverType] === 'driver',
  signatureKind: party === 'partner' ? 'signature_partner' : 'signature_counterpart',
});

/** The two sides in signing order: penyerah first, penerima second. */
export function handoverSides(handoverType: HandoverType): [HandoverSide, HandoverSide] {
  const giver = HANDOVER_GIVER[handoverType];
  const receiver: HandoverParty = giver === 'partner' ? 'counterpart' : 'partner';
  return [side('giver', giver, handoverType), side('receiver', receiver, handoverType)];
}

/** Names keyed by role — what the create form edits, direction-independent. */
export interface HandoverPartyNames {
  giverName: string;
  receiverName: string;
  counterpartPhone: string;
}

/** Role-keyed form values → the party-keyed fields the API stores. */
export function toPartyFields(
  handoverType: HandoverType,
  names: HandoverPartyNames,
): { partnerStaffName?: string; counterpartName?: string; counterpartPhone?: string } {
  const [giver] = handoverSides(handoverType);
  const partnerName = giver.party === 'partner' ? names.giverName : names.receiverName;
  const counterpartName = giver.party === 'partner' ? names.receiverName : names.giverName;
  return {
    partnerStaffName: partnerName.trim() || undefined,
    counterpartName: counterpartName.trim() || undefined,
    counterpartPhone: names.counterpartPhone.trim() || undefined,
  };
}

/** The name printed under a side's signature ("-" when it was left blank). */
export function partyName(detail: CheckpointDetail, party: HandoverParty): string {
  return (party === 'partner' ? detail.partnerStaffName : detail.counterpartName) ?? '-';
}

/** Completion readiness — mirrors the BE's `complete` validation. */
export function checkpointProgress(detail: CheckpointDetail): {
  total: number;
  assessed: number;
  photographed: number;
  ready: boolean;
} {
  const total = detail.points.length;
  const assessed = detail.points.filter((p) => p.passed !== null).length;
  const photographed = detail.points.filter((p) =>
    p.media.some((m) => m.kind === 'photo' && m.status === 'uploaded'),
  ).length;
  return {
    total,
    assessed,
    photographed,
    ready: total > 0 && assessed === total && photographed === total,
  };
}

export type MediaKind = 'photo' | 'signature_partner' | 'signature_counterpart';

export interface CheckpointMedia {
  id: number;
  kind: MediaKind;
  contentType: string;
  status: 'pending' | 'uploaded';
  url: string;
}

export interface CheckpointPoint {
  id: number;
  pointKey: PointKey;
  label: string;
  passed: boolean | null;
  note: string | null;
  media: CheckpointMedia[];
}

export interface CheckpointDetail {
  id: number;
  plateNumber: string;
  plateNumberNorm: string;
  handoverType: HandoverType;
  status: 'draft' | 'completed';
  /** Partner's own officer — penyerah on a delivery, penerima on a return. */
  partnerStaffName: string | null;
  /** External customer/driver — the other side of the handover. */
  counterpartName: string | null;
  counterpartPhone: string | null;
  odometerKm: number | null;
  batteryPercent: number | null;
  generalNotes: string | null;
  createdAt: string;
  completedAt: string | null;
  points: CheckpointPoint[];
  signatures: CheckpointMedia[];
}

export interface CheckpointSummary {
  id: number;
  plateNumber: string;
  handoverType: HandoverType;
  status: 'draft' | 'completed';
  counterpartName: string | null;
  odometerKm: number | null;
  createdAt: string;
  completedAt: string | null;
  photoCount: number;
}

export interface PresignResult {
  mediaId: number;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}
