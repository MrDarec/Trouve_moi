import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Target, Package, Clock, MessageSquare } from 'lucide-react';
import api from '../services/api';
import { formatRelative } from '../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const NOTIF_CONFIG = {
  new_match: { Icon: Target, color: 'text-primary-300', bg: 'bg-primary-500/10 border-primary-500/20' },
  item_archived: { Icon: Package, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  reminder: { Icon: Clock, color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/20' },
  message: { Icon: MessageSquare, color: 'text-sky-300', bg: 'bg-sky-500/10 border-sky-500/20' },
  default: { Icon: Bell, color: 'text-primary-300', bg: 'bg-primary-500/10 border-primary-500/20' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => setNotifications(data.notifications ?? [])).finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (_) {}
  };

  const deleteNotif = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (_) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
    } catch (_) {}
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex-1 pb-20 md:pb-0 max-w-2xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Bell size={22} className="text-primary-400" /> Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-slate-500 text-sm mt-1">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-ghost text-sm">
            <Check size={15} /> Tout marquer lu
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="glass-card h-16 animate-pulse" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Bell size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {notifications.map((notif, i) => {
              const cfg = NOTIF_CONFIG[notif.type] ?? NOTIF_CONFIG.default;
              const Icon = cfg.Icon;
              return (
                <motion.div
                  key={notif._id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16, height: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => !notif.isRead && markRead(notif._id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${
                    notif.isRead
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-70'
                      : 'bg-slate-900/80 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    notif.isRead ? 'bg-slate-800/80 border-slate-700/60 text-slate-500' : `${cfg.bg} ${cfg.color}`
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${notif.isRead ? 'text-slate-400' : 'text-slate-200'}`}>{notif.title}</p>
                      {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                    </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-xs text-slate-600 mt-1">{formatRelative(notif.createdAt)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNotif(notif._id); }}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
