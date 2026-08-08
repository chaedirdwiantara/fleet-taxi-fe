# Design System — fleet-taxi-dashboard-web

Standar visual & komponen untuk seluruh UI (admin console + partner portal). Semua aturan di sini wajib untuk kode baru; pelanggaran = temuan review.

## 1. Foundations

### Warna (token, bukan nilai)

Token didefinisikan di `src/index.css` (oklch, light + `.dark`). **Selalu pakai kelas token** — jangan hex/oklch inline.

| Token                                   | Semantik                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `primary`                               | Aksi utama — tombol submit, link aktif, ring fokus. Merah brand di `/admin`, Royal Blue di `/partner` (lihat "Aksen per audiens" di bawah) |
| `destructive`                           | Aksi merusak / error                                                                                                                       |
| `secondary` / `muted` / `accent`        | Surface & teks sekunder (slate)                                                                                                            |
| `card` / `popover` / `border` / `input` | Surface & garis                                                                                                                            |
| `sidebar-*`                             | Khusus sidebar navigasi                                                                                                                    |
| `chart-1..5`                            | Seri chart: 1=biru (utama), 2=teal, 3=amber, 4=violet, 5=rose — pakai berurutan                                                            |
| `brand` / `brand-foreground`            | Logo Fleet Taxi — nilainya sama dengan `primary`, tapi token terpisah                                                                      |

**Aksen per audiens.** `primary`, `ring`, `sidebar-primary`, `sidebar-ring` dan `brand`
punya nilai berbeda di kedua konsol: **merah brand di `/admin`, Royal Blue di `/partner`**.
Override-nya ada di `src/index.css` pada blok `[data-audience='partner']` (+ varian
`.dark[...]`), dan atribut `data-audience` ditulis ke `<html>` oleh
`components/shared/AudienceTheme.tsx` — bukan ke elemen wrapper, supaya portal Radix
(Dialog/Sheet/Popover/Dropdown) yang dirender ke `<body>` ikut mewarisi.
Konsekuensinya untuk kode baru: **tetap pakai kelas token saja** (`bg-primary`,
`text-primary`, `ring-ring`); jangan pernah menulis merah atau biru langsung, karena
komponen yang sama harus benar di dua konsol. `destructive` sengaja tetap merah di
keduanya — artinya "merusak", bukan "brand".

**Pakai `primary` untuk UI, `brand` hanya untuk logo.** Nilainya kebetulan sama di light
mode, tapi jangan disamakan: `--brand-gradient-from|to` dipakai eksklusif oleh
`components/shared/Logo.tsx`, dan `--brand` versi dark sengaja lebih terang (disetel
untuk teks di sidebar gelap) sementara `--primary` dark lebih dalam supaya teks putih
di atas tombol tetap lolos WCAG AA.

`chart-1` **tetap biru** dan tidak ikut berubah: chart menampilkan setoran (nilai
positif), sedangkan merah di produk ini berarti "bermasalah"; selain itu merah di
`chart-1` bertabrakan dengan `chart-5` (rose) — ΔE 11,7, di bawah ambang 15.

Pengecualian sah: legenda status fleet-monitoring (`src/features/fleet/lib/thresholds.ts`) memakai kelas palette Tailwind (red/yellow/green/purple/orange/blue/gray) karena meniru legenda spreadsheet bisnis — jangan diganti token.

### Typography

- Font: **Inter Variable** (self-host `@fontsource-variable/inter`, token `--font-sans`).
- Skala: `text-xs` meta/badge · `text-sm` body & tabel (default dashboard) · `text-base` form mobile · `text-lg`–`text-xl` judul section/card · `text-2xl` judul halaman.
- **Dilarang ukuran arbitrer** (`text-[10px]` dll.). Minimum `text-xs`.
- Angka pada tabel otomatis `tabular-nums` (rule global di `index.css`) — uang & plat sejajar.
- Uang selalu diformat via `src/lib/money` (`formatRupiah`), tanggal via `src/lib/datetime` (WIB).

### Spacing, radius, breakpoint

- Grid 4px: `gap-2` intra-komponen, `gap-4` antar-field/card, `gap-6`/`p-6` antar-section.
- Padding halaman: `p-4 md:p-6` (sudah di AppShell `<main>`).
- Radius: pakai `rounded-md/lg/xl` (turunan `--radius`), jangan nilai arbitrer.
- Mobile-first; `md:` (768px) = ambang sidebar desktop vs Sheet drawer. Uji setiap layar di 375px.

## 2. Komponen

- **Wajib primitives `src/components/ui/`** (shadcn new-york): Button, Input, Select, Dialog, Sheet, Table, Badge, Skeleton, Spinner, Form, dst. Jangan bikin tombol/input ad-hoc.
- Varian baru = tambah di CVA komponen ybs. (lihat `button.tsx`), bukan tumpukan class di call-site.
- Compose class hanya via `cn()` (`src/lib/utils`).
- **Form baru wajib `ui/form.tsx`** (`Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage`) + RHF + zod resolver; pesan validasi Bahasa Indonesia. Contoh: `src/features/auth/LoginForm.tsx`.
- Loading: `Skeleton` untuk konten yang bentuknya diketahui, `Spinner` untuk aksi/tombol. Data kosong: `src/components/shared/EmptyState.tsx`.
- Komponen domain tinggal di `src/features/<domain>/components/`; hanya yang lintas-domain masuk `src/components/shared/`.

## 3. Dark mode

- `ThemeProvider` (`src/components/shared/ThemeProvider.tsx`): light/dark/system, persist `localStorage['ui-theme']`; toggle di header AppShell.
- Semua UI baru harus benar di kedua mode. Kelas token otomatis ikut; kelas palette manual (mis. status legend) wajib diberi varian `dark:` bila kontras rusak.

## 4. Workflow

- **Prettier** adalah satu-satunya formatter (`pnpm format` / `format:check`; plugin tailwindcss men-sort class). ESLint untuk korektness (`pnpm lint`).
- Urutan sebelum commit: `pnpm lint` → `pnpm test` → `pnpm build` (build = typecheck).
- Commit format-only terpisah dari perubahan logika; SHA-nya dicatat di `.git-blame-ignore-revs`.
- Aksesibilitas: elemen ikon-saja wajib `aria-label`; ikon dekoratif `aria-hidden`; state error form tersambung via `aria-invalid`/`aria-describedby` (otomatis oleh Form primitive).

## 5. Do / Don't

| Do                                   | Don't                                     |
| ------------------------------------ | ----------------------------------------- |
| `bg-primary text-primary-foreground` | `bg-[#3f51b5] text-white`                 |
| `text-xs`                            | `text-[10px]`                             |
| Varian CVA di `ui/button.tsx`        | 12 class utility di call-site             |
| `formatRupiah(amount)`               | `Rp ${amount.toLocaleString()}`           |
| `Form` + `FormMessage`               | `<p className="text-destructive">` manual |
| `EmptyState`                         | `<div>Tidak ada data</div>` polos         |
| Uji 375px + dark mode                | Hanya cek desktop light                   |
