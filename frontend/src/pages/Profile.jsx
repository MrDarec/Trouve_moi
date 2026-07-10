import { useState, useEffect } from 'react';
import { Edit2, Camera, CheckCircle, Star, Package, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ItemCard from '../components/Items/ItemCard';
import { BADGE_CONFIG, formatDate } from '../utils/constants';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [myItems, setMyItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/users/history').then(({ data }) => setMyItems(data.items ?? [])).finally(() => setLoadingItems(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/users/profile', form);
      updateUser(data.user);
      toast.success('Profil mis à jour !');
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { data } = await api.put('/users/profile', fd);
      updateUser(data.user);
      toast.success('Photo de profil mise à jour !');
    } catch (_) {
      toast.error('Erreur lors du changement de photo');
    }
  };

  if (!user) return null;

  const badgeCfg = BADGE_CONFIG[user.badge ?? 'basic'];
  const score = user.reliabilityScore ?? 0;

  return (
    <div className="flex-1 pb-20 md:pb-0 max-w-5xl mx-auto w-full px-4 py-8 space-y-8">
      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <label className="cursor-pointer">
              {user.avatar ? (
                <img src={`/${user.avatar}`} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-slate-700" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-3xl font-bold text-white border-4 border-slate-700">
                  {user.name?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors">
                <Camera size={14} className="text-slate-300" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-100">{user.name}</h1>
              {user.isIdentityVerified && <CheckCircle size={18} className="text-blue-400 mx-auto sm:mx-0" />}
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${badgeCfg.color} ${badgeCfg.bg} ${badgeCfg.border}`}>
                {badgeCfg.icon} {badgeCfg.label}
              </span>
            </div>
            <p className="text-slate-500 text-sm">{user.email}</p>
            <p className="text-slate-600 text-xs mt-1">Membre depuis {formatDate(user.createdAt)}</p>

            {/* Reliability score bar */}
            <div className="mt-4 max-w-xs">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Score de fiabilité</span>
                <span className="font-bold text-emerald-400">{score}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                />
              </div>
            </div>
          </div>

          {/* Edit button */}
          <button onClick={() => setEditing((v) => !v)} className="btn-secondary text-sm py-2 shrink-0">
            <Edit2 size={14} /> {editing ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        {/* Edit form */}
        {editing && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleSave}
            className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="input-label">Nom complet</label>
              <input type="text" className="input-field" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Téléphone</label>
              <input type="tel" className="input-field" placeholder="+221 77 000 00 00"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</> : 'Enregistrer'}
              </button>
            </div>
          </motion.form>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Signalements', value: myItems.length, Icon: Package },
          { label: 'Matches', value: user.matchesCount ?? 0, Icon: Star },
          { label: 'Récupérations', value: user.recoveries ?? 0, Icon: CheckCircle },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="glass-card p-4 text-center">
            <Icon size={20} className="text-primary-400 mx-auto mb-2" />
            <div className="text-xl font-bold text-slate-100">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* My items */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          <Package size={18} className="text-primary-400" /> Mes signalements
        </h2>
        {loadingItems ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card h-40 animate-pulse" />)}
          </div>
        ) : myItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myItems.map((item, i) => <ItemCard key={item._id} item={item} index={i} />)}
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p>Vous n'avez pas encore de signalement</p>
          </div>
        )}
      </div>
    </div>
  );
}
