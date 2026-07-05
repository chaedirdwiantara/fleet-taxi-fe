// Partner portal domain: a plate the partner registered ("Daftarkan Plat",
// legacy /partner/plates — nomor + Type). Fleet grids are scoped to these,
// server-side, from the session partner (the client never sends a partnerId).
export type PartnerPlate = {
  id: number;
  plateNumber: string; // as entered, e.g. "B 1793 SCP"
  plateNumberNorm: string; // normalized [A-Z0-9]
  vehicleType: string | null; // "Type", free text (e.g. "Premium - BYD M6")
};
