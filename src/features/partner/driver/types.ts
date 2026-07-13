// Partner-portal driver management — types mirror the BE presenter
// (partner-drivers/driver-presenter.ts). Statuses/kinds are stable enum
// strings shared via OpenAPI; labels are display-only and owned by the FE.

export const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const DEPOSIT_STATUSES = ['none', 'waiting', 'approved', 'rejected'] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

export const DOCUMENT_KINDS = ['ktp', 'sim', 'skck', 'deposit_proof', 'deposit_return_proof'] as const;
export type DriverDocumentKind = (typeof DOCUMENT_KINDS)[number];

/** The three identity documents a partner ticks off before final approval. */
export const CHECKABLE_DOC_KINDS = ['ktp', 'sim', 'skck'] as const;
export type CheckableDocKind = (typeof CHECKABLE_DOC_KINDS)[number];

export const DOC_KIND_LABELS: Record<DriverDocumentKind, string> = {
  ktp: 'KTP',
  sim: 'SIM',
  skck: 'SKCK',
  deposit_proof: 'Bukti Deposit',
  deposit_return_proof: 'Bukti Pengembalian Deposit',
};

export type DecisionAction = 'approve' | 'reject';

export interface DriverDocument {
  id: number;
  kind: DriverDocumentKind;
  contentType: string;
  status: 'pending' | 'uploaded';
  /** Present for uploaded documents only. */
  url?: string;
}

/** Shared master-data fields of every driver view. */
export interface DriverBase {
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
}

export interface RegistrationSummary extends DriverBase {
  registrationStatus: RegistrationStatus;
  rejectNote: string | null;
  ktpVerified: boolean;
  simVerified: boolean;
  skckVerified: boolean;
  depositAmount: number;
  depositStatus: DepositStatus;
  createdAt: string;
}

export interface RegistrationDetail extends RegistrationSummary {
  depositNote: string | null;
  depositDecidedAt: string | null;
  updatedAt: string;
  documents: DriverDocument[];
}

export interface DriverSummary extends DriverBase {
  isActive: boolean;
  depositAmount: number;
  depositStatus: DepositStatus;
  joinedAt: string;
}

export interface DriverDetail extends DriverSummary {
  depositNote: string | null;
  depositDecidedAt: string | null;
  updatedAt: string;
  documents: DriverDocument[];
}

export interface ResignationSummary extends DriverBase {
  depositAmount: number;
  depositReturnStatus: DepositStatus;
  depositReturnDecidedAt: string | null;
  resignedAt: string;
  joinedAt: string;
}

export interface ResignationDetail extends ResignationSummary {
  depositStatus: DepositStatus;
  updatedAt: string;
  documents: DriverDocument[];
}

/** Master-data input shared by create/edit; `name` is required on create. */
export interface RegistrationUpsertInput {
  name: string;
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
}

export interface DriverUpdateInput extends Partial<RegistrationUpsertInput> {
  isActive?: boolean;
}

export interface PresignDocumentResult {
  documentId: number;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
}
