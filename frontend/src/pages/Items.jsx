import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X, MapPin } from 'lucide-react';
import ItemCard from '../components/Items/ItemCard';
import api from '../services/api';
import { CATEGORIES } from '../utils/constants';
import { motion, AnimatePresence } from 'framer-motion';

export default function Items() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ search: '', type: '', category: '', city: '' });
  const [applied, setApplied] = useState({});

  const limit = 12;

  const fetchItems = useCallback(async (f = applied, p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) };
      const { data } = await api.get('/items', { params });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (_) {}
    finally { setLoading(false); }
  }, [applied, page]);

  useEffect(() => { fetchItems(); }, [page]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied({ ...filters });
    fetchItems(filters, 1);
  };

  const clearFilters = () => {
    const empty = { search: '', type: '', category: '', city: '' };
    setFilters(empty);
    setApplied({});
    setPage(1);
    fetchItems(empty, 1);
  };

  const hasFilters = Object.values(applied).some((v) => v);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex-1 pb-20 md:pb-0 max-w-7xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Objets signalés</h1>
          <p className="text-slate-500 text-sm mt-1">{total} signalement{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}</p>
        </div>
        <button
          id="toggle-filters"
          onClick={() => setShowFilters((v) => !v)}
          className={`btn-secondary text-sm py-2 ${hasFilters ? 'border-primary-500/50 text-primary-400' : ''}`}
        >
          <SlidersHorizontal size={16} />
          Filtres
          {hasFilters && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
        </button>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-5 mb-6"
          >
            <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="filter-search" type="text" className="input-field pl-9 py-2.5 text-sm"
                  placeholder="Mots-clés…" value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>

              {/* Type */}
              <select id="filter-type" className="input-field py-2.5 text-sm"
                value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                <option value="">Tous les types</option>
                <option value="lost">🔴 Perdu</option>
                <option value="found">🟢 Trouvé</option>
              </select>

              {/* Category */}
              <select id="filter-category" className="input-field py-2.5 text-sm"
                value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">Toutes les catégories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>

              {/* City */}
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="filter-city" type="text" className="input-field pl-9 py-2.5 text-sm"
                  placeholder="Ville…" value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
              </div>

              <div className="sm:col-span-2 md:col-span-4 flex gap-3 justify-end">
                {hasFilters && (
                  <button type="button" onClick={clearFilters} className="btn-ghost text-sm flex items-center gap-1">
                    <X size={14} /> Effacer
                  </button>
                )}
                <button type="submit" className="btn-primary text-sm py-2">Appliquer</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card h-56 animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item, i) => <ItemCard key={item._id} item={item} index={i} />)}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500">
          <div className="text-5xl mb-4">🔍</div>
          <p className="font-medium">Aucun résultat trouvé</p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-3 text-sm text-primary-400 hover:text-primary-300 transition-colors">
              Effacer les filtres
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="btn-secondary py-2 px-4 disabled:opacity-50">
            ← Précédent
          </button>
          <span className="flex items-center px-4 text-sm text-slate-400">
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="btn-secondary py-2 px-4 disabled:opacity-50">
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
