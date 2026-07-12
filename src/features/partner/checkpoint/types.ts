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
