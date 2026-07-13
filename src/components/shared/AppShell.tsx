import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  CalendarDays,
  Car,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Table2,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { SessionUser } from '@/features/auth/hooks';

export type Audience = 'admin' | 'partner';

// `requireRole` hides an item unless the session user holds that role
// (UX only — the route + backend still enforce access).
type NavItem = { to: string; label: string; icon: typeof Table2; requireRole?: string };

const NAV: Record<Audience, NavItem[]> = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/fleet-monitoring', label: 'Fleet Monitoring — Gojek', icon: Table2 },
    { to: '/admin/fleet-monitoring-grab', label: 'Fleet Monitoring — Grab', icon: Car },
    { to: '/admin/user-management', label: 'Manajemen Akun', icon: Users, requireRole: 'super_admin' },
  ],
  partner: [
    { to: '/partner/fleet-monitoring', label: 'Fleet Monitoring — Gojek', icon: Table2 },
    { to: '/partner/fleet-monitoring-grab', label: 'Fleet Monitoring — Grab', icon: Car },
    { to: '/partner/debt-summary', label: 'Debt Summary', icon: Wallet },
    { to: '/partner/rental-monitoring', label: 'Rental Monitoring', icon: CalendarDays },
    { to: '/partner/daftarkan-plat', label: 'Daftarkan Plat', icon: ClipboardList },
    { to: '/partner/checkpoint', label: 'Checkpoint', icon: ClipboardCheck },
  ],
};

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
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {audience}
        </span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Navigasi utama">
        {NAV[audience]
          .filter((item) => !item.requireRole || (user?.roles ?? []).includes(item.requireRole))
          .map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.to === '/admin' }}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&.active]:bg-sidebar-accent [&.active]:font-medium"
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 px-1 text-xs text-muted-foreground">
          <div className="truncate font-medium text-foreground">{user?.fullName}</div>
          <div className="truncate">{user?.email}</div>
          {user?.partner && <div className="truncate">Partner: {user.partner.name}</div>}
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={onLogout} disabled={logoutPending}>
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
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
