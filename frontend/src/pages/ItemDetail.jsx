import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Calendar, Star, ArrowLeft, Share2, Flag, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import MapView from '../components/Map/MapView';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getCategoryIcon, getCategoryLabel, formatDate, getImageUrl, BADGE_CONFIG } from '../utils/constants';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function ItemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    api.get(`/items/${id}`)
      .then(({ data }) => setItem(data.item))
      .catch(() => toast.error('Signalement introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié !');
    } catch (_) {
      toast.error('Impossible de copier le lien');
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="glass-card h-96 animate-pulse" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-20 text-slate-500">
        <div className="text-5xl mb-4">🔍</div>
        <p>Signalement introuvable</p>
        <Link to="/items" className="btn-primary mt-4 inline-flex">Retour aux objets</Link>
      </div>
    );
  }

  const isOwner = user && item.userId?._id === user._id;
  const badgeCfg = BADGE_CONFIG[item.userId?.badge ?? 'basic'];
  const coords = item.location?.coordinates;
  const mapCenter = coords ? [coords[1], coords[0]] : undefined;

  return (
    <div className="flex-1 pb-20 md:pb-0 max-w-5xl mx-auto w-full px-4 py-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn-ghost text-sm mb-6">
        <ArrowLeft size={16} /> Retour
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Photos + Map */}
        <div className="lg:col-span-3 space-y-4">
          {/* Photo carousel */}
          {item.photos?.length > 0 ? (
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video">
              <motion.img
                key={photoIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={getImageUrl(item.photos[photoIdx])}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              {item.photos.length > 1 && (
                <>
                  <button onClick={() => setPhotoIdx((i) => (i - 1 + item.photos.length) % item.photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setPhotoIdx((i) => (i + 1) % item.photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {item.photos.map((_, i) => (
                      <button key={i} onClick={() => setPhotoIdx(i)}
                        className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? 'bg-white' : 'bg-white/40'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 aspect-video flex items-center justify-center text-7xl">
              {getCategoryIcon(item.category)}
            </div>
          )}

          {/* Map */}
          {mapCenter && (
            <div>
              <h2 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2">
                <MapPin size={14} /> Localisation approximative
              </h2>
              <MapView
                items={[item]}
                center={mapCenter}
                zoom={14}
                height="220px"
                interactive={false}
              />
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Type + Category */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={item.type === 'lost' ? 'badge-lost' : 'badge-found'}>
              {item.type === 'lost' ? '🔴 Perdu' : '🟢 Trouvé'}
            </span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-lg font-medium">
              {getCategoryIcon(item.category)} {getCategoryLabel(item.category)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-100">{item.title}</h1>

          {/* Meta */}
          <div className="space-y-2 text-sm text-slate-400">
            <div className="flex items-center gap-2"><MapPin size={14} /><span>{item.city ?? 'Lieu non précisé'}</span></div>
            <div className="flex items-center gap-2"><Calendar size={14} /><span>{formatDate(item.date)}</span></div>
            {item.reward > 0 && (
              <div className="flex items-center gap-2 text-yellow-400 font-semibold">
                <Star size={14} fill="currentColor" /><span>Récompense : {item.reward} FCFA</span>
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div className="glass p-4">
              <h2 className="text-sm font-semibold text-slate-300 mb-2">Description</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Keywords */}
          {item.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.keywords.map((kw) => (
                <span key={kw} className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-lg">#{kw}</span>
              ))}
            </div>
          )}

          {/* Author card */}
          {item.userId && (
            <div className="glass-card p-4">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Signalé par</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {item.userId.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-sm">{item.userId.name}</span>
                    {item.userId.isIdentityVerified && <CheckCircle size={14} className="text-blue-400" />}
                  </div>
                  <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${badgeCfg.color} ${badgeCfg.bg} ${badgeCfg.border}`}>
                    {badgeCfg.icon} {badgeCfg.label}
                  </div>
                </div>
                {item.userId.reliabilityScore !== undefined && (
                  <div className="ml-auto text-center">
                    <div className="text-lg font-bold text-emerald-400">{item.userId.reliabilityScore}%</div>
                    <div className="text-[10px] text-slate-500">Fiabilité</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {!isOwner && user && (
              <Link to="/matches" className="btn-primary justify-center">
                Voir mes correspondances
              </Link>
            )}
            {isOwner && (
              <Link to={`/items/${item._id}/edit`} className="btn-secondary justify-center">
                Modifier mon signalement
              </Link>
            )}
            <div className="flex gap-3">
              <button onClick={handleShare} className="btn-ghost flex-1 justify-center text-sm">
                <Share2 size={15} /> Partager
              </button>
              {!isOwner && user && (
                <button className="btn-ghost flex-1 justify-center text-sm text-orange-400 hover:text-orange-300">
                  <Flag size={15} /> Signaler
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
