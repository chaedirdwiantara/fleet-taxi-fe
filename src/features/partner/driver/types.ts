// Partner-portal driver management — types mirror the BE presenter
// (partner-drivers/driver-presenter.ts). The roster auto-syncs server-side
// from Fleet Monitoring (Gojek/Grab) on every list load; `source` marks the
// origin of a row. Enum strings are stable across the OpenAPI contract;
// labels are display-only and owned by the FE.

export const DRIVER_SOURCES = ['gojek', 'grab', 'manual'] as const;
export type DriverSource = (typeof DRIVER_SOURCES)[number];

export const SOURCE_LABELS: Record<DriverSource, string> = {
  gojek: 'Gojek',
  grab: 'Grab',
  manual: 'Manual',
};

// Deposit-return lifecycle of a resigned driver. The current flow only
// produces 'none' (not yet returned / reset) and 'approved' (returned);
// 'waiting' / 'rejected' remain in the contract union.
export const DEPOSIT_RETURN_STATUSES = ['none', 'waiting', 'approved', 'rejected'] as const;
export type DepositReturnStatus = (typeof DEPOSIT_RETURN_STATUSES)[number];

export const DOCUMENT_KINDS = [
  'ktp',
  'sim',
  'skck',
  'home_survey',
  'deposit_proof',
  'deposit_return_proof',
] as const;
export type DriverDocumentKind = (typeof DOCUMENT_KINDS)[number];

/**
 * Identity documents managed on the edit page's Dokumen card.
 * 'skck' stays in the contract (DOCUMENT_KINDS) but is not collected via the UI.
 */
export const IDENTITY_DOC_KINDS = ['ktp', 'sim'] as const;

export const DOC_KIND_LABELS: Record<DriverDocumentKind, string> = {
  ktp: 'KTP',
  sim: 'SIM',
  skck: 'SKCK',
  home_survey: 'Foto Survey Rumah',
  deposit_proof: 'Bukti Deposit',
  deposit_return_proof: 'Bukti Pengembalian Deposit',
};

/**
 * How a driver left the fleet. `manual` = the partner marked them resign;
 * `auto` = the roster sync stopped finding them in the Gojek/Grab import
 * ("Keluar" in the monitoring grid) — a state that clears itself the moment
 * they show up in a later import.
 */
export const RESIGNED_TYPES = ['manual', 'auto'] as const;
export type ResignedType = (typeof RESIGNED_TYPES)[number];

export const RESIGNED_TYPE_LABELS: Record<ResignedType, string> = {
  manual: 'Ditandai Manual',
  auto: 'Terdeteksi Keluar',
};

export interface DriverDocument {
  id: number;
  kind: DriverDocumentKind;
  contentType: string;
  status: 'pending' | 'uploaded';
  /** Present for uploaded documents only. */
  url?: string;
}

/** One roster row — the list includes resigned drivers (`resignedAt` set). */
export interface DriverSummary {
  id: number;
  driverCode: string | null;
  name: string;
  source: DriverSource;
  plateNumber: string | null;
  phone: string | null;
  email: string | null;
  simExpired: string | null;
  isActive: boolean;
  /** Integer rupiah — formatted, never computed, client-side. */
  depositAmount: number;
  depositReturnStatus: DepositReturnStatus;
  /** ISO timestamp — set when the partner marked the driver resign. */
  resignedAt: string | null;
  /**
   * YYYY-MM-DD of the last day the driver appeared in the import, set only
   * while the sync considers them gone. Derived server-side, never edited.
   */
  exitedAt: string | null;
  joinedAt: string;
}

export interface DriverDetail extends DriverSummary {
  address: string | null;
  /** Home-survey pin (WGS84 degrees); both are null or both are set. */
  homeLat: number | null;
  homeLng: number | null;
  ktpNo: string | null;
  simNo: string | null;
  bankAccount: string | null;
  /** Set when the deposit-return decision was recorded. */
  depositReturnDecidedAt: string | null;
  updatedAt: string;
  documents: DriverDocument[];
}

/** Which lifecycle bucket a row belongs to — drives the badges and filters. */
export function resignedTypeOf(driver: {
  resignedAt: string | null;
  exitedAt: string | null;
}): ResignedType | null {
  if (driver.resignedAt) return 'manual';
  return driver.exitedAt ? 'auto' : null;
}

/** Master-data fields shared by the create and update bodies. */
export interface DriverMasterDataInput {
  email?: string;
  phone?: string;
  address?: string;
  /** Send both or neither; `null` clears the pin. */
  homeLat?: number | null;
  homeLng?: number | null;
  ktpNo?: string;
  simNo?: string;
  /** YYYY-MM-DD */
  simExpired?: string;
  /** Must be one of the partner's registered plates when set. */
  plateNumber?: string;
  bankAccount?: string;
  /** Integer rupiah. */
  depositAmount?: number;
  isActive?: boolean;
}

/** POST body — manual registration; only the name is required. */
export interface DriverCreateInput extends DriverMasterDataInput {
  name: string;
}

/** PATCH body — master data plus the resign / deposit-return lifecycle. */
export interface DriverUpdateInput extends DriverMasterDataInput {
  name?: string;
  /** true = tandai resign (nonaktif); false = batalkan resign (resets return state). */
  resigned?: boolean;
  /** Only for resigned drivers; the BE requires an uploaded deposit_return_proof. */
  depositReturned?: boolean;
}

export interface PresignDocumentResult {
  documentId: number;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}
