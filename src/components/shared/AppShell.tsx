import { useState, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  CalendarDays,
  Car,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Table2,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/features/auth/hooks';

export type Audience = 'admin' | 'partner';

// `requireRole` hides an item unless the session user holds that role
// (UX only — the route + backend still enforce access).
type NavLeaf = { to: string; label: string; icon: typeof Table2; requireRole?: string };
// A collapsible group of leaves under one label (e.g. "Driver").
type NavGroup = { label: string; icon: typeof Table2; children: NavLeaf[]; requireRole?: string };
type NavEntry = NavLeaf | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;

const NAV: Record<Audience, NavEntry[]> = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    {
      label: 'Gojek',
      icon: Table2,
      children: [
        { to: '/admin/gojek/dashboard', label: 'Gojek Dashboard', icon: LayoutDashboard },
        { to: '/admin/fleet-monitoring', label: 'Gojek Monitoring', icon: Table2 },
      ],
    },
    {
      label: 'Grab',
      icon: Car,
      children: [
        { to: '/admin/grab/dashboard', label: 'Grab Dashboard', icon: LayoutDashboard },
        { to: '/admin/fleet-monitoring-grab', label: 'Grab Monitoring', icon: Table2 },
      ],
    },
    { to: '/admin/logs', label: 'Log', icon: ScrollText, requireRole: 'super_admin' },
    {
      to: '/admin/user-management',
      label: 'Manajemen Akun',
      icon: Users,
      requireRole: 'super_admin',
    },
  ],
  partner: [
    { to: '/partner/fleet-monitoring', label: 'Fleet Monitoring — Gojek', icon: Table2 },
    { to: '/partner/fleet-monitoring-grab', label: 'Fleet Monitoring — Grab', icon: Car },
    {
      label: 'Driver',
      icon: Users,
      children: [
        { to: '/partner/drivers', label: 'Daftar Driver', icon: Users },
        { to: '/partner/cicilan', label: 'Cicilan', icon: Wallet },
      ],
    },
    { to: '/partner/rental-monitoring', label: 'Rental Monitoring', icon: CalendarDays },
    { to: '/partner/checkpoint', label: 'Checkpoint', icon: ClipboardCheck },
    { to: '/partner/daftarkan-plat', label: 'Plate Registration', icon: ClipboardList },
  ],
};

const roleAllows = (user: SessionUser | null | undefined, requireRole?: string) =>
  !requireRole || (user?.roles ?? []).includes(requireRole);

const LINK_CLASS =
  'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:font-medium';

function NavLink({
  item,
  onNavigate,
  indented = false,
}: {
  item: NavLeaf;
  onNavigate?: () => void;
  indented?: boolean;
}) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: item.to === '/admin' }}
      className={cn(LINK_CLASS, indented && 'py-1.5 pl-4')}
    >
      <item.icon className={cn('shrink-0', indented ? 'size-3.5' : 'size-4')} aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroupItem({
  group,
  user,
  onNavigate,
}: {
  group: NavGroup;
  user: SessionUser | null | undefined;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const children = group.children.filter((c) => roleAllows(user, c.requireRole));
  const childActive = children.some((c) => pathname.startsWith(c.to));
  const [open, setOpen] = useState(childActive);

  // Keep the group unfolded whenever navigation lands on one of its children
  // (derive-during-render pattern — no effect, no cascading renders).
  const [prevChildActive, setPrevChildActive] = useState(childActive);
  if (childActive !== prevChildActive) {
    setPrevChildActive(childActive);
    if (childActive) setOpen(true);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(LINK_CLASS, 'w-full', childActive && 'font-medium')}
      >
        <group.icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{group.label}</span>
        <ChevronDown
          className={cn('ml-auto size-4 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open && (
        <div className="mt-0.5 ml-4 space-y-0.5 border-l border-sidebar-border pl-1">
          {children.map((child) => (
            <NavLink key={child.to} item={child} onNavigate={onNavigate} indented />
          ))}
        </div>
      )}
    </div>
  );
}

// Presentational shell — the session user + logout handler are injected by the
// audience-specific layout so this component fires no auth queries of its own.
export type AppShellProps = {
  audience: Audience;
  user: SessionUser | null | undefined;
  onLogout: () => void;
  logoutPending: boolean;
  children: ReactNode;
};

function SidebarContent({
  audience,
  user,
  onLogout,
  logoutPending,
  onNavigate,
}: Omit<AppShellProps, 'children'> & { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Car className="size-5 text-primary" aria-hidden />
        <span className="text-sm font-semibold tracking-tight">fleet-taxi.id</span>
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs tracking-wide text-muted-foreground uppercase">
          {audience}
        </span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Navigasi utama">
        {NAV[audience]
          .filter((entry) => roleAllows(user, entry.requireRole))
          .map((entry) =>
            isGroup(entry) ? (
              <NavGroupItem key={entry.label} group={entry} user={user} onNavigate={onNavigate} />
            ) : (
              <NavLink key={entry.to} item={entry} onNavigate={onNavigate} />
            ),
          )}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 px-1 text-xs text-muted-foreground">
          <div className="truncate font-medium text-foreground">{user?.fullName}</div>
          <div className="truncate">{user?.email}</div>
          {user?.partner && <div className="truncate">Partner: {user.partner.name}</div>}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onLogout}
          disabled={logoutPending}
        >
          <LogOut aria-hidden />
          {logoutPending ? 'Keluar…' : 'Keluar'}
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ audience, user, onLogout, logoutPending, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarProps = { audience, user, onLogout, logoutPending };

  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:block">
        <div className="sticky top-0 h-svh">
          <SidebarContent {...sidebarProps} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-4 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="md:hidden" aria-label="Buka menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">Navigasi</SheetTitle>
              <SidebarContent {...sidebarProps} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <h1 className="truncate text-sm font-medium text-muted-foreground">
            Fleet / Deposit Reconciliation Dashboard
          </h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
