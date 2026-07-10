import React, { useState, useEffect } from 'react';
import { Search, Shield, Ban, CheckCircle, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const getImageUrl = (path) => path ? `${import.meta.env.VITE_UPLOADS_URL || '/uploads'}/${path}` : null;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => { fetchUsers(); }, [page, filter, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set('search', search);
      if (filter === 'suspended') params.set('suspended', 'true');
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users || []);
      setPagination(data.pagination || { total: 0, pages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSuspend = async (userId, isSuspended) => {
    if (!confirm(`${isSuspended ? 'Réactiver' : 'Suspendre'} cet utilisateur ?`)) return;
    try {
      await api.patch(`/admin/users/${userId}/suspend`);
      toast.success(isSuspended ? 'Utilisateur réactivé' : 'Utilisateur suspendu');
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
    }
  };

  const verifyIdentity = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/verify`);
      toast.success('Identité vérifiée');
      fetchUsers();
    } catch {
      toast.error('Erreur');
    }
  };

  const badgeColors = {
    gold: 'badge-amber', silver: 'badge-gray', verified: 'badge-blue', basic: 'badge-gray',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Utilisateurs</h1>
        <p className="text-gray-500 text-sm mt-1">{pagination.total} utilisateurs inscrits</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom ou email..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2">
          {[{ v: 'all', l: 'Tous' }, { v: 'suspended', l: 'Suspendus' }].map(f => (
            <button key={f.v} onClick={() => { setFilter(f.v); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.v ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-semibold">Utilisateur</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Badge</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Score</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Restitutions</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Statut</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Inscrit</th>
                <th className="text-right px-6 py-3 text-gray-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Chargement...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Aucun utilisateur trouvé</td></tr>
              ) : users.map(user => (
                <tr key={user._id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {user.avatar ? (
                          <img src={getImageUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-400">
                            {user.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{user.name}</p>
                        <p className="text-gray-400 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`badge ${badgeColors[user.badge] || 'badge-gray'}`}>
                      {user.badge === 'gold' ? '🥇 Gold' : user.badge === 'silver' ? '🥈 Silver' : user.badge === 'verified' ? '✅ Vérifié' : '👤 Basique'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${user.reliabilityScore >= 70 ? 'bg-green-500' : user.reliabilityScore >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${user.reliabilityScore}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600">{user.reliabilityScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-700">{user.successfulRestitutions || 0}</td>
                  <td className="px-4 py-4">
                    <span className={`badge ${user.isSuspended ? 'badge-red' : user.isVerified ? 'badge-green' : 'badge-gray'}`}>
                      {user.isSuspended ? '🚫 Suspendu' : user.isVerified ? '✅ Vérifié' : '⏳ Non vérifié'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {!user.isIdentityVerified && (
                        <button onClick={() => verifyIdentity(user._id)} title="Vérifier l'identité"
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => toggleSuspend(user._id, user.isSuspended)}
                        title={user.isSuspended ? 'Réactiver' : 'Suspendre'}
                        className={`p-2 rounded-lg transition-colors ${user.isSuspended ? 'text-green-500 hover:bg-green-50' : 'text-red-400 hover:bg-red-50'}`}>
                        {user.isSuspended ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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

export default Users;
