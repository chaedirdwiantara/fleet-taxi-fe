/**
 * Judul cicilan yang paling sering dipakai partner — saran UI saja, bukan enum
 * kontrak: BE menerima judul bebas (max 150 karakter), jadi partner tetap bisa
 * mengetik judul kustom di luar daftar ini.
 */
export const TITLE_PRESETS = [
  'Cicilan Deposit',
  'E-Tilang',
  'COP (Car Ownership Program)',
  'Kontrakan',
] as const;
