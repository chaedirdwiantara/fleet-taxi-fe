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

export const DOCUMENT_KINDS = ['ktp', 'sim', 'skck', 'deposit_proof', 'deposit_return_proof'] as const;
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
  deposit_proof: 'Bukti Deposit',
  deposit_return_proof: 'Bukti Pengembalian Deposit',
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
  resignedAt: string | null;
  joinedAt: string;
}

export interface DriverDetail extends DriverSummary {
  address: string | null;
  ktpNo: string | null;
  simNo: string | null;
  bankAccount: string | null;
  /** Set when the deposit-return decision was recorded. */
  depositReturnDecidedAt: string | null;
  updatedAt: string;
  documents: DriverDocument[];
}

/** PATCH body — master data plus the resign / deposit-return lifecycle. */
export interface DriverUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
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
