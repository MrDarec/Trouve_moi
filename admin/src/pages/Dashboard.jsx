import React, { useState, useEffect } from 'react';
import { Package, Users, Handshake, CheckCircle, TrendingUp, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';

const StatCard = ({ icon: Icon, label, value, color, trend }) => (
  <div className="stat-card flex items-start gap-4">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-gray-500 text-sm font-medium">{label}</p>
      <p className="text-3xl font-extrabold text-gray-900 mt-0.5">{value?.toLocaleString() || 0}</p>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1 text-green-600 text-xs font-medium">
          <ArrowUpRight className="w-3.5 h-3.5" /> +{trend} ce mois
        </div>
      )}
    </div>
  </div>
);

const COLORS = ['#FF6B35', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { overview = {}, dailyStats = [], categoriesStats = [] } = stats || {};

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de la plateforme Trouve Moi</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Signalements total" value={overview.totalItems} color="bg-primary" />
        <StatCard icon={Users} label="Utilisateurs" value={overview.totalUsers} color="bg-blue-500" />
        <StatCard icon={Handshake} label="Matches" value={overview.totalMatches} color="bg-purple-500" />
        <StatCard icon={CheckCircle} label="Restitutions" value={overview.totalRestitutions} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Activity chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-bold text-gray-900 mb-1">Activité (30 derniers jours)</h2>
          <p className="text-gray-400 text-xs mb-4">Signalements perdus vs trouvés</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(v, n) => [v, n === 'lost' ? 'Perdus' : 'Trouvés']}
              />
              <Line type="monotone" dataKey="lost" stroke="#EF4444" strokeWidth={2.5} dot={false} name="lost" />
              <Line type="monotone" dataKey="found" stroke="#10B981" strokeWidth={2.5} dot={false} name="found" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Categories pie */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-1">Par catégorie</h2>
          <p className="text-gray-400 text-xs mb-4">Top catégories signalées</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categoriesStats.slice(0, 6)} dataKey="count" nameKey="category"
                cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                {categoriesStats.slice(0, 6).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend iconType="circle" iconSize={8} formatter={v => v.replace(/^[^ ]+ /, '')} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Actifs', value: overview.activeItems, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Restitués', value: overview.restitutedItems, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'En attente modération', value: overview.pendingItems, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Signalements abusifs', value: overview.pendingReports, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`card p-4 ${s.bg} border-0`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value || 0}</p>
          </div>
        ))}
      </div>

      {/* Daily bar chart */}
      {dailyStats.length > 0 && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-4">Matches par jour</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="matches" fill="#FF6B35" radius={[4, 4, 0, 0]} name="Matches" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
