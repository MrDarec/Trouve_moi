import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Flag, LogOut, Menu, X, ChevronRight, Search } from 'lucide-react';

const NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/users', icon: Users, label: 'Utilisateurs' },
  { path: '/items', icon: Package, label: 'Signalements' },
  { path: '/reports', icon: Flag, label: 'Signalements abusifs' },
];

export const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  const Sidebar = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-sky-400 shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-none">Trouve Moi</h1>
            <p className="text-slate-400 text-xs mt-1">Administration</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <Link key={path} to={path} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${active ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6">
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-medium">
          <LogOut className="w-5 h-5" /> Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar fixed top-0 left-0 h-full z-30 border-r border-slate-800">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar flex flex-col border-r border-slate-800">
            <div className="absolute top-4 right-4">
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar mobile />
          </aside>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 md:ml-64">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between bg-sidebar px-4 py-3.5 sticky top-0 z-20 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-sky-400" />
              <span className="text-white font-bold text-sm">Trouve Moi Admin</span>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
