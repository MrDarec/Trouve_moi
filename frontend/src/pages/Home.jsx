import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import MapView from '../components/Map/MapView';
import ItemCard from '../components/Items/ItemCard';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES } from '../utils/constants';

export default function Home() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [mapItems, setMapItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchItems();
    fetchMapItems();
  }, []);

  const fetchItems = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/items', { params: { ...params, limit: 12 } });
      setItems(data.items ?? []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  const fetchMapItems = async () => {
    try {
      const { data } = await api.get('/items/map');
      setMapItems(data.features?.map((f) => ({
        ...f.properties,
        location: { coordinates: f.geometry.coordinates },
      })) ?? []);
    } catch (_) {}
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchItems();
  };

  return (
    <div className="flex-1 pb-20 md:pb-0">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-950/30 to-slate-950 border-b border-slate-800 px-4 py-16 md:py-24">
        {/* Background blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-semibold px-4 py-2 rounded-full mb-6">
              🔍 Plateforme de signalement en temps réel
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-100 leading-tight mb-4">
              Vous avez <span className="gradient-text">perdu</span> quelque chose ?<br />
              Nous allons vous aider.
            </h1>
            <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
              Signalez un objet perdu ou trouvé. Notre algorithme de matching le retrouve automatiquement.
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            onSubmit={handleSearch}
            className="flex gap-2 max-w-xl mx-auto"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="home-search"
                type="text"
                className="input-field pl-12 h-12 text-base"
                placeholder="Chercher clés, téléphone, portefeuille…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary h-12 px-6">Chercher</button>
          </motion.form>

          {/* Type filter pills */}
          <div className="flex justify-center gap-3 mt-4">
            {[
              { value: '', label: 'Tous' },
              { value: 'lost', label: '🔴 Perdus' },
              { value: 'found', label: '🟢 Trouvés' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setTypeFilter(value); setLoading(true); fetchItems(); }}
                className={`text-sm px-4 py-1.5 rounded-full font-medium transition-all ${
                  typeFilter === value
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { label: 'Objets signalés', value: '2 400+', icon: '📦' },
            { label: 'Retrouvés', value: '850+', icon: '✅' },
            { label: 'Utilisateurs actifs', value: '1 200+', icon: '👥' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="glass-card text-center p-5">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-2xl font-bold gradient-text">{value}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>

        {/* Map section */}
        <section>
          <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-primary-400" />
            Carte des signalements
          </h2>
          <MapView items={mapItems} height="380px" />
        </section>

        {/* Latest items */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-100">Derniers signalements</h2>
            <Link to="/items" className="text-sm text-primary-400 hover:text-primary-300 font-semibold transition-colors">
              Voir tout →
            </Link>
          </div>

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
            <div className="text-center py-16 text-slate-500">
              <div className="text-5xl mb-4">📭</div>
              <p>Aucun signalement pour le moment</p>
            </div>
          )}
        </section>

        {/* CTA */}
        {!user && (
          <section className="glass-card p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Prêt à retrouver votre objet ?</h2>
            <p className="text-slate-400 mb-6">Créez un compte gratuit et signalez votre objet en moins de 2 minutes.</p>
            <div className="flex justify-center gap-3">
              <Link to="/register" className="btn-primary">
                <Plus size={18} /> Créer un compte
              </Link>
              <Link to="/items" className="btn-secondary">
                <Search size={18} /> Parcourir les objets
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
