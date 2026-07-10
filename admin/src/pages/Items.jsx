import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const getImageUrl = (path) => path ? `${import.meta.env.VITE_UPLOADS_URL || '/uploads'}/${path}` : null;

const AdminItems = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => { fetchItems(); }, [filter, page, search]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, moderation: filter });
      if (search) params.set('search', search);
      const { data } = await api.get(`/admin/items?${params}`);
      setItems(data.items || []);
      setPagination(data.pagination || { total: 0, pages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const moderate = async (id, action) => {
    try {
      await api.patch(`/admin/items/${id}/moderate`, { action });
      toast.success(action === 'approve' ? 'Signalement approuvé' : 'Signalement rejeté');
      fetchItems();
    } catch {
      toast.error('Erreur lors de la modération');
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('Supprimer définitivement ce signalement ?')) return;
    try {
      await api.delete(`/admin/items/${id}`);
      toast.success('Signalement supprimé');
      fetchItems();
    } catch {
      toast.error('Erreur');
    }
  };

  const statusConfig = {
    active: { label: 'Actif', cls: 'badge-green' },
    matched: { label: 'Matched', cls: 'badge-blue' },
    restituted: { label: 'Restitué', cls: 'badge-green' },
    archived: { label: 'Archivé', cls: 'badge-gray' },
    closed: { label: 'Fermé', cls: 'badge-gray' },
  };

  const moderationConfig = {
    pending: { label: 'En attente', cls: 'badge-amber' },
    approved: { label: 'Approuvé', cls: 'badge-green' },
    rejected: { label: 'Rejeté', cls: 'badge-red' },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Signalements</h1>
        <p className="text-gray-500 text-sm mt-1">{pagination.total} signalement(s)</p>
      </div>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ v: 'pending', l: '⏳ En attente' }, { v: 'approved', l: '✅ Approuvés' }, { v: 'rejected', l: '❌ Rejetés' }, { v: 'all', l: 'Tous' }].map(f => (
            <button key={f.v} onClick={() => { setFilter(f.v); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-semibold">Objet</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Utilisateur</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Statut</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Modération</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Date</th>
                <th className="text-right px-6 py-3 text-gray-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Chargement...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Aucun signalement</td></tr>
              ) : items.map(item => {
                const status = statusConfig[item.status] || { label: item.status, cls: 'badge-gray' };
                const moderation = moderationConfig[item.moderationStatus] || moderationConfig.pending;
                return (
                  <tr key={item._id} className="table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          {item.photos?.[0] ? (
                            <img src={getImageUrl(item.photos[0])} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              {item.type === 'lost' ? '🔍' : '📦'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 max-w-[180px] truncate">{item.title}</p>
                          <p className="text-gray-400 text-xs">{item.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={item.type === 'lost' ? 'badge badge-red' : 'badge badge-green'}>
                        {item.type === 'lost' ? '❌ Perdu' : '✅ Trouvé'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-700 text-xs">{item.userId?.name || 'N/A'}</td>
                    <td className="px-4 py-4">
                      <span className={`badge ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`badge ${moderation.cls}`}>{moderation.label}</span>
                    </td>
                    <td className="px-4 py-4 text-gray-500 text-xs">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <a href={`${import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173'}/items/${item._id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Voir">
                          <Eye className="w-4 h-4" />
                        </a>
                        {item.moderationStatus === 'pending' && (
                          <>
                            <button onClick={() => moderate(item._id, 'approve')}
                              className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Approuver">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => moderate(item._id, 'reject')}
                              className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Rejeter">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => deleteItem(item._id)}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} sur {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminItems;
