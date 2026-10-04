import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';
import {
  LayoutDashboard,
  Wrench,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  Plus,
  Users,
  Menu,
  X,
  Package,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true, testid: 'nav-dashboard' },
  { to: '/tickets', label: 'Registro Tickets', icon: Wrench, testid: 'nav-tickets' },
  { to: '/customers', label: 'Schede Clienti', icon: Users, testid: 'nav-customers' },
  { to: '/warehouse', label: 'Magazzino', icon: Package, testid: 'nav-warehouse' },
  { to: '/pos', label: 'Cassa POS', icon: ShoppingBag, testid: 'nav-pos' },
  { to: '/reports', label: 'Report & Contabilità', icon: BarChart3, testid: 'nav-reports' },
  { to: '/settings', label: 'Impostazioni', icon: Settings, adminOnly: true, testid: 'nav-settings' },
];

function SidebarContent({ onNavigate, isAdmin, user, logout, settings, nav, setCpOpen }) {
  return (
    <>
      <div className="px-5 py-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Zap className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">
              {settings.platform_name || 'Pixel Lab'}
            </div>
            <div className="font-extrabold text-lg leading-tight">EDS PIXEL</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500 line-clamp-2">{settings.business_name}</div>
      </div>

      <button
        data-testid="btn-new-ticket-sidebar"
        onClick={() => {
          nav('/tickets/new');
          onNavigate?.();
        }}
        className="mx-4 mt-4 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2.5 transition-all hover:-translate-y-0.5 shadow-lg shadow-cyan-500/30"
      >
        <Plus className="w-4 h-4" strokeWidth={3} />
        Nuova Pratica
      </button>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              data-testid={item.testid}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-inner shadow-cyan-500/10'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{user.name}</div>
            <div className="font-mono-eds text-[10px] uppercase tracking-widest text-cyan-400">
              {user.role === 'admin' ? 'Amministratore' : 'Tecnico'}
            </div>
          </div>
        </div>
        <button
          data-testid="btn-logout"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/50 rounded-lg py-2 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" /> Esci
        </button>
      </div>
    </>
  );
}

export default function Layout() {
  const { user, logout, isAdmin, setUser } = useAuth();
  const { settings } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cpOpen, setCpOpen] = useState(false);
  const forced = !!user?.must_change_password;

  const currentNav = navItems.find((i) => (i.exact ? loc.pathname === i.to : loc.pathname.startsWith(i.to) && i.to !== '/')) ||
    (loc.pathname === '/' ? navItems[0] : null);

  return (
    <div className="min-h-screen bg-[#0b132b] text-slate-100 eds-noise">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-[#0a0f24]/95 backdrop-blur-xl px-4 py-3 no-print">
        <button
          onClick={() => setMobileOpen(true)}
          data-testid="btn-mobile-menu"
          className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center"
        >
          <Menu className="w-5 h-5 text-cyan-300" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-slate-900" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-sm leading-tight truncate">EDS PIXEL</div>
            <div className="font-mono-eds text-[9px] uppercase tracking-widest text-cyan-400 truncate">
              {currentNav?.label || settings.platform_name || 'Pixel Lab'}
            </div>
          </div>
        </div>
        <button
          onClick={() => nav('/tickets/new')}
          data-testid="btn-new-ticket-mobile"
          className="rounded-lg bg-cyan-500 text-slate-950 font-semibold px-3 py-2 text-xs flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Nuova
        </button>
      </div>

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-800/80 bg-[#0a0f24] flex-col no-print">
          <SidebarContent
            isAdmin={isAdmin}
            user={user}
            logout={logout}
            settings={settings}
            nav={nav}
            setCpOpen={setCpOpen}
          />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 no-print" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <aside
              onClick={(e) => e.stopPropagation()}
              className="relative w-72 max-w-[85vw] h-full bg-[#0a0f24] border-r border-slate-800 flex flex-col animate-in slide-in-from-left"
            >
              <button
                onClick={() => setMobileOpen(false)}
                data-testid="btn-mobile-close"
                className="absolute top-3 right-3 w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent
                isAdmin={isAdmin}
                user={user}
                logout={logout}
                settings={settings}
                nav={nav}
                setCpOpen={setCpOpen}
                onNavigate={() => setMobileOpen(false)}
              />
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <ChangePasswordDialog
        open={forced || cpOpen}
        forced={forced}
        onClose={() => {
          setCpOpen(false);
          // after voluntary / forced change, mark locally
          if (user) setUser({ ...user, must_change_password: false });
        }}
      />
    </div>
  );
}
