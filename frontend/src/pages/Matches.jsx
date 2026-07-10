import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, CheckCircle, Clock, MessageSquare, Loader2 } from 'lucide-react';
import api from '../services/api';
import { getCategoryIcon, getCategoryLabel, formatDate } from '../utils/constants';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const STATUS_LABEL = {
  pending: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', Icon: Clock },
  accepted: { label: 'Accepté', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', Icon: CheckCircle },
  rejected: { label: 'Refusé', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', Icon: X },
  confirmed: { label: 'Confirmé ✅', color: 'text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-500/20', Icon: Check },
};

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    api.get('/matches').then(({ data }) => setMatches(data.matches ?? [])).catch(() => toast.error('Erreur lors du chargement')).finally(() => setLoading(false));
  }, []);

  const action = async (matchId, type) => {
    setActioning(matchId + type);
    try {
      await api.put(`/matches/${matchId}/${type}`);
      setMatches((prev) => prev.map((m) => m._id === matchId ? { ...m, status: type === 'accept' ? 'accepted' : 'rejected' } : m));
      toast.success(type === 'accept' ? 'Match accepté ! Vous pouvez maintenant discuter.' : 'Match refusé.');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur');
    } finally {
      setActioning(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card h-36 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="flex-1 pb-20 md:pb-0 max-w-4xl mx-auto w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Mes correspondances</h1>
        <p className="text-slate-500 text-sm mt-1">{matches.length} match{matches.length !== 1 ? 's' : ''} trouvé{matches.length !== 1 ? 's' : ''}</p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <div className="text-6xl mb-4">🎯</div>
          <p className="font-semibold text-slate-300 mb-2">Pas encore de correspondance</p>
          <p className="text-sm">Signalez un objet pour que notre algorithme cherche des correspondances !</p>
          <Link to="/report" className="btn-primary inline-flex mt-4">Signaler un objet</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match, i) => {
            const statusCfg = STATUS_LABEL[match.status] ?? STATUS_LABEL.pending;
            const StatusIcon = statusCfg.Icon;
            const lostItem = match.itemLost;
            const foundItem = match.itemFound;

            return (
              <motion.div
                key={match._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Items */}
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    {[{ item: lostItem, label: '🔴 Perdu' }, { item: foundItem, label: '🟢 Trouvé' }].map(({ item, label }) => (
                      <Link key={item?._id} to={`/items/${item?._id}`} className="bg-slate-800/60 rounded-xl p-3 hover:bg-slate-800 transition-colors block">
                        <div className="text-2xl mb-1">{getCategoryIcon(item?.category)}</div>
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        <div className="text-sm font-semibold text-slate-200 line-clamp-2">{item?.title}</div>
                        <div className="text-xs text-slate-500 mt-1">{item?.city ?? ''}</div>
                      </Link>
                    ))}
                  </div>

                  {/* Score + Status */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-3 shrink-0">
                    {/* Score ring */}
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="rgb(30 41 59)" strokeWidth="6" />
                        <circle cx="32" cy="32" r="26" fill="none"
                          stroke={match.score >= 70 ? '#10b981' : match.score >= 50 ? '#f59e0b' : '#8b5cf6'}
                          strokeWidth="6"
                          strokeDasharray={`${(match.score / 100) * 163.4} 163.4`}
                          strokeLinecap="round" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-100">{match.score}%</span>
                    </div>

                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.color} ${statusCfg.bg} ${statusCfg.border}`}>
                      <StatusIcon size={11} /> {statusCfg.label}
                    </span>

                    {/* Actions */}
                    {match.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => action(match._id, 'accept')}
                          disabled={!!actioning}
                          className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center justify-center transition-colors"
                        >
                          {actioning === match._id + 'accept' ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
                        </button>
                        <button
                          onClick={() => action(match._id, 'reject')}
                          disabled={!!actioning}
                          className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center transition-colors"
                        >
                          {actioning === match._id + 'reject' ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
                        </button>
                      </div>
                    )}

                    {/* Chat button when accepted by both */}
                    {match.status === 'accepted' && (
                      <Link to={`/chat/${match._id}`} className="btn-primary text-sm py-2 px-3">
                        <MessageSquare size={14} /> Chat
                      </Link>
                    )}
                  </div>
                </div>

                {/* Score breakdown */}
                {match.scoreDetails && (
                  <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-4 gap-2">
                    {Object.entries(match.scoreDetails).map(([key, val]) => (
                      <div key={key} className="text-center">
                        <div className="text-xs text-slate-500 capitalize mb-1">{key}</div>
                        <div className="text-sm font-bold" style={{ color: val >= 70 ? '#10b981' : val >= 40 ? '#f59e0b' : '#94a3b8' }}>
                          {val}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
