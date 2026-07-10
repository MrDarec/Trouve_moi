import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { fetchReports(); }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/reports?status=${filter}&limit=50`);
      setReports(data.reports || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resolve = async (id, action) => {
    try {
      await api.patch(`/admin/reports/${id}/resolve`, { action });
      toast.success('Signalement traité');
      fetchReports();
    } catch {
      toast.error('Erreur');
    }
  };

  const typeLabels = {
    user: '👤 Utilisateur',
    item: '📦 Objet',
    message: '💬 Message',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Signalements abusifs</h1>
        <p className="text-gray-500 text-sm mt-1">Modération des comportements inappropriés</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[{ v: 'pending', l: '⏳ En attente' }, { v: 'resolved', l: '✅ Résolus' }, { v: 'dismissed', l: '❌ Rejetés' }].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.v ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400">Chargement...</div>
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Aucun signalement {filter === 'pending' ? 'en attente' : filter === 'resolved' ? 'résolu' : 'rejeté'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report._id} className="card p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="badge badge-blue">{typeLabels[report.targetType] || report.targetType}</span>
                  <span className="badge badge-amber">{report.reason}</span>
                  <span className={`badge ${report.status === 'pending' ? 'badge-amber' : report.status === 'resolved' ? 'badge-green' : 'badge-gray'}`}>
                    {report.status}
                  </span>
                </div>

                <p className="text-gray-700 text-sm">
                  Signalé par <strong>{report.reporterId?.name || 'Anonyme'}</strong>
                  {' '} — {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                </p>

                {report.description && (
                  <p className="text-gray-500 text-xs mt-1 italic">"{report.description}"</p>
                )}
              </div>

              {report.status === 'pending' && (
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => resolve(report._id, 'resolve')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white text-xs font-semibold rounded-xl hover:bg-green-600 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Traiter
                  </button>
                  <button onClick={() => resolve(report._id, 'dismiss')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                    <XCircle className="w-3.5 h-3.5" /> Ignorer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reports;
