import { useState } from 'react';
import { Copy, KeyRound, Loader2, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminSession } from '@/features/auth/hooks';
import {
  useAdminUsersQuery,
  useCreateAdminUser,
  useCreateApiKey,
  useCreatePartner,
  useCreatePartnerUser,
  useDeleteAdminUser,
  usePartnersQuery,
  useUpdateAdminUser,
} from '@/features/admin-users/hooks';
import type { AdminUser, ApiKeyCreated, Partner, StaffRole } from '@/features/admin-users/types';
import { formatDateTimeWIB } from '@/lib/datetime';

type Tab = 'admin' | 'partner';

// super_admin-only account management (create + list admin & partner accounts).
// The page is gated client-side for UX; the backend (CASL) is the real authority.
export function UserManagementPage() {
  const { data: session } = useAdminSession();
  const isSuperAdmin = (session?.roles ?? []).includes('super_admin');
  const [tab, setTab] = useState<Tab>('admin');

  if (!isSuperAdmin) return <AccessDenied />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Manajemen Akun</h2>
        <p className="text-sm text-muted-foreground">
          Buat dan kelola akun login untuk staf admin dan portal partner.
        </p>
      </div>

      <div
        className="inline-flex rounded-md border bg-muted p-0.5 text-sm"
        role="tablist"
        aria-label="Jenis akun"
      >
        {(
          [
            ['admin', 'User Admin'],
            ['partner', 'User Partner'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={
              'rounded px-3 py-1.5 font-medium transition-colors ' +
              (tab === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'admin' ? <UserAdminTab /> : <UserPartnerTab />}
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-5 text-destructive" aria-hidden />
            Akses ditolak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Halaman manajemen akun hanya tersedia untuk <strong>super admin</strong>. Hubungi
            administrator jika Anda memerlukan akses.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- User Admin tab ---------------------------------------------------------

const STAFF_ROLES: { value: StaffRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'finance', label: 'Finance' },
  { value: 'super_admin', label: 'Super Admin' },
];

function UserAdminTab() {
  const users = useAdminUsersQuery('admin');
  const create = useCreateAdminUser();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('admin');

  const passwordTooShort = password.length > 0 && password.length < 8;
  const canSubmit = !!email.trim() && !!fullName.trim() && password.length >= 8;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    create.mutate(
      { email: email.trim(), fullName: fullName.trim(), password, roles: [role] },
      {
        onSuccess: () => {
          setEmail('');
          setFullName('');
          setPassword('');
          setRole('admin');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">Tambah User Admin</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                placeholder="staf@fleet-taxi.id"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-fullName">Nama Lengkap</Label>
              <Input
                id="admin-fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="off"
                placeholder="Budi Santoso"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password Awal</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                aria-invalid={passwordTooShort}
                required
              />
              <p className="text-xs text-muted-foreground">
                Pengguna wajib menggantinya saat login pertama.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
                <SelectTrigger id="admin-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={!canSubmit || create.isPending}>
                {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
                Buat User Admin
              </Button>
              {create.isError && (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {create.error.message}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">
            Daftar User Admin {users.data ? `(${users.data.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <UsersTable
            query={users}
            columns={['nama', 'email', 'role', 'status', 'mcp', 'dibuat', 'aksi']}
            type="admin"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ---- User Partner tab -------------------------------------------------------

function UserPartnerTab() {
  const partners = usePartnersQuery();
  const users = useAdminUsersQuery('partner');
  const createPartner = useCreatePartner();
  const createUser = useCreatePartnerUser();
  const createKey = useCreateApiKey();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');

  // new-partner mini form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');

  // portal-user form
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  // API key dialog
  const [apiKey, setApiKey] = useState<ApiKeyCreated | null>(null);

  const partnerId = selectedPartnerId ? Number(selectedPartnerId) : null;
  const selectedPartner = partners.data?.find((p) => String(p.id) === selectedPartnerId) ?? null;

  const submitNewPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    createPartner.mutate(
      { code: code.trim(), name: name.trim(), type: type.trim() || undefined },
      {
        onSuccess: (partner) => {
          setSelectedPartnerId(String(partner.id));
          setCode('');
          setName('');
          setType('');
        },
      },
    );
  };

  const canSubmitUser =
    partnerId != null && !!email.trim() && !!fullName.trim() && password.length >= 8;

  const submitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitUser || partnerId == null) return;
    createUser.mutate(
      { partnerId, email: email.trim(), fullName: fullName.trim(), password },
      {
        onSuccess: () => {
          setEmail('');
          setFullName('');
          setPassword('');
        },
      },
    );
  };

  const generateKey = () => {
    if (partnerId == null) return;
    createKey.mutate(
      { partnerId, scopes: ['pricelist', 'order:create', 'order:read'], rateLimit: 60 },
      { onSuccess: (key) => setApiKey(key) },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">1. Pilih atau Buat Partner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="partner-select">Partner</Label>
            <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
              <SelectTrigger id="partner-select" className="w-full sm:w-96">
                <SelectValue placeholder={partners.isPending ? 'Memuat…' : 'Pilih partner…'} />
              </SelectTrigger>
              <SelectContent>
                {(partners.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.code} — {p.name}
                    {p.type ? ` (${p.type})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-dashed p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Atau buat partner baru</p>
            <form onSubmit={submitNewPartner} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="partner-code">Kode</Label>
                <Input
                  id="partner-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="BHISA"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partner-name">Nama</Label>
                <Input
                  id="partner-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bhisa Shuttle"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partner-type">Tipe (opsional)</Label>
                <Input
                  id="partner-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="shuttle"
                  autoComplete="off"
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!code.trim() || !name.trim() || createPartner.isPending}
                >
                  {createPartner.isPending ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Plus aria-hidden />
                  )}
                  Buat Partner
                </Button>
                {createPartner.isError && (
                  <p className="mt-2 text-sm text-destructive" role="alert">
                    {createPartner.error.message}
                  </p>
                )}
              </div>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">2. Buat User Portal Partner</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {partnerId == null ? (
            <p className="text-sm text-muted-foreground">Pilih partner terlebih dahulu di atas.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                Untuk partner: <strong>{selectedPartner?.code}</strong> — {selectedPartner?.name}
              </p>
              <form onSubmit={submitUser} className="grid gap-3 sm:grid-cols-3" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="pu-email">Email</Label>
                  <Input
                    id="pu-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    placeholder="portal@bhisa.id"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pu-fullName">Nama Lengkap</Label>
                  <Input
                    id="pu-fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="off"
                    placeholder="Operator Bhisa"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pu-password">Password Awal</Label>
                  <Input
                    id="pu-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    aria-invalid={password.length > 0 && password.length < 8}
                    required
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
                  <Button type="submit" disabled={!canSubmitUser || createUser.isPending}>
                    {createUser.isPending ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <Plus aria-hidden />
                    )}
                    Buat User Partner
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateKey}
                    disabled={createKey.isPending}
                  >
                    {createKey.isPending ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <KeyRound aria-hidden />
                    )}
                    Generate API Key
                  </Button>
                </div>
                {createUser.isError && (
                  <p className="text-sm text-destructive sm:col-span-3" role="alert">
                    {createUser.error.message}
                  </p>
                )}
                {createKey.isError && (
                  <p className="text-sm text-destructive sm:col-span-3" role="alert">
                    {createKey.error.message}
                  </p>
                )}
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardHeader className="px-4 pb-0">
          <CardTitle className="text-sm">
            Daftar User Partner {users.data ? `(${users.data.length})` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <UsersTable
            query={users}
            columns={['nama', 'email', 'partner', 'status', 'dibuat', 'aksi']}
            type="partner"
            partners={partners.data ?? []}
          />
        </CardContent>
      </Card>

      <ApiKeyDialog apiKey={apiKey} onClose={() => setApiKey(null)} />
    </div>
  );
}

// ---- Shared user table ------------------------------------------------------

type Column = 'nama' | 'email' | 'role' | 'partner' | 'status' | 'mcp' | 'dibuat' | 'aksi';

const COLUMN_LABEL: Record<Column, string> = {
  nama: 'Nama',
  email: 'Email',
  role: 'Role',
  partner: 'Partner',
  status: 'Status',
  mcp: 'Ganti Password',
  dibuat: 'Tanggal Dibuat',
  aksi: 'Aksi',
};

function UsersTable({
  query,
  columns,
  type,
  partners,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    isSuccess: boolean;
    data?: AdminUser[];
    error?: Error | null;
  };
  columns: Column[];
  type: 'admin' | 'partner';
  partners?: Partner[];
}) {
  const { data: session } = useAdminSession();
  const currentUserId = session?.id;

  if (query.isPending) return <p className="text-sm text-muted-foreground">Memuat…</p>;
  if (query.isError)
    return <p className="text-sm text-destructive">Gagal memuat: {query.error?.message}</p>;
  if (query.isSuccess && (query.data?.length ?? 0) === 0)
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data.</p>;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c} className={c === 'aksi' ? 'text-right' : undefined}>
                {COLUMN_LABEL[c]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(query.data ?? []).map((u) => (
            <TableRow key={u.id}>
              {columns.map((c) => (
                <TableCell
                  key={c}
                  className={
                    c === 'nama' ? 'font-medium' : c === 'aksi' ? 'text-right' : undefined
                  }
                >
                  {c === 'aksi' ? (
                    <UserActions
                      user={u}
                      type={type}
                      partners={partners ?? []}
                      isSelf={u.id === currentUserId}
                    />
                  ) : (
                    <UserCell user={u} column={c} />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---- per-row edit + delete --------------------------------------------------

function UserActions({
  user,
  type,
  partners,
  isSelf,
}: {
  user: AdminUser;
  type: 'admin' | 'partner';
  partners: Partner[];
  isSelf: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const del = useDeleteAdminUser(type);

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${user.email}`}
        className="text-amber-600 hover:bg-amber-500/10"
        onClick={() => setEditing(true)}
      >
        <Pencil className="size-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Hapus ${user.email}`}
            className="text-destructive hover:bg-destructive/10"
            disabled={isSelf || del.isPending}
            title={isSelf ? 'Tidak bisa menghapus akun sendiri' : undefined}
          >
            <Trash2 className="size-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{user.email}</strong> akan dihapus permanen dan tidak bisa login lagi.
              Riwayat import yang diunggahnya tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {del.isError && (
            <p className="text-sm text-destructive" role="alert">
              {del.error.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                del.mutate(user.id);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditUserDialog
        open={editing}
        onClose={() => setEditing(false)}
        user={user}
        type={type}
        partners={partners}
      />
    </div>
  );
}

function EditUserDialog({
  open,
  onClose,
  user,
  type,
  partners,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUser;
  type: 'admin' | 'partner';
  partners: Partner[];
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Akun</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        {/* keyed remount so the form re-seeds from the freshly-opened user */}
        {open && (
          <EditUserForm key={user.id} user={user} type={type} partners={partners} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  user,
  type,
  partners,
  onClose,
}: {
  user: AdminUser;
  type: 'admin' | 'partner';
  partners: Partner[];
  onClose: () => void;
}) {
  const update = useUpdateAdminUser(type);
  const [fullName, setFullName] = useState(user.fullName ?? '');
  const [email, setEmail] = useState(user.email);
  const [isActive, setIsActive] = useState(user.isActive);
  const [password, setPassword] = useState('');
  const staffRole = (STAFF_ROLES.find((r) => user.roles.includes(r.value))?.value ??
    'admin') as StaffRole;
  const [role, setRole] = useState<StaffRole>(staffRole);
  const [partnerId, setPartnerId] = useState<string>(user.partner ? String(user.partner.id) : '');

  const passwordTooShort = password.length > 0 && password.length < 8;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim() || passwordTooShort) return;
    update.mutate(
      {
        id: user.id,
        patch: {
          email: email.trim(),
          fullName: fullName.trim(),
          isActive,
          ...(type === 'admin' ? { roles: [role] } : {}),
          ...(type === 'partner' && partnerId ? { partnerId: Number(partnerId) } : {}),
          ...(password ? { password } : {}),
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="eu-name">Nama Lengkap</Label>
        <Input id="eu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="eu-email">Email</Label>
        <Input
          id="eu-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      {type === 'admin' && (
        <div className="space-y-1.5">
          <Label htmlFor="eu-role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
            <SelectTrigger id="eu-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAFF_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {type === 'partner' && (
        <div className="space-y-1.5">
          <Label htmlFor="eu-partner">Partner (organisasi)</Label>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger id="eu-partner" className="w-full">
              <SelectValue placeholder="Pilih partner…" />
            </SelectTrigger>
            <SelectContent>
              {partners.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.code} — {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="eu-status">Status</Label>
        <Select value={isActive ? 'active' : 'inactive'} onValueChange={(v) => setIsActive(v === 'active')}>
          <SelectTrigger id="eu-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="eu-password">Reset Password (opsional)</Label>
        <Input
          id="eu-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Kosongkan jika tidak diubah"
          aria-invalid={passwordTooShort}
        />
        <p className="text-xs text-muted-foreground">
          Jika diisi, pengguna wajib menggantinya saat login berikutnya (min. 8 karakter).
        </p>
      </div>

      {update.isError && (
        <p className="text-sm text-destructive" role="alert">
          {update.error.message}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Batal
        </Button>
        <Button
          type="submit"
          disabled={update.isPending || !email.trim() || !fullName.trim() || passwordTooShort}
        >
          {update.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}

function UserCell({ user, column }: { user: AdminUser; column: Column }) {
  switch (column) {
    case 'nama':
      return <>{user.fullName || '-'}</>;
    case 'email':
      return <span className="text-muted-foreground">{user.email}</span>;
    case 'role':
      return (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((r) => (
            <Badge key={r} variant="secondary">
              {r}
            </Badge>
          ))}
        </div>
      );
    case 'partner':
      return user.partner ? (
        <span className="text-muted-foreground">
          {user.partner.code} — {user.partner.name}
          {user.partner.type ? ` (${user.partner.type})` : ''}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    case 'status':
      return user.isActive ? (
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600">
          Aktif
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Nonaktif
        </Badge>
      );
    case 'mcp':
      return user.mustChangePassword ? (
        <Badge variant="outline" className="border-amber-500/40 text-amber-600">
          Perlu diganti
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    case 'dibuat':
      return <span className="text-muted-foreground">{formatDateTimeWIB(user.createdAt)}</span>;
    default:
      return null;
  }
}

// ---- API key dialog (rawKey shown once) -------------------------------------

export function ApiKeyDialog({
  apiKey,
  onClose,
}: {
  apiKey: ApiKeyCreated | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey.rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the user can still select the text manually
    }
  };

  return (
    <Dialog
      open={apiKey != null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>API Key Baru</DialogTitle>
          <DialogDescription>
            Salin sekarang — key ini <strong>hanya ditampilkan sekali</strong> dan tidak akan bisa
            dilihat lagi.
          </DialogDescription>
        </DialogHeader>
        {apiKey && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-sm">
                {apiKey.rawKey}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={copy}
                aria-label="Salin API key"
              >
                <Copy className="size-4" />
              </Button>
            </div>
            {copied && <p className="text-xs text-emerald-600">Tersalin ke clipboard.</p>}
            <p className="text-xs text-muted-foreground">Prefix: {apiKey.keyPrefix}</p>
          </div>
        )}
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Saya sudah menyimpannya
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
