import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Search, Bell, Plus, Map, Home, BookOpen, MessageSquare,
  User, LogOut, ChevronDown, Menu, X, Wifi, WifiOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const navItems = [
  { to: '/', label: 'Accueil', Icon: Home },
  { to: '/items', label: 'Objets', Icon: Search },
  { to: '/matches', label: 'Matches', Icon: Map, authRequired: true },
  { to: '/chat', label: 'Chat', Icon: MessageSquare, authRequired: true },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      api.get('/notifications?unread=true').then(({ data }) => {
        setUnreadCount(data.unreadCount ?? 0);
      }).catch(() => {});
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <>
      <nav className="glass-navbar sticky top-0 z-50 px-4">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🔍</span>
            <span className="font-bold text-lg gradient-text hidden sm:block">Trouve Moi</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems
              .filter((n) => !n.authRequired || user)
              .map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(to)
                      ? 'bg-primary-600/20 text-primary-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Online indicator */}
            {user && (
              <span title={connected ? 'Connecté' : 'Hors ligne'}>
                {connected ? (
                  <Wifi size={14} className="text-emerald-500" />
                ) : (
                  <WifiOff size={14} className="text-slate-600" />
                )}
              </span>
            )}

            {user ? (
              <>
                {/* Notifications */}
                <Link to="/notifications" className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all duration-200">
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Report */}
                <Link to="/report" className="btn-primary hidden sm:inline-flex text-sm py-2 px-3">
                  <Plus size={16} />
                  Signaler
                </Link>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-800 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white">
                      {user.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-slate-300 max-w-[100px] truncate">{user.name}</span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 glass-card py-2 z-50"
                      >
                        <div className="px-4 py-2 border-b border-slate-800 mb-1">
                          <p className="text-sm font-semibold text-slate-200 truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                        <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                          <User size={16} /> Mon profil
                        </Link>
                        <Link to="/report" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                          <Plus size={16} /> Signaler un objet
                        </Link>
                        <hr className="border-slate-800 my-1" />
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                          <LogOut size={16} /> Se déconnecter
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm">Se connecter</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">S&apos;inscrire</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileMenuOpen((v) => !v)} className="md:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all duration-200">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-800 py-2"
            >
              {navItems
                .filter((n) => !n.authRequired || user)
                .map(({ to, label, Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive(to) ? 'text-primary-400' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                ))}
              {user && (
                <Link to="/report" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary-400">
                  <Plus size={18} /> Signaler un objet
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Bottom Nav (mobile-only) */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-navbar border-t border-slate-800 px-2 pb-safe">
          <div className="flex items-center justify-around py-2">
            {[
              { to: '/', Icon: Home, label: 'Accueil' },
              { to: '/items', Icon: BookOpen, label: 'Objets' },
              { to: '/report', Icon: Plus, label: 'Signaler', highlight: true },
              { to: '/matches', Icon: Map, label: 'Matches' },
              { to: '/profile', Icon: User, label: 'Profil' },
            ].map(({ to, Icon, label, highlight }) => (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                  highlight
                    ? 'bg-primary-600 text-white -mt-4 px-4 py-3 shadow-lg shadow-primary-900/50 rounded-2xl'
                    : isActive(to)
                    ? 'text-primary-400'
                    : 'text-slate-500'
                }`}
              >
                <Icon size={highlight ? 22 : 20} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
